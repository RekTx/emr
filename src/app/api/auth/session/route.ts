import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(null);
    }
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(null);
  }
}
