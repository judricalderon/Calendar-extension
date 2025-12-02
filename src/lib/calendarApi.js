// src/lib/calendarApi.js

// Obtiene los periodos ocupados (busy) para un día
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
