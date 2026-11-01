import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const [rows] = await db.query('SELECT regNo FROM patients ORDER BY regNo DESC LIMIT 1');
    const results = rows as any[];
    if (results.length === 0) {
      return NextResponse.json('REG-0001');
    }

    const latestRegNo = results[0].regNo;
    const num = parseInt(String(latestRegNo).replace(/\D/g, ''), 10);
    
    if (isNaN(num)) {
      return NextResponse.json('REG-0001');
    }
    
    const nextRegNo = `REG-${String(num + 1).padStart(4, '0')}`;
    return NextResponse.json(nextRegNo);
  } catch (error: any) {
    console.error('GET /api/patients/next-regno error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
