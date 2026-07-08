import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Enforce read permission before showing history
    const permission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id } }
    });
    if (!permission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch the update logs sorted sequentially by version
    const updates = await db.documentUpdate.findMany({
      where: { documentId: docId },
      select: {
        id: true,
        version: true,
        message: true, // 💡 FIX: This line fetches the milestone name from the DB!
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