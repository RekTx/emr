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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const { id } = await params;
    const [rows] = await db.query('SELECT * FROM prescriptions WHERE id = ?', [id]);
    const results = rows as any[];
    if (results.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(mapPrescription(results[0]));
  } catch (error: any) {
    console.error('GET /api/prescriptions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const { id } = await params;
    const body = await request.json();

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'patientId', 'patientName', 'regNo', 'visitDate', 'isActive', 'soDoWo', 'age', 'sex', 'address', 'city', 'phone', 'mobile', 'healthCard',
      'eoms', 'tropia', 'phoria', 'iopRight', 'iopLeft',
      'prevRefractionRE', 'prevRefractionLE', 'prevIPD',
      'todayRefractionRE', 'todayRefractionLE', 'todayIPD',
      'history', 'examination', 'investigation', 'diagnosis', 'surgical', 'medication',
      'reviewInstructions', 'showPrevRefraction', 'showTodayRefraction', 'showClinical', 'showIOP'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fieldsToUpdate.push(`\`${field}\` = ?`);
        if ([
          'prevRefractionRE', 'prevRefractionLE', 'todayRefractionRE', 'todayRefractionLE',
          'history', 'examination', 'investigation', 'diagnosis', 'surgical', 'medication'
        ].includes(field)) {
          values.push(JSON.stringify(body[field]));
        } else if (['isActive', 'showPrevRefraction', 'showTodayRefraction', 'showClinical', 'showIOP'].includes(field)) {
          values.push(body[field] ? 1 : 0);
        } else {
          values.push(body[field]);
        }
      }
    }

    if (fieldsToUpdate.length === 0) {
      return NextResponse.json({ message: 'No fields to update' });
    }

    fieldsToUpdate.push('`updatedAt` = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE prescriptions SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/prescriptions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const { id } = await params;
    // Soft delete
    await db.query('UPDATE prescriptions SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/prescriptions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
