// src/lib/scheduler.js
/**
 * Scheduler Utility Functions
 *
 * This module provides helpers for:
 * - Time comparison and normalization
 * - Generating time slots within a specified range
 * - Detecting overlapping intervals
 * - Filtering available (free) slots based on busy periods
 *
 * Used by the scheduling engine to determine when events can be created.
 */

/**
 * Converts a "HH:MM" time string into total minutes.
 *
 * @param {string} hhmm - Time string in "HH:MM" format.
 * @returns {number} Total minutes since 00:00.
 */
// Convierte 'HH:MM' a minutos
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns the greater of two time strings (HH:MM), comparing them as minutes.
 *
 * @param {string} t1
 * @param {string} t2
 * @returns {string} The time string that represents the later time.
 */
export function maxTimeStr(t1, t2) {
  const m1 = toMinutes(t1);
  const m2 = toMinutes(t2);
  return (m1 >= m2 ? t1 : t2);
}

/**
 * Returns the smaller of two time strings (HH:MM), comparing them as minutes.
 *
 * @param {string} t1
 * @param {string} t2
 * @returns {string} The time string that represents the earlier time.
 */
export function minTimeStr(t1, t2) {
  const m1 = toMinutes(t1);
  const m2 = toMinutes(t2);
  return (m1 <= m2 ? t1 : t2);
}

/**
 * Generates a list of consecutive time slots within a given time range.
 *
 * @param {string} dateStr - Date in "YYYY-MM-DD" format.
 * @param {string} startStr - Start time "HH:MM".
 * @param {string} endStr - End time "HH:MM".
 * @param {number} [durationMinutes=30] - Slot duration in minutes.
 * @returns {Array<{ start: Date, end: Date }>}
 *   An array of slot objects, each with start and end Date instances.
 */
export function createTimeSlots(dateStr, startStr, endStr, durationMinutes = 30) {
  // dateStr: 'YYYY-MM-DD'
  // startStr/endStr: 'HH:MM'
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);

  let current = new Date(`${dateStr}T${pad(sh)}:${pad(sm)}:00`);
  const end = new Date(`${dateStr}T${pad(eh)}:${pad(em)}:00`);

  const slots = [];
  const deltaMs = durationMinutes * 60 * 1000;

  while (current < end) {
    const slotEnd = new Date(current.getTime() + deltaMs);
    if (slotEnd > end) break;

    slots.push({
      start: new Date(current.getTime()),
      end: new Date(slotEnd.getTime()),
    });

    current = slotEnd;
  }

  return slots;
}

/**
 * Zero-pads a numeric value for time formatting.
 *
 * @param {number} n
 * @returns {string} Padded string (e.g., 9 → "09").
 */
function pad(n) {
  return n.toString().padStart(2, "0");
}

/**
 * Determines whether two time intervals overlap.
 *
 * @param {Date} aStart
 * @param {Date} aEnd
 * @param {Date} bStart
 * @param {Date} bEnd
 * @returns {boolean} True if the intervals overlap.
 */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Filters out slots that overlap with any busy period.
 *
 * @param {Array<{ start: Date, end: Date }>} slots
 * @param {Array<{ start: Date, end: Date }>} busyPeriods
 * @returns {Array<{ start: Date, end: Date }>}
 *   A list of slots that do NOT overlap with busy periods.
 */
export function filterFreeSlots(slots, busyPeriods) {
  const free = [];

  for (const slot of slots) {
    const { start, end } = slot;
    const conflict = busyPeriods.some(({ start: bs, end: be }) =>
      overlaps(start, end, bs, be)
    );
    if (!conflict) {
      free.push(slot);
    }
  }

  return free;
}
