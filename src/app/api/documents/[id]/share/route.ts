import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

// Clean helper to extract the new JWT user session from HTTP-only cookies
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

// 1. GET: Fetch the complete access control list for a document
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    
    // Use our new JWT cookie authentication hook
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure the requester has access to this document before leaking the user list
    const requesterPermission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id as string } }
    });
    if (!requesterPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const permissions = await db.documentPermission.findMany({
      where: { documentId: docId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { role: 'asc' }
    });

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("GET Share state error:", error);
    return NextResponse.json({ error: 'Failed to retrieve access registry' }, { status: 500 });
  }
}

// 2. POST: Upsert or remove a user's collaborative access role
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    
    // Use our new JWT cookie authentication hook
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Guard: Enforce that only the document OWNER can modify ACL graphs
    const requesterPermission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id as string } }
    });
    if (!requesterPermission || requesterPermission.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden: Only owners can manage share states' }, { status: 403 });
    }

    const { email, role, action } = await req.json();
    if (!email) return NextResponse.json({ error: 'Target email is required' }, { status: 400 });

    // Look up target user. If they don't exist yet, we auto-provision a profile stub
    const targetUser = await db.user.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {},
      create: { 
        email: email.toLowerCase().trim(), 
        name: email.split('@')[0] 
      }
    });

    if (action === 'REVOKE') {
      if (targetUser.id === session.id) {
        return NextResponse.json({ error: 'Cannot revoke your own owner status' }, { status: 400 });
      }
      await db.documentPermission.delete({
        where: { documentId_userId: { documentId: docId, userId: targetUser.id } }
      });
      return NextResponse.json({ success: true, message: 'Access revoked' });
    }

    // Enforce safety constraint: Prevent changing the primary owner through basic sharing
    if (role === 'OWNER' && targetUser.id !== session.id) {
      return NextResponse.json({ error: 'Multi-owner clustering is blocked' }, { status: 400 });
    }

    // Upsert the collaborative capability matrix entry
    await db.documentPermission.upsert({
      where: { documentId_userId: { documentId: docId, userId: targetUser.id } },
      update: { role },
      create: { documentId: docId, userId: targetUser.id, role }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ACL Modification engine error:", error);
    return NextResponse.json({ error: 'Failed updating permission record' }, { status: 500 });
  }
}