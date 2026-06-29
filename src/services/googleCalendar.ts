/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  color?: string;
  htmlLink?: string;
  isGoogleEvent: boolean;
}

/**
 * Service layer for interacting with the Google Calendar API.
 */
export const googleCalendarService = {
  /**
   * Fetches upcoming calendar events from the primary calendar.
   */
  async fetchUpcomingEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
    try {
      const now = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${now}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.items) return [];

      interface GoogleCalendarItem {
  id: string;
   summary?: string;
   description?: string;
   start?: { dateTime?: string; date?: string; timeZone?: string };
   end?: { dateTime?: string; date?: string; timeZone?: string };
   htmlLink?: string;
 }

   return data.items.map((item: GoogleCalendarItem) => ({
        id: item.id,
        summary: item.summary || '(Không có tiêu đề)',
        description: item.description || '',
        start: item.start || {},
        end: item.end || {},
        color: '#4285F4', // Default blue
        htmlLink: item.htmlLink,
        isGoogleEvent: true,
      }));
    } catch (err) {
      console.error('googleCalendarService.fetchUpcomingEvents error:', err);
      throw err;
    }
  },

  /**
   * Creates a new calendar event.
   */
  async createEvent(
    accessToken: string,
    event: {
      summary: string;
      description: string;
      start: { dateTime: string; timeZone?: string } | { date: string };
      end: { dateTime: string; timeZone?: string } | { date: string };
    }
  ): Promise<GoogleCalendarEvent> {
    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        throw new Error(`Failed to create event: ${res.statusText}`);
      }

      const item = await res.json();
      return {
        id: item.id,
        summary: item.summary || '(Không có tiêu đề)',
        description: item.description || '',
        start: item.start || {},
        end: item.end || {},
        color: '#4285F4',
        htmlLink: item.htmlLink,
        isGoogleEvent: true,
      };
    } catch (err) {
      console.error('googleCalendarService.createEvent error:', err);
      throw err;
    }
  },

  /**
   * Deletes a calendar event.
   */
  async deleteEvent(accessToken: string, eventId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to delete event: ${res.statusText}`);
      }

      return true;
    } catch (err) {
      console.error('googleCalendarService.deleteEvent error:', err);
      throw err;
    }
  },
};
