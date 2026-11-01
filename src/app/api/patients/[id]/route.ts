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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const { id } = await params;
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [id]);
    const results = rows as any[];
    if (results.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(mapPatient(results[0]));
  } catch (error: any) {
    console.error('GET /api/patients/[id] error:', error);
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

    // Dynamically build the update query based on fields provided
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'regNo', 'name', 'soDoWo', 'visitDate', 'age', 'sex', 'address', 'city', 'phone', 'mobile', 'healthCard',
      'eoms', 'tropia', 'phoria', 'iopRight', 'iopLeft',
      'prevRefractionRE', 'prevRefractionLE', 'prevIPD',
      'todayRefractionRE', 'todayRefractionLE', 'todayIPD'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fieldsToUpdate.push(`\`${field}\` = ?`);
        if (['prevRefractionRE', 'prevRefractionLE', 'todayRefractionRE', 'todayRefractionLE'].includes(field)) {
          values.push(JSON.stringify(body[field]));
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

    const query = `UPDATE patients SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/patients/[id] error:', error);
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
    await db.query('DELETE FROM patients WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/patients/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
