import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const [rows] = await pool.query('SELECT uid, username, email, role, active FROM users WHERE uid = ?', [uid]);
    const results = rows as any[];

    if (results.length === 0) {
      return NextResponse.json({ error: 'Account not provisioned' }, { status: 404 });
    }

    return NextResponse.json(results[0]);
  } catch (error: any) {
    console.error('GET /api/users/check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
