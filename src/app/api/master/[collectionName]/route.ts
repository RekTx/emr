import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const ALLOWED_TABLES = [
  'master_history',
  'master_personal_complaints',
  'master_examination',
  'master_investigation',
  'master_diagnosis',
  'master_management',
  'master_drugs',
  'master_frequency',
  'master_usages',
  'master_review_instructions',
  'master_eyeside'
];

const parseJsonField = (field: any) => {
  if (!field) return [];
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return [];
  }
};

const mapMasterRow = (table: string, row: any) => {
  if (!row) return null;
  const mapped = {
    ...row,
    starred: row.starred === 1,
    starredAt: Number(row.starredAt || 0),
  };

  // Parse JSON fields
  if (table === 'master_history' || table === 'master_diagnosis' || table === 'master_management') {
    mapped.details = parseJsonField(row.details);
  } else if (table === 'master_examination') {
    mapped.explanations = parseJsonField(row.explanations);
  }
  return mapped;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collectionName: string }> }
) {
  try {
    const { collectionName } = await params;
    
    // Sanitize / validate the table name
    if (!ALLOWED_TABLES.includes(collectionName)) {
      return NextResponse.json({ error: 'Invalid master list name' }, { status: 400 });
    }

    const [rows] = await pool.query(`SELECT * FROM \`${collectionName}\``);
    const items = (rows as any[]).map(row => mapMasterRow(collectionName, row));
    return NextResponse.json(items);
  } catch (error: any) {
    console.error(`GET /api/master/${error.message}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ collectionName: string }> }
) {
  try {
    const { collectionName } = await params;
    
    if (!ALLOWED_TABLES.includes(collectionName)) {
      return NextResponse.json({ error: 'Invalid master list name' }, { status: 400 });
    }

    const body = await request.json();
    const id = 'mst_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const fields = ['id'];
    const placeholders = ['?'];
    const values: any[] = [id];

    // Get fields based on table schema
    const allowedKeys: Record<string, string[]> = {
      master_history: ['symptom', 'details', 'comments', 'starred', 'starredAt', 'sortOrder'],
      master_personal_complaints: ['complaint', 'starred', 'starredAt', 'sortOrder'],
      master_examination: ['title', 'explanations', 'starred', 'starredAt', 'sortOrder'],
      master_investigation: ['investigation', 'comments', 'starred', 'starredAt', 'sortOrder'],
      master_diagnosis: ['disease', 'details', 'comments', 'starred', 'starredAt', 'sortOrder'],
      master_management: ['procedure', 'details', 'comments', 'starred', 'starredAt', 'sortOrder'],
      master_drugs: ['drugType', 'drugName', 'starred', 'starredAt', 'sortOrder'],
      master_frequency: ['frequency', 'starred', 'starredAt', 'sortOrder'],
      master_usages: ['usage', 'starred', 'starredAt', 'sortOrder'],
      master_review_instructions: ['review', 'instruction', 'starred', 'starredAt', 'sortOrder', 'reviewSortOrder', 'instructionSortOrder'],
      master_eyeside: ['eyeSide', 'starred', 'starredAt', 'sortOrder']
    };

    const keys = allowedKeys[collectionName] || [];
    for (const key of keys) {
      if (body[key] !== undefined) {
        fields.push(`\`${key}\``);
        placeholders.push('?');
        if (['details', 'explanations'].includes(key)) {
          values.push(JSON.stringify(body[key]));
        } else if (key === 'starred') {
          values.push(body[key] ? 1 : 0);
        } else {
          values.push(body[key]);
        }
      }
    }

    const query = `INSERT INTO \`${collectionName}\` (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await pool.query(query, values);

    return NextResponse.json(id);
  } catch (error: any) {
    console.error(`POST /api/master/${error.message}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
