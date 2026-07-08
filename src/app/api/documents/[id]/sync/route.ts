import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: docId } = await params;
    
    // 1. Authenticate user session
    const session = await verifyAuth(req);
    if (!session || !session.id) {
      console.error("❌ Sync API: Unauthorized or empty session id.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. RBAC Lookup with Explicit Type Alignment
    // Ensure session.id matches the type (string/int) required by your schema
    const permission = await db.documentPermission.findUnique({
      where: { 
        documentId_userId: { 
          documentId: docId, 
          userId: session.id 
        } 
      }
    });

    // Logging this to your terminal console makes tracking discrepancies instant
    console.log(`🔐 [RBAC Sync Check] Doc: ${docId} | User: ${session.id} | Resolved Role: ${permission?.role || 'NONE (Fallback to VIEWER)'}`);

    // If no row matches, default strictly to VIEWER protection
    const userRole = permission?.role || 'VIEWER';

    // 3. Gather up sequentially stored delta updates
    const updates = await db.documentUpdate.findMany({
      where: { documentId: docId },
      orderBy: { version: 'asc' }
    });

    // Map binary arrays to clean base64 text representations
    const base64Updates = updates.map(u => Buffer.from(u.delta).toString('base64'));

    // 4. Return the complete layout context
    return NextResponse.json({
      updates: base64Updates,
      role: userRole
    });

  } catch (error) {
    console.error("🚨 Critical failure in sync endpoint:", error);
    return NextResponse.json({ error: 'Internal synchronization fault' }, { status: 500 });
  }
}