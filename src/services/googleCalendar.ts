/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../supabaseClient';

export const GOOGLE_ACCESS_TOKEN_KEY = 'apexa_gcal_token';
export const GOOGLE_REFRESH_TOKEN_KEY = 'apexa_gcal_refresh_token';
export const GOOGLE_DISCONNECTED_KEY = 'apexa_gcal_disconnected';

export interface GoogleCalendarDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: GoogleCalendarDateTime;
  end: GoogleCalendarDateTime;
  color?: string;
  colorId?: string;
  htmlLink?: string;
  status?: string;
  isGoogleEvent: true;
}

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: GoogleCalendarDateTime;
  end: GoogleCalendarDateTime;
  colorId?: string;
}

type CalendarOperation = 'list' | 'create' | 'update' | 'delete';

interface CalendarApiResponse {
  events?: unknown[];
  event?: unknown;
  deleted?: boolean;
  providerToken?: string;
  error?: string;
  code?: string;
  reconnectRequired?: boolean;
}

export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly reconnectRequired = false,
  ) {
    super(message);
    this.name = 'GoogleCalendarError';
  }
}

const GOOGLE_EVENT_COLORS: Record<string, string> = {
  '2': '#10b981',
  '5': '#f59e0b',
  '9': '#2563EB',
  '11': '#ef4444',
};

function normalizeEvent(item: any): GoogleCalendarEvent {
  return {
    id: String(item?.id || ''),
    summary: String(item?.summary || '(Không có tiêu đề)'),
    description: String(item?.description || ''),
    start: item?.start || {},
    end: item?.end || {},
    color: GOOGLE_EVENT_COLORS[String(item?.colorId || '')] || '#10b981',
    colorId: item?.colorId,
    htmlLink: item?.htmlLink,
    status: item?.status,
    isGoogleEvent: true,
  };
}

function persistProviderTokens(session: {
  provider_token?: string | null;
  provider_refresh_token?: string | null;
} | null) {
  if (typeof window === 'undefined' || !session) return;
  if (session.provider_token && !localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY)) {
    localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, session.provider_token);
  }
  if (session.provider_refresh_token && !localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY)) {
    localStorage.setItem(GOOGLE_REFRESH_TOKEN_KEY, session.provider_refresh_token);
  }
}

async function requestCalendar(
  operation: CalendarOperation,
  payload: { eventId?: string; event?: GoogleCalendarEventInput } = {},
): Promise<CalendarApiResponse> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new GoogleCalendarError('Vui lòng đăng nhập lại Costack.', 401, 'APEXA_SESSION_REQUIRED', true);
  }

  if (typeof window !== 'undefined' && localStorage.getItem(GOOGLE_DISCONNECTED_KEY) === '1') {
    throw new GoogleCalendarError('Google Calendar chưa được kết nối.', 401, 'GOOGLE_NOT_CONNECTED', true);
  }

  persistProviderTokens(session);
  const providerToken = (typeof window !== 'undefined' ? localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY) : null)
    || session.provider_token;
  const providerRefreshToken = (typeof window !== 'undefined' ? localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY) : null)
    || session.provider_refresh_token;

  if (!providerToken && !providerRefreshToken) {
    throw new GoogleCalendarError('Google Calendar chưa được kết nối.', 401, 'GOOGLE_NOT_CONNECTED', true);
  }

  const call = async (apexaAccessToken: string) => {
    const response = await fetch('/api/google-calendar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apexaAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation,
        providerToken,
        providerRefreshToken,
        ...payload,
      }),
    });
    const body = await response.json().catch(() => ({})) as CalendarApiResponse;
    return { response, body };
  };

  let { response, body } = await call(session.access_token);
  if (response.status === 401 && body.code === 'APEXA_SESSION_REQUIRED') {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      ({ response, body } = await call(data.session.access_token));
    }
  }

  if (!response.ok) {
    if (body.reconnectRequired && body.code?.startsWith('GOOGLE_') && typeof window !== 'undefined') {
      localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
      localStorage.setItem(GOOGLE_DISCONNECTED_KEY, '1');
    }
    throw new GoogleCalendarError(
      body.error || 'Google Calendar tạm thời không khả dụng.',
      response.status,
      body.code,
      body.reconnectRequired,
    );
  }

  if (body.providerToken && typeof window !== 'undefined') {
    localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, body.providerToken);
  }
  return body;
}

function requireNormalizedEvent(item: unknown) {
  const event = normalizeEvent(item);
  if (!event.id) {
    throw new GoogleCalendarError('Google Calendar returned an invalid event.', 502, 'INVALID_GOOGLE_RESPONSE');
  }
  return event;
}

export const googleCalendarService = {
  persistProviderTokens,

  async fetchEvents(): Promise<GoogleCalendarEvent[]> {
    const body = await requestCalendar('list');
    return (body.events || []).map(normalizeEvent).filter(event => event.id);
  },

  async createEvent(event: GoogleCalendarEventInput): Promise<GoogleCalendarEvent> {
    const body = await requestCalendar('create', { event });
    return requireNormalizedEvent(body.event);
  },

  async updateEvent(eventId: string, event: GoogleCalendarEventInput): Promise<GoogleCalendarEvent> {
    const body = await requestCalendar('update', { eventId, event });
    return requireNormalizedEvent(body.event);
  },

  async deleteEvent(eventId: string): Promise<void> {
    await requestCalendar('delete', { eventId });
  },
};
