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
    
    // Authorization check: Only Doctor/Admin (role = 1) can reset other users' passwords
    if (!sessionUser || sessionUser.role !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Fetch original user's branch to preserve it
    const [originalUserRows] = await pool.query('SELECT branch FROM users WHERE uid = ?', [uid]);
    const originalUser = (originalUserRows as any[])[0];
    const branch = originalUser?.branch || 'branch-1';

    // 1. Deactivate current receptionist profile
    await pool.query(
      'UPDATE users SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE uid = ?',
      [uid]
    );

    // 2. Create new profile with new password hash and new UID
    const newUid = 'rec_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const passwordHash = await bcrypt.hash(password, 10);
    const email = `reception-${trimmedUsername.toLowerCase()}-${Date.now()}@ophthemr.app`;

    const insertQuery = `
      INSERT INTO users (uid, username, email, password, role, branch, active, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 2, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    await pool.query(insertQuery, [newUid, trimmedUsername, email, passwordHash, branch]);

    return NextResponse.json({
      uid: newUid,
      username: trimmedUsername,
      email,
      role: 2,
      branch,
      active: true,
    });
  } catch (error: any) {
    console.error('Admin password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
