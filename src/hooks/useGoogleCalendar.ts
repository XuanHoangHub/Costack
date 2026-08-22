/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { googleCalendarService, GoogleCalendarEvent } from '../services/googleCalendar';

interface UseGoogleCalendarOptions {
  pollingIntervalMs?: number;
  onSuccessFetch?: (events: GoogleCalendarEvent[]) => void;
  onErrorFetch?: (error: Error | unknown) => void;
}

/**
 * Custom React Hook to periodically fetch and manage Google Calendar events.
 */
export function useGoogleCalendar(
  accessToken: string | null,
  options: UseGoogleCalendarOptions = {}
) {
  const { onSuccessFetch, onErrorFetch } = options;
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const onSuccessRef = useRef(onSuccessFetch);
  const onErrorRef = useRef(onErrorFetch);

  // Keep callback refs updated to avoid retriggering effects
  useEffect(() => {
    onSuccessRef.current = onSuccessFetch;
    onErrorRef.current = onErrorFetch;
  }, [onSuccessFetch, onErrorFetch]);

const fetchEvents = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const fetched = await googleCalendarService.fetchEvents();
      setEvents(fetched);
      setError(null);
      if (onSuccessRef.current) {
        onSuccessRef.current(fetched);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Periodic polling setting
  useEffect(() => {
    // Store previous accessToken to avoid setting state during render
    const prevToken = accessToken;
    const timeoutId = setTimeout(() => {
      if (!prevToken) {
        setEvents([]);
        return;
      }
      fetchEvents();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [accessToken, fetchEvents]);

  const createEvent = useCallback(
    async (eventData: {
      summary: string;
      description: string;
      start: { dateTime: string; timeZone?: string } | { date: string };
      end: { dateTime: string; timeZone?: string } | { date: string };
    }) => {
      if (!accessToken) {
        throw new Error('Google Calendar access token is not available');
      }
      const newEvent = await googleCalendarService.createEvent(eventData);
      setEvents((prev) => [...prev, newEvent]);
      return newEvent;
    },
    [accessToken]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!accessToken) {
        throw new Error('Google Calendar access token is not available');
      }
      await googleCalendarService.deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      return true;
    },
    [accessToken]
  );

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    createEvent,
    deleteEvent,
  };
}
