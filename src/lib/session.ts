import crypto from 'crypto';
import { cookies } from 'next/headers';

const SECRET = process.env.SESSION_SECRET || 'default-jwt-secret-key-change-this-in-env-32-chars';

export function signToken(payload: { uid: string; username: string; role: number; branch?: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { uid: string; username: string; role: number; branch?: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  
  const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (signature !== expectedSignature) return null;
  
  try {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  return verifyToken(sessionToken);
}

export async function setSessionCookie(payload: { uid: string; username: string; role: number; branch?: string }) {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
