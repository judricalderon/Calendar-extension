// src/lib/scheduler.js

// Convierte 'HH:MM' a minutos
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function maxTimeStr(t1, t2) {
  const m1 = toMinutes(t1);
  const m2 = toMinutes(t2);
  return (m1 >= m2 ? t1 : t2);
}

export function minTimeStr(t1, t2) {
  const m1 = toMinutes(t1);
  const m2 = toMinutes(t2);
  return (m1 <= m2 ? t1 : t2);
}

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

function pad(n) {
  return n.toString().padStart(2, "0");
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

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
