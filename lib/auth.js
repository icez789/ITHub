import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import db from './db';
import {
  isAdminRole,
  isContentModeratorRole,
  isSuperAdminRole,
} from './roles';
import { createSignedSessionToken, verifySignedSessionToken } from './sessionToken';

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

function isIsolatedLocalE2e() {
  return String(process.env.ITHUB_E2E_ENVIRONMENT || '').toLowerCase() === 'e2e'
    && String(process.env.ITHUB_E2E_ALLOW_WRITES || '').toLowerCase() === 'true'
    && String(process.env.DB_NAME || '').toLowerCase().endsWith('_e2e');
}

export function isSessionConfigurationError(error) {
  return error instanceof SessionConfigurationError
    || error?.name === 'SessionConfigurationError';
}

export function createSessionToken(user) {
  return createSignedSessionToken(user, getSessionSecret(), { ttlSeconds: SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token) {
  return verifySignedSessionToken(token, getSessionSecret());
}

export async function setUserSession(user) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !isIsolatedLocalE2e(),
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
    `SELECT id, username, role, avatar_url, is_banned, session_version
     FROM users WHERE id = ? LIMIT 1`,
    [session.userId],
  );
  const user = users[0] || null;
  return user && !user.is_banned && Number(user.session_version) === session.sessionVersion
    ? user
    : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminRole(user.role)) throw new Error('Forbidden');
  return user;
}

export function isAdmin(user) {
  return Boolean(user && isAdminRole(user.role));
}

export async function requireContentModerator() {
  const user = await requireUser();
  if (!isContentModeratorRole(user.role)) throw new Error('Forbidden');
  return user;
}

export function isContentModerator(user) {
  return Boolean(user && isContentModeratorRole(user.role));
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdminRole(user.role)) throw new Error('Forbidden');
  return user;
}
