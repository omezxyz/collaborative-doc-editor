import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

// Helper to decrypt the session
async function getSessionUser() {
  const token = (await cookies()).get("session_token")?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload; // { id, email, name }
  } catch {
    return null;
  }
}

// GET: Fetch a single document's metadata and verify access
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // 1. Wrapped in a Promise type
) {
  try {
    const { id } = await params; // 2. Unwrapped safely with await!
    
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doc = await prisma.document.findUnique({
      where: { id: id },
      include: {
        permissions: {
          where: { userId: user.id as string }
        }
      }
    });

    if (!doc || doc.permissions.length === 0) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      role: doc.permissions[0].role,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    console.error("Failed fetching document:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE: Handle workspace deletion from the Dashboard
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // 1. Wrapped in a Promise type
) {
  try {
    const { id } = await params; // 2. Unwrapped safely with await!

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permission = await prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId: id,
          userId: user.id as string,
        }
      }
    });

    if (!permission || permission.role !== "OWNER") {
      return NextResponse.json({ error: "Only the owner can delete this document" }, { status: 403 });
    }

    await prisma.document.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed deleting document:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}