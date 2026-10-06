import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import prisma from './db';
import { AuthSession, UserRole, SystemRole } from './types';

const SESSION_COOKIE_NAME = 'sftp_session';
const AUTH_SECRET = process.env.AUTH_SECRET || 'fallback_secret_32_characters_sftp_2026';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Simple and cryptographically secure Web Crypto HMAC token for sessions
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer.slice(0) as ArrayBuffer;
}

export async function createSessionToken(payload: { userId: string }): Promise<string> {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const dataB64 = Buffer.from(data).toString('base64url');
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataB64));
  const sigHex = bufferToHex(signature);
  return `${dataB64}.${sigHex}`;
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [dataB64, sigHex] = parts;
    const key = await getCryptoKey();
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      hexToBuffer(sigHex),
      new TextEncoder().encode(dataB64)
    );
    if (!isValid) return null;

    const dataJson = Buffer.from(dataB64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(dataJson);
    if (parsed.exp < Date.now()) {
      return null; // Expired
    }
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

/**
 * Retrieves the authenticated session from cookies
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const payload = await verifySessionToken(sessionCookie.value);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, status: 'ACTIVE' },
      include: {
        memberships: {
          where: { active: true },
          include: { society: true },
        },
      },
    });

    if (!user) return null;

    // Check selected society cookie if set
    const activeSocietyCookie = cookieStore.get('sftp_active_society')?.value;

    const memberships = user.memberships.map((m) => ({
      societyId: m.societyId,
      societyName: m.society.name,
      societyCode: m.society.code,
      role: m.role as UserRole,
    }));

    let currentSociety = memberships.find((m) => m.societyId === activeSocietyCookie);
    if (!currentSociety && memberships.length > 0) {
      currentSociety = memberships[0];
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      systemRole: user.role as SystemRole,
      currentSocietyId: currentSociety?.societyId,
      currentSocietyRole: (user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : currentSociety?.role) as UserRole,
      societyMemberships: memberships,
    };
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

/**
 * Helper to inspect session directly from an incoming NextRequest
 */
export async function getSessionFromRequest(request: NextRequest): Promise<AuthSession | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, status: 'ACTIVE' },
      include: {
        memberships: {
          where: { active: true },
          include: { society: true },
        },
      },
    });

    if (!user) return null;

    const activeSocietyCookie = request.cookies.get('sftp_active_society')?.value;

    const memberships = user.memberships.map((m) => ({
      societyId: m.societyId,
      societyName: m.society.name,
      societyCode: m.society.code,
      role: m.role as UserRole,
    }));

    let currentSociety = memberships.find((m) => m.societyId === activeSocietyCookie);
    if (!currentSociety && memberships.length > 0) {
      currentSociety = memberships[0];
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      systemRole: user.role as SystemRole,
      currentSocietyId: currentSociety?.societyId,
      currentSocietyRole: (user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : currentSociety?.role) as UserRole,
      societyMemberships: memberships,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
