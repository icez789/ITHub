'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ANALYTICS_EVENT_NAMES,
  validateAnalyticsEventPayload,
} from '../lib/researchShared';

const TRACK_EVENT_NAME = 'ithub:research-analytics-track';
const CONSENT_EVENT_NAME = 'ithub:research-analytics-consent';
const SESSION_STORAGE_KEY = 'ithub_research_analytics_session_v1';
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const DELIVERY_WAIT_TIMEOUT_MS = 5_000;
const eventNameSet = new Set(ANALYTICS_EVENT_NAMES);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function trackResearchEvent(event, { waitForDelivery = false } = {}) {
  if (typeof window === 'undefined') return Promise.resolve({ delivered: false, reason: 'server' });
  if (!waitForDelivery) {
    window.dispatchEvent(new CustomEvent(TRACK_EVENT_NAME, { detail: event }));
    return Promise.resolve({ delivered: false, reason: 'queued' });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const timeout = setTimeout(
      () => finish({ delivered: false, reason: 'timeout' }),
      DELIVERY_WAIT_TIMEOUT_MS,
    );
    const detail = { ...event, deliveryCallback: finish, deliveryHandled: false };
    window.dispatchEvent(new CustomEvent(TRACK_EVENT_NAME, { detail }));
    if (!detail.deliveryHandled) finish({ delivered: false, reason: 'unavailable' });
  });
}

export function setResearchAnalyticsEnabled(enabled) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME, {
    detail: { enabled: Boolean(enabled) },
  }));
}

function createUuid() {
  return globalThis.crypto?.randomUUID?.() || null;
}

function clearStoredSession(memorySessionRef) {
  memorySessionRef.current = null;
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage may be unavailable; the in-memory identifier is already cleared.
  }
}

function getSessionId(memorySessionRef) {
  const now = Date.now();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    if (
      uuidPattern.test(stored?.id || '')
      && Number.isFinite(stored?.lastActivity)
      && now - stored.lastActivity <= SESSION_IDLE_TIMEOUT_MS
      && now >= stored.lastActivity
    ) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id: stored.id, lastActivity: now }));
      return stored.id;
    }
    const id = createUuid();
    if (!id) return null;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id, lastActivity: now }));
    return id;
  } catch {
    if (!memorySessionRef.current) memorySessionRef.current = createUuid();
    return memorySessionRef.current;
  }
}

function feedName(queryString) {
  const searchParams = new URLSearchParams(queryString);
  const feed = searchParams.get('feed');
  if (feed === 'following') return 'following';
  if (feed === 'for-you') return 'for_you';
  return 'community';
}

export default function ResearchAnalyticsProvider({ initialEnabled = false }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const navigationKey = `${pathname}?${queryString}`;
  const [enabled, setEnabled] = useState(Boolean(initialEnabled));
  const enabledRef = useRef(Boolean(initialEnabled));
  const memorySessionRef = useRef(null);

  const sendEvent = useCallback((detail) => {
    const finish = typeof detail?.deliveryCallback === 'function'
      ? detail.deliveryCallback
      : null;
    if (!enabledRef.current || !detail || !eventNameSet.has(detail.eventName)) {
      finish?.({ delivered: false, reason: 'disabled' });
      return;
    }
    const eventId = createUuid();
    const sessionId = getSessionId(memorySessionRef);
    if (!eventId || !sessionId) {
      finish?.({ delivered: false, reason: 'session_unavailable' });
      return;
    }

    const event = {
      eventId,
      sessionId,
      eventName: detail.eventName,
      eventVersion: 1,
      route: window.location.pathname,
      properties: detail.properties || {},
      occurredAt: new Date().toISOString(),
    };
    if (detail.outcome != null) event.outcome = detail.outcome;
    if (detail.failureCode != null) event.failureCode = detail.failureCode;
    if (detail.campaignId != null) event.campaignId = detail.campaignId;

    let safeEvent;
    try {
      safeEvent = validateAnalyticsEventPayload(event);
    } catch {
      finish?.({ delivered: false, reason: 'invalid_event' });
      return;
    }

    const request = fetch('/api/analytics/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [safeEvent] }),
      keepalive: true,
      mode: 'same-origin',
      referrerPolicy: 'same-origin',
    }).then((response) => ({
      delivered: response.ok,
      status: response.status,
    })).catch(() => ({ delivered: false, reason: 'network' }));
    if (finish) void request.then(finish);
    else void request;
  }, []);

  useEffect(() => {
    if (!initialEnabled) clearStoredSession(memorySessionRef);
  }, [initialEnabled]);

  useEffect(() => {
    const handleTrack = (event) => {
      const detail = event.detail;
      if (!detail || typeof detail !== 'object') return;
      detail.deliveryHandled = true;
      sendEvent(detail);
    };
    const handleConsent = (event) => {
      const nextEnabled = Boolean(event.detail?.enabled);
      enabledRef.current = nextEnabled;
      if (!nextEnabled) clearStoredSession(memorySessionRef);
      setEnabled(nextEnabled);
    };
    window.addEventListener(TRACK_EVENT_NAME, handleTrack);
    window.addEventListener(CONSENT_EVENT_NAME, handleConsent);
    return () => {
      window.removeEventListener(TRACK_EVENT_NAME, handleTrack);
      window.removeEventListener(CONSENT_EVENT_NAME, handleConsent);
    };
  }, [sendEvent]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) return;
    sendEvent({ eventName: 'page_viewed' });
    if (pathname === '/') {
      sendEvent({ eventName: 'feed_viewed', properties: { feed: feedName(queryString) } });
    }
  }, [enabled, navigationKey, pathname, queryString, sendEvent]);

  return null;
}
