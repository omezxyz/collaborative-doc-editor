import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-prod");

export async function GET() {
  try {
    const token = (await cookies()).get("session_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({ user: { name: payload.name, email: payload.email } });
  } catch {
    return NextResponse.json({ error: "Invalid token session" }, { status: 401 });
  }
}