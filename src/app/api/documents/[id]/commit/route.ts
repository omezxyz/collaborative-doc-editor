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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    
    // 1. Authenticate user session using secure JWT validation
    const session = await getSessionUser();
    if (!session || !session.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { commitMessage, clientState } = await req.json();

    if (!clientState) {
      return new NextResponse("Missing document state data", { status: 400 });
    }

    const binaryBuffer = Buffer.from(clientState, 'base64');

    // 2. Fetch the highest existing version number to calculate the next sequence index
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
        userId: session.id as string, // Explicit type alignment for Prisma
      }
    });

    return NextResponse.json({ success: true, version: newCheckpoint.version });

  } catch (error) {
    console.error("🔥 Checkpoint Creation Failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}