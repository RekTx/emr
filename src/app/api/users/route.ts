import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await pool.query(
      'SELECT uid, username, email, role, branch, active FROM users WHERE role = 2 AND active = 1 ORDER BY username ASC'
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, password, email, role, branch, active } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check duplicate username for active users
    const [duplicates] = await pool.query(
      'SELECT uid FROM users WHERE LOWER(username) = LOWER(?) AND active = 1',
      [trimmedUsername]
    );

    if ((duplicates as any[]).length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = 'rec_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const userEmail = email ? email.trim() : `${trimmedUsername.toLowerCase()}@ophthemr.app`;

    const query = `
      INSERT INTO users (uid, username, email, password, role, branch, active, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const values = [uid, trimmedUsername, userEmail, passwordHash, role ?? 2, branch || 'branch-1', active !== false ? 1 : 0];

    await pool.query(query, values);
    
    return NextResponse.json({
      uid,
      username: trimmedUsername,
      email: userEmail,
      role: role ?? 2,
      branch: branch || 'branch-1',
      active: active !== false,
    });
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
