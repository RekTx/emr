import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Query database for user
    const [rows] = await pool.query(
      'SELECT uid, username, password, role, branch, active FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1',
      [trimmedUsername]
    );
    const results = rows as any[];

    if (results.length === 0) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const user = results[0];

    if (user.active === 0) {
      return NextResponse.json({ error: 'This account has been deactivated' }, { status: 403 });
    }

    // If password is not set in the database (e.g. newly migrated user)
    if (!user.password) {
      return NextResponse.json({
        error: 'Password is not configured. Please contact the administrator to assign a password.'
      }, { status: 403 });
    }

    // Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Set signed cookie session
    await setSessionCookie({
      uid: user.uid,
      username: user.username,
      role: Number(user.role),
      branch: user.branch || 'branch-1',
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        username: user.username,
        role: Number(user.role),
        branch: user.branch || 'branch-1',
      }
    });
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
