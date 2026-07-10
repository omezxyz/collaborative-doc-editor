import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

// Helper to extract user identity out of the HTTP-only cookie stream
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; vNum: string }> }) {
  try {
    const { id: docId, vNum } = await params;
    const targetVersion = parseInt(vNum, 10);

    if (isNaN(targetVersion)) {
      return new NextResponse("Invalid version number parameter.", { status: 400 });
    }

    // 1. Authenticate using our secure JWT cookie check
    const session = await getSessionUser();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    // 2. Enforce read permission before leaking historical binary data
    const permission = await db.documentPermission.findUnique({
      where: { documentId_userId: { documentId: docId, userId: session.id as string } }
    });
    if (!permission) return new NextResponse("Forbidden", { status: 403 });

    // 3. Fetch ONLY the specific version requested. 
    // This explicitly ignores version 0 (the live document).
    const versionRecord = await db.documentUpdate.findFirst({
      where: { 
        documentId: docId, 
        version: targetVersion 
      }
    });

    if (!versionRecord) {
      return new NextResponse("No historical data found for this version.", { status: 404 });
    }

    // 4. Return the pure binary snapshot directly to the frontend.
    // No merging required because our Commit API saves the complete state!
    return new NextResponse(versionRecord.delta, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });

  } catch (error) {
    console.error("🔥 FATAL ERROR in /versions/[vNum]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}