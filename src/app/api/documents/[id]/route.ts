import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    const session = await verifyAuth(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const document = await db.document.findUnique({
      where: { id: docId },
      select: { title: true } // 💡 Grab the title
    });

    // 1. Resolve this user's dynamic role boundary from the database
    const permission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id } }
    });

    // Fallback to VIEWER if no explicit record exists
    const userRole = permission?.role || 'VIEWER';

    // 2. Extract sequential binary document fragments
    const updates = await db.documentUpdate.findMany({
      where: { documentId: docId },
      orderBy: { version: 'asc' }
    });

    const base64Updates = updates.map(u => Buffer.from(u.delta).toString('base64'));

    // 3. Return BOTH the data fragments and the authenticated permission level
    return NextResponse.json({
      title: document?.title || "Untitled Document",
      updates: base64Updates,
      role: userRole 
    });
  } catch (error) {
    console.error("Failed to initialize workspace layout:", error);
    return NextResponse.json({ error: 'Internal server initialization failure' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    const session = await verifyAuth(req);
    
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Verify the user is the OWNER of this document
    const permission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id } }
    });

    if (!permission || permission.role !== 'OWNER') {
      return new NextResponse("Forbidden: Only owners can delete documents", { status: 403 });
    }

    // 2. Delete the document
    // (Note: If your Prisma schema has onDelete: Cascade set up on relations, 
    // this will automatically clean up permissions and checkpoints too!)
    await db.document.delete({
      where: { id: docId }
    });

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("🔥 Document Deletion Failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}