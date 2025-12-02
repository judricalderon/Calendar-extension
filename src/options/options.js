// src/options/options.js
import { saveConfig, loadConfig } from "../storage/config.js";

const fields = {
  clientId: "clientId",
  clientSecret: "clientSecret",
  calendarId: "calendarId",
  dateStart: "dateStart",
  dateEnd: "dateEnd",
  workdayStart: "workdayStart",
  workdayEnd: "workdayEnd",
  taskStart: "taskStart",
  taskEnd: "taskEnd",
  eventName: "eventName",
  slotMinutes: "slotMinutes",
  eventColor: "eventColor"
};

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

async function load() {
  const cfg = await loadConfig();
  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (input && cfg[key] !== undefined) {
      input.value = cfg[key];
    }
  });

  setStatus("Configuración cargada.");
}

async function save() {
  const newConfig = {};

  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (input) newConfig[key] = input.value;
  });

  await saveConfig(newConfig);
  setStatus("Configuración guardada ✔️");
}

function reset() {
  Object.values(fields).forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
  setStatus("Valores restablecidos.");
}

document.addEventListener("DOMContentLoaded", () => {
  load();

  document.getElementById("save").addEventListener("click", save);
  document.getElementById("reset").addEventListener("click", reset);
});
