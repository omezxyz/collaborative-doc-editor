import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

// Helper to pull user identity out of the secure cookie stream
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

    // 2. Update the heartbeat timestamp for this user on this document
    await db.documentPermission.updateMany({
      where: { documentId: docId, userId: session.id as string },
      data: { lastActive: new Date() }
    });

    // 3. Fetch everyone who has updated their status within the last 15 seconds
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

    // 4. Transform into clean collaborator objects
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