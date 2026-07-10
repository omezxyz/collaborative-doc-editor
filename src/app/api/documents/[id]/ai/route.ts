import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key-change-in-prod"
);
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function getSessionUser() {
  try {
    const token = (await cookies()).get("session_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload; 
  } catch {
    return null;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    
    // 1. Authenticate Requesting Node Session
    const user = await getSessionUser();
    if (!user || !user.id) { // 💡 FIX: Guard against missing user ID payloads
      return NextResponse.json({ error: "Unauthorized or invalid session token" }, { status: 401 });
    }

    // 2. Validate Real-time DB Permission Matrix
    // 💡 FIX: Explicitly enforce that both string keys are present to prevent Prisma from crashing
    const userIdString = user.id as string;
    if (!docId || !userIdString) {
      return NextResponse.json({ error: "Malformed request routing targets." }, { status: 400 });
    }

    const permission = await prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId: docId,
          userId: userIdString,
        },
      },
    });

    if (!permission || permission.role === "VIEWER") {
      return NextResponse.json(
        { error: "Insufficient mutation permissions to execute AI workflows." },
        { status: 403 }
      );
    }

    // 3. Extract and Validate Payload Configurations
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const { text, mode } = body;
    if (!text || !mode) {
      return NextResponse.json({ error: "Missing text selection or execution mode." }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key unconfigured on upstream host server." },
        { status: 500 }
      );
    }

    // 4. Map Editor Mode Flags to System Engineering Instructions
    const systemPrompt = 
      "You are an elite copyeditor integrated directly into a real-time collaborative workspace. " +
      "CRITICAL: Return ONLY the raw processed text outcome. Do NOT wrap your output in markdown code blocks (such as ```), " +
      "do NOT provide chatty conversational prefaces, warnings, or transition notes. Your literal response is injected straight into the document canvas.";

    let userPromptModifier = "";
    switch (mode) {
      case "improve":
        userPromptModifier = "Rewrite this text to improve its professional polish, flow, vocabulary, and structural clarity:\n\n";
        break;
      case "fix-grammar":
        userPromptModifier = "Review the following text block and repair all spelling errors, syntax issues, typos, and grammar flaws:\n\n";
        break;
      case "summarize":
        userPromptModifier = "Condense the following text into a dense, clean executive summary using bulleted key takeouts:\n\n";
        break;
      case "continue":
        userPromptModifier = "Act as the original author. Read this context baseline and append a natural, logical sequential next paragraph:\n\n";
        break;
      default:
        return NextResponse.json({ error: "Invalid operational execution mode requested." }, { status: 400 });
    }

  // 5. Query Upstream Groq Network Endpoint
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", 
        temperature: mode === "continue" ? 0.7 : 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${userPromptModifier}${text}` },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const errorPayload = await groqResponse.json().catch(() => ({}));
      console.error("Groq Upstream Rejection Details:", errorPayload);
      return NextResponse.json({ error: "Groq engine rejected the compilation prompt format." }, { status: 502 });
    }

    const aiData = await groqResponse.json();
    const cleanOutputText = aiData.choices?.[0]?.message?.content?.trim();

    if (!cleanOutputText) {
      return NextResponse.json({ error: "AI returned an empty generation stream." }, { status: 502 });
    }

    // 6. Echo Back Clean Mutated Content String
    return NextResponse.json({ result: cleanOutputText });

  } catch (error: any) {
    // 💡 DIAGNOSTIC UPGRADE: Print to server terminal AND pass it back to the client
    console.error("🚨 CRITICAL BACKEND RUNTIME FAULT:", error);
    
    return NextResponse.json({ 
      error: "Internal server compilation node fault.",
      diagnosticMessage: error?.message || String(error),
      diagnosticStack: error?.stack
    }, { status: 500 });
  }
}