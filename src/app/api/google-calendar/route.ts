import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, pruneRateLimitBuckets } from '@/lib/rateLimit';

type CalendarOperation = 'list' | 'create' | 'update' | 'delete';

interface CalendarRequestBody {
  operation?: CalendarOperation;
  providerToken?: string;
  providerRefreshToken?: string;
  eventId?: string;
  event?: {
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string; timeZone?: string };
    end?: { dateTime?: string; date?: string; timeZone?: string };
    colorId?: string;
  };
}

class CalendarHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly reconnectRequired = false,
  ) {
    super(message);
  }
}

const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function requireUser(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new CalendarHttpError(401, 'Authentication required.', 'APEXA_SESSION_REQUIRED');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new Error('Supabase authentication is not configured.');
  }

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const accessToken = authorization.slice(7).trim();
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new CalendarHttpError(401, 'Your Costack session is invalid or expired.', 'APEXA_SESSION_REQUIRED');
  }
}

function validateEvent(event: CalendarRequestBody['event']) {
  if (!event || typeof event.summary !== 'string' || !event.summary.trim()) {
    throw new CalendarHttpError(400, 'Event title is required.', 'INVALID_EVENT');
  }
  if (event.summary.length > 1024 || (event.description?.length || 0) > 8192) {
    throw new CalendarHttpError(400, 'Event content is too long.', 'INVALID_EVENT');
  }
  if ((!event.start?.dateTime && !event.start?.date) || (!event.end?.dateTime && !event.end?.date)) {
    throw new CalendarHttpError(400, 'Event start and end times are required.', 'INVALID_EVENT');
  }
  return event;
}

async function refreshProviderToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new CalendarHttpError(
      401,
      'Google access expired and automatic recovery is not configured.',
      'GOOGLE_REFRESH_NOT_CONFIGURED',
      true,
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const shouldReconnect = response.status === 400 && data.error === 'invalid_grant';
    const isConfigurationError = data.error === 'invalid_client' || data.error === 'unauthorized_client';
    throw new CalendarHttpError(
      shouldReconnect ? 401 : isConfigurationError ? 500 : 502,
      data.error_description || (shouldReconnect
        ? 'Google authorization expired. Please reconnect Google Calendar.'
        : 'Google token recovery is temporarily unavailable.'),
      shouldReconnect
        ? 'GOOGLE_REFRESH_REVOKED'
        : isConfigurationError ? 'GOOGLE_REFRESH_CONFIGURATION_ERROR' : 'GOOGLE_REFRESH_TEMPORARY_FAILURE',
      shouldReconnect,
    );
  }
  return String(data.access_token);
}

async function googleRequest(
  url: string,
  init: RequestInit,
  providerToken: string | undefined,
  providerRefreshToken: string | undefined,
) {
  let activeToken = providerToken;
  if (!activeToken) {
    if (!providerRefreshToken) {
      throw new CalendarHttpError(401, 'Google Calendar is not connected.', 'GOOGLE_NOT_CONNECTED', true);
    }
    activeToken = await refreshProviderToken(providerRefreshToken);
  }

  const call = (token: string) => fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  let response = await call(activeToken);
  if (response.status === 401 && providerRefreshToken) {
    activeToken = await refreshProviderToken(providerRefreshToken);
    response = await call(activeToken);
  }

  return { response, providerToken: activeToken };
}

async function readGoogleError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data?.error?.message || `Google Calendar request failed (${response.status}).`;
}

export async function POST(request: Request) {
  try {
    pruneRateLimitBuckets();
    const rateLimit = checkRateLimit(request, 'google-calendar', 40, 60_000);
    if (!rateLimit.allowed) {
      throw new CalendarHttpError(
        429,
        'Quá nhiều yêu cầu đến Google Calendar. Vui lòng thử lại sau giây lát.',
        'RATE_LIMITED',
      );
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 256_000) {
      throw new CalendarHttpError(413, 'Nội dung yêu cầu vượt quá giới hạn 256KB.', 'PAYLOAD_TOO_LARGE');
    }

    await requireUser(request);
    const body = await request.json() as CalendarRequestBody;
    const { operation, providerToken, providerRefreshToken } = body;
    if (!operation || !['list', 'create', 'update', 'delete'].includes(operation)) {
      throw new CalendarHttpError(400, 'Unknown calendar operation.', 'INVALID_OPERATION');
    }

    let url = GOOGLE_CALENDAR_BASE;
    let init: RequestInit = { method: 'GET' };

    if (operation === 'list') {
      const timeMin = new Date();
      const timeMax = new Date();
      timeMin.setFullYear(timeMin.getFullYear() - 1);
      timeMax.setFullYear(timeMax.getFullYear() + 2);
      const query = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      });
      url = `${url}?${query.toString()}`;
    } else {
      if (operation === 'update' || operation === 'delete') {
        if (!body.eventId || typeof body.eventId !== 'string' || body.eventId.length > 512 || !/^[a-zA-Z0-9_\-.:]+$/.test(body.eventId)) {
          throw new CalendarHttpError(400, 'Event id is invalid or required.', 'INVALID_EVENT_ID');
        }
        url = `${url}/${encodeURIComponent(body.eventId)}`;
      }

      if (operation === 'create' || operation === 'update') {
        const event = validateEvent(body.event);
        init = {
          method: operation === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        };
      } else {
        init = { method: 'DELETE' };
      }
    }

    const result = await googleRequest(url, init, providerToken, providerRefreshToken);
    if (!result.response.ok) {
      if (operation === 'delete' && (result.response.status === 404 || result.response.status === 410)) {
        return Response.json({ deleted: true, providerToken: result.providerToken });
      }
      const message = await readGoogleError(result.response);
      const reconnectRequired = result.response.status === 401;
      throw new CalendarHttpError(
        result.response.status,
        message,
        'GOOGLE_CALENDAR_REQUEST_FAILED',
        reconnectRequired,
      );
    }

    if (operation === 'delete') {
      return Response.json({ deleted: true, providerToken: result.providerToken });
    }
    const data = await result.response.json();
    return Response.json(operation === 'list'
      ? { events: data.items || [], providerToken: result.providerToken }
      : { event: data, providerToken: result.providerToken });
  } catch (error) {
    const status = error instanceof CalendarHttpError ? error.status : 500;
    if (status >= 500) console.error('[Google Calendar API]', error);
    return Response.json({
      error: status >= 500
        ? 'Google Calendar tạm thời không khả dụng. Vui lòng thử lại.'
        : error instanceof Error ? error.message : 'Google Calendar request failed.',
      code: error instanceof CalendarHttpError ? error.code : 'GOOGLE_CALENDAR_INTERNAL_ERROR',
      reconnectRequired: error instanceof CalendarHttpError ? error.reconnectRequired : false,
    }, { status });
  }
}
