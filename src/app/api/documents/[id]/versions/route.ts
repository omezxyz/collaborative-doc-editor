import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

// Helper to pull user identity out of the HTTP-only cookie stream
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    
    // Authenticate using our new JWT cookie check
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Enforce read permission before showing history
    const permission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id as string } }
    });
    if (!permission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch the update logs sorted sequentially by version
    const updates = await db.documentUpdate.findMany({
      where: { documentId: docId },
      select: {
        id: true,
        version: true,
        message: true, // Milestone name
        createdAt: true,
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { version: 'desc' }, // Latest versions first for timeline
    });

    return NextResponse.json({ versions: updates });
  } catch (error) {
    console.error("Failed to retrieve version ledger:", error);
    return NextResponse.json({ error: 'Failed to retrieve version ledger' }, { status: 500 });
  }
}