import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

// Helper function to decode the secure JWT cookie
async function getSessionUser() {
  const token = (await cookies()).get("session_token")?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload; // Returns { id, email, name }
  } catch (error) {
    return null;
  }
}

// GET: Fetch all documents for the logged-in user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query Prisma for documents this user has permission to see
    const userDocs = await prisma.document.findMany({
      where: {
        permissions: {
          some: { userId: user.id as string }
        }
      },
      include: {
        permissions: {
          where: { userId: user.id as string }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Format the response to perfectly match your Dashboard interface
    const formattedDocs = userDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      role: doc.permissions[0].role,
      updatedAt: doc.updatedAt.toISOString(),
    }));

    return NextResponse.json({ documents: formattedDocs });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Create a new document and assign the creator as OWNER
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();

    // Create the document AND the permission link simultaneously using Prisma nested writes
    const newDoc = await prisma.document.create({
      data: {
        title: title || "Untitled Document",
        permissions: {
          create: {
            userId: user.id as string,
            role: "OWNER" // The creator is always the owner
          }
        }
      }
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error) {
    console.error("Failed to create document:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}