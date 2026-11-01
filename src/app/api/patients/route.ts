import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const parseJsonField = (field: any) => {
  if (!field) return null;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
};

const mapPatient = (row: any) => {
  if (!row) return null;
  return {
    ...row,
    iopRight: String(row.iopRight ?? '0'),
    iopLeft: String(row.iopLeft ?? '0'),
    prevRefractionRE: parseJsonField(row.prevRefractionRE),
    prevRefractionLE: parseJsonField(row.prevRefractionLE),
    todayRefractionRE: parseJsonField(row.todayRefractionRE),
    todayRefractionLE: parseJsonField(row.todayRefractionLE),
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
};

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const { searchParams } = new URL(request.url);
    const today = searchParams.get('today') === 'true';
    const clientDate = searchParams.get('date');
    const regNo = searchParams.get('regNo');
    const search = searchParams.get('q') || '';

    // If searching by regNo
    if (regNo) {
      const [rows] = await db.query(
        'SELECT * FROM patients WHERE regNo = ? ORDER BY visitDate DESC, updatedAt DESC LIMIT 1',
        [regNo]
      );
      const results = rows as any[];
      if (results.length === 0) {
        return NextResponse.json(null);
      }
      return NextResponse.json(mapPatient(results[0]));
    }

    let query = 'SELECT * FROM patients';
    let values: any[] = [];

    if (today) {
      let dateStr = clientDate;
      if (!dateStr) {
        const now = new Date();
        dateStr = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, '0'),
          String(now.getDate()).padStart(2, '0'),
        ].join('-');
      }
      query += ' WHERE visitDate = ?';
      values = [dateStr];
    } else if (search) {
      const s = `%${search}%`;
      query += ' WHERE name LIKE ? OR regNo LIKE ? OR city LIKE ? OR mobile LIKE ?';
      values = [s, s, s, s];
    }

    if (today) {
      // Sort today's queue in the order entered
      query += ' ORDER BY createdAt ASC, regNo ASC';
    } else {
      query += ' ORDER BY createdAt DESC';
    }

    const [rows] = await db.query(query, values);
    const patients = (rows as any[]).map(mapPatient);
    return NextResponse.json(patients);
  } catch (error: any) {
    console.error('GET /api/patients error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const body = await request.json();
    const {
      regNo, name, soDoWo, visitDate, age, sex, address, city, phone, mobile, healthCard,
      eoms, tropia, phoria, iopRight, iopLeft,
      prevRefractionRE, prevRefractionLE, prevIPD,
      todayRefractionRE, todayRefractionLE, todayIPD
    } = body;

    // Generate unique ID like Firebase doc ID
    const id = 'pat_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const query = `
      INSERT INTO patients (
        id, regNo, name, soDoWo, visitDate, age, sex, address, city, phone, mobile, healthCard,
        eoms, tropia, phoria, iopRight, iopLeft,
        prevRefractionRE, prevRefractionLE, prevIPD,
        todayRefractionRE, todayRefractionLE, todayIPD,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const values = [
      id, regNo || '', name || '', soDoWo || '', visitDate || '', age || '', sex || 'Male', address || '', city || '', phone || '', mobile || '', healthCard || '',
      eoms || '', tropia || '', phoria || '', String(iopRight || '0'), String(iopLeft || '0'),
      JSON.stringify(prevRefractionRE || null), JSON.stringify(prevRefractionLE || null), String(prevIPD || '0'),
      JSON.stringify(todayRefractionRE || null), JSON.stringify(todayRefractionLE || null), String(todayIPD || '0')
    ];

    await db.query(query, values);

    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [id]);
    return NextResponse.json(mapPatient((rows as any[])[0]));
  } catch (error: any) {
    console.error('POST /api/patients error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
