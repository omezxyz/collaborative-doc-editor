import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Delete the session cookie
  (await cookies()).delete("session_token");
  
  return NextResponse.json({ success: true });
}