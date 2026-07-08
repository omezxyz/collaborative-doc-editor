import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// 1. GET: Fetch all documents accessible to the active user session
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    // Retrieve documents through the permission intersection matrix
    const userPermissions = await db.documentPermission.findMany({
      where: { userId: session.id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      },
      orderBy: { document: { updatedAt: 'desc' } }
    });

    // Flatten data mapping for cleaner frontend consumption
    const documents = userPermissions.map(p => ({
      id: p.document.id,
      title: p.document.title,
      role: p.role,
      createdAt: p.document.createdAt,
      updatedAt: p.document.updatedAt,
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Dashboard list build failure:", error);
    return NextResponse.json({ error: 'Internal database read failure' }, { status: 500 });
  }
}

// 2. POST: Initialize a fresh document record and establish owner privileges
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json();
    const finalTitle = title?.trim() || "Untitled Collaboration Workspace";

    // Perform atomic transaction: create document, then assign OWNER permission
    const result = await db.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: { title: finalTitle }
      });

      await tx.documentPermission.create({
        data: {
          documentId: doc.id,
          userId: session.id,
          role: 'OWNER'
        }
      });

      return doc;
    });

    return NextResponse.json({ success: true, document: result });
  } catch (error) {
    console.error("Document workspace initialization broken:", error);
    return NextResponse.json({ error: 'Internal execution fault' }, { status: 500 });
  }
}