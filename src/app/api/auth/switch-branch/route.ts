import { NextResponse } from 'next/server';
import { getSessionUser, setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only Doctor/Admin (role = 1) is allowed to switch databases dynamically
    if (sessionUser.role !== 1) {
      return NextResponse.json({ error: 'Unauthorized. Staff accounts are branch-locked.' }, { status: 403 });
    }

    const { branch } = await request.json();
    if (!branch || !['branch-1', 'branch-2'].includes(branch)) {
      return NextResponse.json({ error: 'Invalid branch selection' }, { status: 400 });
    }

    // Re-sign session cookie with new branch setting
    await setSessionCookie({
      uid: sessionUser.uid,
      username: sessionUser.username,
      role: sessionUser.role,
      branch: branch,
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    console.error('Switch branch API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
