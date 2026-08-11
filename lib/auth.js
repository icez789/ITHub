import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import db from './db';

const SESSION_COOKIE = 'user_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export class SessionConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SessionConfigurationError';
  }
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? process.env.DB_PASSWORD : '');
  const minimumLength = process.env.NODE_ENV === 'production' ? 32 : 16;
  if (!secret || secret.length < minimumLength) {
    throw new SessionConfigurationError(
      `SESSION_SECRET must be configured with at least ${minimumLength} characters`,
    );
  }
  return secret;
}

export function isSessionConfigurationError(error) {
  return error instanceof SessionConfigurationError
    || error?.name === 'SessionConfigurationError';
}

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(encodedPayload) {
  return createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({
    userId: Number(user.id),
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS,
  }));

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (typeof token !== 'string') return null;

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !safeEqual(sign(payload), signature)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(session.userId) || session.userId <= 0 || session.expiresAt <= now) return null;
    return session;
  } catch {
    return null;
  }
}

export async function setUserSession(user) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    priority: 'high',
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const [users] = await db.query(
    `SELECT id, username, role, avatar_url, is_banned
     FROM users WHERE id = ? LIMIT 1`,
    [session.userId],
  );
  const user = users[0] || null;
  return user && !user.is_banned ? user : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!['admin', 'super_admin'].includes(user.role)) throw new Error('Forbidden');
  return user;
}

export function isAdmin(user) {
  return Boolean(user && ['admin', 'super_admin'].includes(user.role));
}
