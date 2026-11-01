import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const username = searchParams.get('username');

    let rows: any[] = [];

    if (email) {
      const [results] = await pool.query(
        'SELECT uid, username, email, role, active FROM users WHERE email = ? AND active = 1 LIMIT 1',
        [email.trim()]
      );
      rows = results as any[];
    } else if (username) {
      const [results] = await pool.query(
        'SELECT uid, username, email, role, active FROM users WHERE LOWER(username) = LOWER(?) AND active = 1 LIMIT 1',
        [username.trim()]
      );
      rows = results as any[];
    } else {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('GET /api/users/find error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
