import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; 

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; vNum: string }> }) {
  try {
    const { id: docId, vNum } = await params;
    const targetVersion = parseInt(vNum, 10);

    // 1. Fetch ONLY the specific version requested. 
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

    // 2. Return the pure binary snapshot directly to the frontend.
    // No merging required because our Commit API saves the complete state!
    return new NextResponse(versionRecord.delta, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });

  } catch (error) {
    console.error("🔥 FATAL ERROR in /versions/[vNum]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}