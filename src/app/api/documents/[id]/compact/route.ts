import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import * as Y from 'yjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

// Helper to safely extract user identity out of the secure cookie stream
async function getSessionUser() {
  const token = (await cookies()).get("session_token")?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload; // Returns { id, email, name }
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    
    // 1. Authenticate user session using secure JWT validation
    const session = await getSessionUser();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. RBAC Guard: Ensure only owners can perform structural database pruning
    const permission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id as string } }
    });
    if (!permission || permission.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden: Only owners can compact logs' }, { status: 403 });
    }

    // 3. Extract all sequential binary fragments
    const updates = await db.documentUpdate.findMany({
      where: { documentId: docId },
      orderBy: { version: 'asc' }
    });

    if (updates.length <= 1) {
      return NextResponse.json({ success: true, message: 'Log layout already optimal.' });
    }

    // 4. Instantiate virtual memory core and safely merge byte sequences
    const virtualDoc = new Y.Doc();

    for (const update of updates) {
      if (!update.delta) continue;

      try {
        // CLONE BOUNDARY: Allocate a clean, unpooled array and copy bytes into it
        // This strips away Prisma's shared database response buffer pooling completely
        const cleanUint8Array = new Uint8Array(update.delta.length);
        cleanUint8Array.set(update.delta);

        if (cleanUint8Array.length === 0) continue;

        Y.applyUpdate(virtualDoc, cleanUint8Array);
      } catch (decodeError) {
        console.error(`🚨 Defensively skipped corrupted row reference [ID: ${update.id}]:`, decodeError);
      }
    }

    // Encodes the absolute consolidated state as a single standalone update payload
    const compressedMasterDelta = Y.encodeStateAsUpdate(virtualDoc);

    // CLONE BOUNDARY: Ensure Yjs's internal allocation pool doesn't bleed into Prisma
    const cleanMasterDelta = new Uint8Array(compressedMasterDelta.length);
    cleanMasterDelta.set(compressedMasterDelta);
    const binaryBuffer = Buffer.from(cleanMasterDelta.buffer);

    // Track the precise list of IDs processed to isolate our deletion scope
    const processedRowIds = updates.map(u => u.id);

    // 5. Atomic Transaction
    await db.$transaction(async (tx) => {
      await tx.documentUpdate.deleteMany({
        where: { id: { in: processedRowIds } }
      });

      await tx.documentUpdate.create({
        data: {
          documentId: docId,
          userId: session.id as string,
          delta: binaryBuffer, // Pristine, unpooled standalone buffer
          version: 1
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      previousRowCount: updates.length,
      compressedSize: binaryBuffer.byteLength 
    });
  } catch (error) {
    console.error("Compaction pipeline failure:", error);
    return NextResponse.json({ error: 'Internal compaction execution fault' }, { status: 500 });
  }
}