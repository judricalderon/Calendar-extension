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

function isValidRange(startStr, endStr) {
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return end > start;
}
