import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check duplicate username for other users
    const [duplicates] = await pool.query(
      'SELECT uid FROM users WHERE LOWER(username) = LOWER(?) AND uid != ? AND active = 1',
      [username.trim(), uid]
    );

    if ((duplicates as any[]).length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    await pool.query(
      'UPDATE users SET username = ?, updatedAt = CURRENT_TIMESTAMP WHERE uid = ?',
      [username.trim(), uid]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/users/[uid] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Set active = 0 (Deactivate account)
    await pool.query(
      'UPDATE users SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE uid = ?',
      [uid]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/users/[uid] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
