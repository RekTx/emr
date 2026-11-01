import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const parseJsonField = (field: any) => {
  if (!field) return [];
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return [];
  }
};

const mapPrescription = (row: any) => {
  if (!row) return null;
  return {
    ...row,
    isActive: row.isActive === 1,
    showPrevRefraction: row.showPrevRefraction !== 0,
    showTodayRefraction: row.showTodayRefraction !== 0,
    showClinical: row.showClinical !== 0,
    showIOP: row.showIOP !== 0,
    prevRefractionRE: parseJsonField(row.prevRefractionRE),
    prevRefractionLE: parseJsonField(row.prevRefractionLE),
    todayRefractionRE: parseJsonField(row.todayRefractionRE),
    todayRefractionLE: parseJsonField(row.todayRefractionLE),
    history: parseJsonField(row.history),
    examination: parseJsonField(row.examination),
    investigation: parseJsonField(row.investigation),
    diagnosis: parseJsonField(row.diagnosis),
    surgical: parseJsonField(row.surgical),
    medication: parseJsonField(row.medication),
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
};

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get('regNo');
    const search = searchParams.get('q') || '';

    let query = 'SELECT * FROM prescriptions WHERE isActive = 1';
    let values: any[] = [];

    if (regNo) {
      query += ' AND regNo = ?';
      values = [regNo];
    } else if (search) {
      const s = `%${search}%`;
      query += ' AND (patientName LIKE ? OR regNo LIKE ?)';
      values = [s, s];
    }

    query += ' ORDER BY createdAt DESC';

    const [rows] = await db.query(query, values);
    const prescriptions = (rows as any[]).map(mapPrescription);
    return NextResponse.json(prescriptions);
  } catch (error: any) {
    console.error('GET /api/prescriptions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const body = await request.json();
    const {
      patientId, patientName, regNo, visitDate, soDoWo, age, sex, address, city, phone, mobile, healthCard,
      eoms, tropia, phoria, iopRight, iopLeft,
      prevRefractionRE, prevRefractionLE, prevIPD,
      todayRefractionRE, todayRefractionLE, todayIPD,
      history, examination, investigation, diagnosis, surgical, medication,
      reviewInstructions, showPrevRefraction, showTodayRefraction, showClinical, showIOP
    } = body;

    const id = 'rx_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const query = `
      INSERT INTO prescriptions (
        id, patientId, patientName, regNo, visitDate, isActive, soDoWo, age, sex, address, city, phone, mobile, healthCard,
        eoms, tropia, phoria, iopRight, iopLeft,
        prevRefractionRE, prevRefractionLE, prevIPD,
        todayRefractionRE, todayRefractionLE, todayIPD,
        history, examination, investigation, diagnosis, surgical, medication,
        reviewInstructions, showPrevRefraction, showTodayRefraction, showClinical, showIOP,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const values = [
      id, patientId || '', patientName || '', regNo || '', visitDate || '',
      soDoWo || '', age || '', sex || '', address || '', city || '', phone || '', mobile || '', healthCard || '',
      eoms || '', tropia || '', phoria || '', String(iopRight || '0'), String(iopLeft || '0'),
      JSON.stringify(prevRefractionRE || null), JSON.stringify(prevRefractionLE || null), String(prevIPD || '0'),
      JSON.stringify(todayRefractionRE || null), JSON.stringify(todayRefractionLE || null), String(todayIPD || '0'),
      JSON.stringify(history || []), JSON.stringify(examination || []), JSON.stringify(investigation || []),
      JSON.stringify(diagnosis || []), JSON.stringify(surgical || []), JSON.stringify(medication || []),
      reviewInstructions || '',
      showPrevRefraction !== false ? 1 : 0,
      showTodayRefraction !== false ? 1 : 0,
      showClinical !== false ? 1 : 0,
      showIOP !== false ? 1 : 0,
    ];

    await db.query(query, values);

    const [rows] = await db.query('SELECT * FROM prescriptions WHERE id = ?', [id]);
    return NextResponse.json(mapPrescription((rows as any[])[0]));
  } catch (error: any) {
    console.error('POST /api/prescriptions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
