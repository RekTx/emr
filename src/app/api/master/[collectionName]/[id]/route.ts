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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ collectionName: string; id: string }> }
) {
  try {
    const { collectionName, id } = await params;

    if (!ALLOWED_TABLES.includes(collectionName)) {
      return NextResponse.json({ error: 'Invalid master list name' }, { status: 400 });
    }

    const body = await request.json();
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

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
        fieldsToUpdate.push(`\`${key}\` = ?`);
        if (['details', 'explanations'].includes(key)) {
          values.push(JSON.stringify(body[key]));
        } else if (key === 'starred') {
          values.push(body[key] ? 1 : 0);
        } else {
          values.push(body[key]);
        }
      }
    }

    if (fieldsToUpdate.length === 0) {
      return NextResponse.json({ message: 'No fields to update' });
    }

    values.push(id);

    const query = `UPDATE \`${collectionName}\` SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    await pool.query(query, values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`PUT /api/master/${error.message}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collectionName: string; id: string }> }
) {
  try {
    const { collectionName, id } = await params;

    if (!ALLOWED_TABLES.includes(collectionName)) {
      return NextResponse.json({ error: 'Invalid master list name' }, { status: 400 });
    }

    await pool.query(`DELETE FROM \`${collectionName}\` WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`DELETE /api/master/${error.message}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
