import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth'; // 💡 1. Make sure to import your auth helper!

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    
    // 💡 2. Get the current logged-in user's session
    const session = await verifyAuth(req);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { commitMessage, clientState } = await req.json();

    if (!clientState) {
      return new NextResponse("Missing document state data", { status: 400 });
    }

    const binaryBuffer = Buffer.from(clientState, 'base64');

    const lastMilestone = await db.documentUpdate.findFirst({
      where: {
        documentId: docId,
        version: { gt: 0 } 
      },
      orderBy: { version: 'desc' }
    });

    const nextVersion = lastMilestone ? lastMilestone.version + 1 : 1;

    // 3. Save the new distinct historical checkpoint row
    const newCheckpoint = await db.documentUpdate.create({
      data: {
        documentId: docId,
        version: nextVersion,
        delta: binaryBuffer,
        message: commitMessage || `Checkpoint v${nextVersion}`,
        
        // 💡 3. CRITICAL FIX: Stamp the row with the user's ID!
        userId: session.id, 
      }
    });

    return NextResponse.json({ success: true, version: newCheckpoint.version });

  } catch (error) {
    console.error("🔥 Checkpoint Creation Failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}