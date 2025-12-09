// src/lib/calendarApi.js
/**
 * Calendar API Helpers
 *
 * This module wraps Google Calendar v3 endpoints used by the scheduler:
 * - freeBusy: to retrieve busy periods for a specific calendar and time range.
 * - events.insert: to create events for individual free slots.
 *
 * All functions expect a valid OAuth access token with the appropriate scope.
 */

/**
 * Retrieves busy periods for a given calendar on a specific day and time range,
 * using the Google Calendar freeBusy endpoint.
 *
 * Note:
 * - The current implementation builds timeMin/timeMax with a fixed -05:00 offset,
 *   which matches "America/Bogota" in many cases. Adjust if you need more dynamic
 *   time zone handling.
 *
 * @param {string} accessToken - Google OAuth access token.
 * @param {{
 *   calendarId: string;
 *   dateStr: string;       // "YYYY-MM-DD"
 *   startTimeStr: string;  // "HH:MM"
 *   endTimeStr: string;    // "HH:MM"
 *   timeZone: string;      // e.g. "America/Bogota"
 * }} params
 * @returns {Promise<Array<{ start: Date; end: Date }>>}
 *   An array of busy intervals as Date objects.
 * @throws {Error} If the freeBusy API request fails.
 */
export async function getBusyPeriodsForDay(
  accessToken,
  { calendarId, dateStr, startTimeStr, endTimeStr, timeZone }
) {
  // Aquí asumo zona -05:00 como en tu Python; puedes ajustarlo si necesitas.
  const timeMin = `${dateStr}T${startTimeStr}:00-05:00`;
  const timeMax = `${dateStr}T${endTimeStr}:00-05:00`;

  const body = {
    timeMin,
    timeMax,
    timeZone,
    items: [{ id: calendarId }],
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Error en freeBusy:", txt);
    throw new Error("Error al consultar la disponibilidad en Google Calendar.");
  }

  const data = await res.json();
  const cal = data.calendars?.[calendarId];
  const busy = cal?.busy || [];

  return busy.map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));
}
/**
 * Creates a single event in Google Calendar for a given time slot.
 *
 * @param {string} accessToken - Google OAuth access token.
 * @param {{
 *   calendarId: string;
 *   summary: string;
 *   start: Date;
 *   end: Date;
 *   timeZone: string;
 *   colorId?: string | number;
 * }} params
 * @returns {Promise<any>} The created event object as returned by Google Calendar.
 * @throws {Error} If the event creation API request fails.
 */
// Crea un evento en Calendar para un slot
export async function createEvent(
  accessToken,
  { calendarId, summary, start, end, timeZone, colorId }
) {
  const body = {
    summary,
    start: {
      dateTime: start.toISOString(),
      timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone,
    },
  };

  if (colorId) {
    body.colorId = String(colorId);
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Error al crear evento:", txt);
    throw new Error("Error al crear un evento en Google Calendar.");
  }

  const event = await res.json();
  console.log(
    `Evento creado ${start.toISOString()} - ${end.toISOString()}: ${event.htmlLink}`
  );
  return event;
}
