import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/lib/session';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const sessionUser = await getSessionUser();
    
    // Authorization check: User must be logged in and can only change their own password
    if (!sessionUser || sessionUser.uid !== uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE uid = ?', [newHash, uid]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
