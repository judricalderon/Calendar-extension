// src/options/options.js
import { saveConfig, loadConfig } from "../storage/config.js";

const fields = {
  calendarId: "calendarId",
  slotMinutes: "slotMinutes",
  timezone: "timezone",
  clientId: "clientId",
  clientSecret: "clientSecret",
};

function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
}

async function load() {
  const cfg = await loadConfig();

  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (!input) return;

    if (cfg[key] !== undefined) {
      input.value = cfg[key];
    } else {
      // valores por defecto
      if (key === "calendarId") input.value = "primary";
      if (key === "slotMinutes") input.value = "30";
      if (key === "timezone") input.value = "America/Bogota";
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
  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (!input) return;

    if (key === "calendarId") input.value = "primary";
    else if (key === "slotMinutes") input.value = "30";
    else if (key === "timezone") input.value = "America/Bogota";
    else input.value = "";
  });
  setStatus("Valores restablecidos (no olvides guardar).");
}

document.addEventListener("DOMContentLoaded", () => {
  load();

  document.getElementById("save").addEventListener("click", save);
  document.getElementById("reset").addEventListener("click", reset);
});
