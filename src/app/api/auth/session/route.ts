import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, name, docId, role } = await req.json();

    // Upsert user inside PostgreSQL
    const user = await db.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });

    // Enforce document existence and inject granular authorization permissions
    if (docId) {
      await db.document.upsert({
        where: { id: docId },
        update: {},
        create: { id: docId, title: "Distributed Systems Handout" }
      });

      await db.documentPermission.upsert({
        where: { documentId_userId: { documentId: docId, userId: user.id } },
        update: { role: role },
        create: { documentId: docId, userId: user.id, role: role }
      });
    }

    const token = await createToken({ id: user.id, email: user.email, name: user.name ?? '' });
    
    const response = NextResponse.json({ success: true, user, assignedRole: role });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Auth seeding configuration failure' }, { status: 500 });
  }
}