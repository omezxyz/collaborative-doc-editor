import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const token = (await cookies()).get("session_token")?.value;
  if (!token) return NextResponse.json({ error: "No session" }, { status: 401 });
  return NextResponse.json({ token });
}