// src/background/schedulerBackground.js
/**
 * Scheduler Background Script
 *
 * This module runs in the background context and:
 * - Listens for messages from the popup or other parts of the extension.
 * - Handles Google authentication checks and auth flow triggers.
 * - Executes the scheduling engine (runScheduler), which:
 *   - Validates user input.
 *   - Loads configuration from storage.
 *   - Fetches busy periods from Google Calendar.
 *   - Generates time slots and filters free ones.
 *   - Creates events for each available slot.
 */
import { isAuthenticated, startAuthFlow, getAccessToken } from "../lib/auth.js";
import { loadConfig } from "../storage/config.js";
import {
  createTimeSlots,
  filterFreeSlots,
  maxTimeStr,
  minTimeStr,
} from "../lib/scheduler.js";
import {
  getBusyPeriodsForDay,
  createEvent,
} from "../lib/calendarApi.js";

/**
 * Chrome runtime message listener.
 *
 * Supported message types:
 * - "CHECK_AUTH": verifies whether the user has a valid auth session.
 * - "AUTH_GOOGLE": starts the Google OAuth flow.
 * - "RUN_SCHEDULER": triggers the scheduling logic with a given payload.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_AUTH") {
    (async () => {
      try {
        const ok = await isAuthenticated();
        sendResponse({ isAuthenticated: ok });
      } catch (err) {
        console.error("Error en CHECK_AUTH:", err);
        sendResponse({ isAuthenticated: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === "AUTH_GOOGLE") {
    (async () => {
      try {
        await startAuthFlow();
        sendResponse({ success: true });
      } catch (err) {
        console.error("Error en AUTH_GOOGLE:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === "RUN_SCHEDULER") {
    (async () => {
      try {
        const { payload } = message;
        const result = await runScheduler(payload);
        sendResponse({ success: true, ...result });
      } catch (err) {
        console.error("Error en RUN_SCHEDULER:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Mensaje no reconocido
  sendResponse({ success: false, error: "Tipo de mensaje no soportado." });
  return true;
});

// ---------------- LÓGICA PRINCIPAL DEL SCHEDULER ----------------
/**
 * Executes the main scheduling logic.
 *
 * Input payload is expected to contain:
 * - eventName: string                     // Title for the events to be created
 * - eventColor: string | number | null    // Google Calendar colorId
 * - dateStart: string                     // Start date (YYYY-MM-DD)
 * - dateEnd: string                       // End date (YYYY-MM-DD)
 * - workdayStart: string                  // Workday start (HH:MM)
 * - workdayEnd: string                    // Workday end (HH:MM)
 * - taskStart: string                     // Task time range start (HH:MM)
 * - taskEnd: string                       // Task time range end (HH:MM)
 *
 * Behavior:
 * - For each date in [dateStart, dateEnd]:
 *   - Calculates the effective day range (taking into account workday and task window).
 *   - Generates time slots for that range (based on slotMinutes from config).
 *   - Fetches busy periods from Google Calendar for that day.
 *   - Filters out slots that intersect with busy periods.
 *   - Creates calendar events for each remaining free slot.
 *
 * @param {Object} payload - Scheduler configuration coming from the popup UI.
 * @returns {Promise<{ message: string; totalSlots: number; totalCreated: number }>}
 *   Summary of how many slots were generated and how many events were created.
 * @throws {Error} If any of the required payload fields are missing or invalid.
 */
async function runScheduler(payload) {
  // 1. Validar payload básico que viene del popup
  const {
    eventName,
    eventColor,
    dateStart,
    dateEnd,
    workdayStart,
    workdayEnd,
    taskStart,
    taskEnd,
  } = payload || {};

  if (!eventName) throw new Error("Falta el nombre del evento.");
  if (!dateStart || !dateEnd) throw new Error("Debes indicar fecha inicio y fin.");
  if (!workdayStart || !workdayEnd) throw new Error("Debes indicar el horario laboral.");
  if (!taskStart || !taskEnd) throw new Error("Debes indicar el rango de la tarea.");

  // 2. Config global desde Options (calendarId, slotMinutes, timezone)
  const cfg = await loadConfig();
  const calendarId = cfg.calendarId || "primary";
  const slotMinutes = parseInt(cfg.slotMinutes || "30", 10);
  const timeZone = cfg.timezone || "America/Bogota";

  // 3. Token de acceso
  const accessToken = await getAccessToken();

  // 4. Loop de fechas (inspirado en tu Python)
  const startDate = new Date(dateStart); // 'YYYY-MM-DD'
  const endDate = new Date(dateEnd);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Formato de fecha inválido.");
  }

  if (endDate < startDate) {
    throw new Error("La fecha fin no puede ser menor a la fecha inicio.");
  }

  let current = new Date(startDate.getTime());
  let totalSlots = 0;
  let totalCreated = 0;

  while (current <= endDate) {
    const dateStr = current.toISOString().slice(0, 10); // YYYY-MM-DD
    console.log(`Procesando día ${dateStr}...`);

    let dayStartStr;
    let dayEndStr;

    const sameDay = startDate.toDateString() === endDate.toDateString();
    const isFirst = current.toDateString() === startDate.toDateString();
    const isLast = current.toDateString() === endDate.toDateString();

    if (sameDay) {
      dayStartStr = maxTimeStr(workdayStart, taskStart);
      dayEndStr = minTimeStr(workdayEnd, taskEnd);
    } else if (isFirst) {
      dayStartStr = maxTimeStr(workdayStart, taskStart);
      dayEndStr = workdayEnd;
    } else if (isLast) {
      dayStartStr = workdayStart;
      dayEndStr = minTimeStr(workdayEnd, taskEnd);
    } else {
      dayStartStr = workdayStart;
      dayEndStr = workdayEnd;
    }

    // Validar rango horario del día
    if (!isValidRange(dayStartStr, dayEndStr)) {
      console.log(
        `Saltando día ${dateStr} porque el rango calculado ${dayStartStr}-${dayEndStr} no es válido.`
      );
      current.setDate(current.getDate() + 1);
      continue;
    }

    // 5. Crear slots del día
    const daySlots = createTimeSlots(dateStr, dayStartStr, dayEndStr, slotMinutes);
    totalSlots += daySlots.length;

    // 6. Consultar busy en Google
    const busyPeriods = await getBusyPeriodsForDay(accessToken, {
      calendarId,
      dateStr,
      startTimeStr: dayStartStr,
      endTimeStr: dayEndStr,
      timeZone,
    });

    // 7. Filtrar slots libres
    const freeSlots = filterFreeSlots(daySlots, busyPeriods);
    console.log(
      `Bloques generados: ${daySlots.length} | Bloques libres: ${freeSlots.length}`
    );

    // 8. Crear eventos por cada slot libre
    for (const slot of freeSlots) {
      await createEvent(accessToken, {
        calendarId,
        summary: eventName,
        start: slot.start,
        end: slot.end,
        timeZone,
        colorId: eventColor,
      });
      totalCreated += 1;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    message: `Bloques totales: ${totalSlots}. Eventos creados: ${totalCreated}.`,
    totalSlots,
    totalCreated,
  };
}
/**
 * Validates that a time range expressed as HH:MM strings is strictly increasing.
 *
 * @param {string} startStr - Start time in HH:MM format.
 * @param {string} endStr - End time in HH:MM format.
 * @returns {boolean} True if the end time is later than the start time, false otherwise.
 */
function isValidRange(startStr, endStr) {
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return end > start;
}
