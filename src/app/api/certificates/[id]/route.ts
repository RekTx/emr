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

const mapCertificate = (row: any) => {
  if (!row) return null;
  return {
    ...row,
    isActive: row.isActive === 1,
    style: parseJsonField(row.style),
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
    const [rows] = await db.query('SELECT * FROM certificates WHERE id = ?', [id]);
    const results = rows as any[];
    if (results.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(mapCertificate(results[0]));
  } catch (error: any) {
    console.error('GET /api/certificates/[id] error:', error);
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

    const allowedFields = ['title', 'content', 'contentHtml', 'createdByUid', 'createdByName', 'isActive', 'style'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fieldsToUpdate.push(`\`${field}\` = ?`);
        if (field === 'style') {
          values.push(JSON.stringify(body[field]));
        } else if (field === 'isActive') {
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

    const query = `UPDATE certificates SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/certificates/[id] error:', error);
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
    await db.query('UPDATE certificates SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/certificates/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
