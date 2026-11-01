import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const parseJsonField = (field: any) => {
  if (!field) return null;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
};

const mapTemplate = (row: any) => {
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
    const [rows] = await pool.query('SELECT * FROM letter_templates WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 200');
    const templates = (rows as any[]).map(mapTemplate);
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('GET /api/letter-templates error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, title, content, contentHtml, createdByUid, createdByName, style } = body;

    const id = 'temp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const query = `
      INSERT INTO letter_templates (
        id, name, title, content, contentHtml, createdByUid, createdByName, isActive, style,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const values = [
      id, name || '', title || '', content || '', contentHtml || '', createdByUid || '', createdByName || '',
      JSON.stringify(style || null)
    ];

    await pool.query(query, values);

    const [rows] = await pool.query('SELECT * FROM letter_templates WHERE id = ?', [id]);
    return NextResponse.json(mapTemplate((rows as any[])[0]));
  } catch (error: any) {
    console.error('POST /api/letter-templates error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
