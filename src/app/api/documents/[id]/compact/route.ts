import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import * as Y from 'yjs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. RBAC Guard: Ensure only owners can perform structural database pruning
    const permission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id } }
    });
    if (!permission || permission.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden: Only owners can compact logs' }, { status: 403 });
    }

// 2. Extract all sequential binary fragments
const updates = await db.documentUpdate.findMany({
  where: { documentId: docId },
  orderBy: { version: 'asc' }
});

if (updates.length <= 1) {
  return NextResponse.json({ success: true, message: 'Log layout already optimal.' });
}

// 3. Instantiate virtual memory core and safely merge byte sequences
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

// 4. Atomic Transaction
await db.$transaction(async (tx) => {
  await tx.documentUpdate.deleteMany({
    where: { id: { in: processedRowIds } }
  });

  await tx.documentUpdate.create({
    data: {
      documentId: docId,
      userId: session.id,
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