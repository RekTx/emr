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

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const [rows] = await db.query('SELECT * FROM certificates WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 200');
    const certificates = (rows as any[]).map(mapCertificate);
    return NextResponse.json(certificates);
  } catch (error: any) {
    console.error('GET /api/certificates error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const db = getPool(sessionUser?.branch);

    const body = await request.json();
    const { title, content, contentHtml, createdByUid, createdByName, style } = body;

    const id = 'cert_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const query = `
      INSERT INTO certificates (
        id, title, content, contentHtml, createdByUid, createdByName, isActive, style,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const values = [
      id, title || '', content || '', contentHtml || '', createdByUid || '', createdByName || '',
      JSON.stringify(style || null)
    ];

    await db.query(query, values);

    const [rows] = await db.query('SELECT * FROM certificates WHERE id = ?', [id]);
    return NextResponse.json(mapCertificate((rows as any[])[0]));
  } catch (error: any) {
    console.error('POST /api/certificates error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
