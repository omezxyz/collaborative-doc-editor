import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Update the heartbeat timestamp for this user on this document
    await db.documentPermission.updateMany({
      where: { documentId: docId, userId: session.id },
      data: { lastActive: new Date() }
    });

    // Fetch everyone who has updated their status within the last 15 seconds
    const dynamicCutoff = new Date(Date.now() - 15 * 1000);

    const activePresences = await db.documentPermission.findMany({
      where: {
        documentId: docId,
        lastActive: { gte: dynamicCutoff }
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    const collaborators = activePresences.map(p => ({
      userId: p.userId,
      name: p.user.name || p.user.email.split('@')[0],
      role: p.role,
      isCurrentUser: p.userId === session.id
    }));

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error("Presence system fault:", error);
    return NextResponse.json({ error: 'Heartbeat tracking failed' }, { status: 500 });
  }
}