// src/options/options.js
/**
 * Options Page Script
 *
 * This module manages:
 * - Loading previously saved configuration values from chrome.storage.local.
 * - Populating the options UI with those values.
 * - Saving new configuration values entered by the user.
 * - Resetting the UI to default values.
 *
 * It interacts with config.js, which applies persistence and maintains defaults.
 */
import { saveConfig, loadConfig } from "../storage/config.js";
/**
 * Field mapping for clean iteration:
 * Keys correspond to config object properties.
 * Values correspond to input element IDs.
 */
const fields = {
  calendarId: "calendarId",
  slotMinutes: "slotMinutes",
  timezone: "timezone",
  clientId: "clientId",
  clientSecret: "clientSecret",
};
/**
 * Updates the status message displayed at the bottom of the options page.
 *
 * @param {string} msg - Status message to display.
 */
function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
}
/**
 * Loads configuration values from storage and populates the options UI.
 * If a setting is missing, applies default values for essential fields.
 */
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

/**
 * Reads values from all inputs and persists them using saveConfig().
 * Displays a confirmation message when completed.
 */
async function save() {
  const newConfig = {};

  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (input) newConfig[key] = input.value;
  });

  await saveConfig(newConfig);
  setStatus("Configuración guardada ✔️");
}

/**
 * Resets UI fields to default values.
 * Does NOT automatically persist changes — user must click "Guardar".
 */
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

/**
 * Initializes the page:
 * - Loads existing configuration.
 * - Attaches event listeners for Save and Reset buttons.
 */
document.addEventListener("DOMContentLoaded", () => {
  load();

  document.getElementById("save").addEventListener("click", save);
  document.getElementById("reset").addEventListener("click", reset);
});
