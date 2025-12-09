// src/popup/popup.js

/**
 * Updates the status message displayed in the popup.
 * @param {string} msg - Message to show to the user.
 */
function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

/**
 * Enables or disables the scheduler execution button.
 * @param {boolean} disabled
 */
function disableRun(disabled) {
  document.getElementById("btnRunScheduler").disabled = disabled;
}

// Cargar y guardar datos del formulario -------------------
/* ============================================================================
   Form State Persistence
   ----------------------------------------------------------------------------
   The popup stores form fields in chrome.storage.local so that the user's
   inputs persist between openings of the popup UI.
   ============================================================================ */

/**
 * Loads saved popup form values from chrome.storage.local and populates
 * the corresponding input fields.
 */
async function loadFormValues() {
  return new Promise((resolve) => {
    chrome.storage.local.get("popupForm", (data) => {
      const form = data.popupForm || {};

      document.getElementById("eventName").value = form.eventName || "";
      document.getElementById("eventColor").value = form.eventColor || "1";

      document.getElementById("taskStartDateTime").value =
        form.taskStartDateTime || "";
      document.getElementById("taskEndDateTime").value =
        form.taskEndDateTime || "";

      document.getElementById("workdayStart").value =
        form.workdayStart || "07:00";
      document.getElementById("workdayEnd").value =
        form.workdayEnd || "17:00";

      resolve();
    });
  });
}

/**
 * Saves all UI field values into chrome.storage.local to ensure
 * the popup state persists automatically.
 */
function saveFormValues() {
  const popupForm = {
    eventName: document.getElementById("eventName").value,
    eventColor: document.getElementById("eventColor").value,
    taskStartDateTime: document.getElementById("taskStartDateTime").value,
    taskEndDateTime: document.getElementById("taskEndDateTime").value,
    workdayStart: document.getElementById("workdayStart").value,
    workdayEnd: document.getElementById("workdayEnd").value,
  };

  chrome.storage.local.set({ popupForm });
}

/**
 * Splits an ISO-like datetime string (YYYY-MM-DDTHH:MM) and returns
 * separate date and time components.
 * @param {string} value
 * @returns {{ date: string, time: string }}
 */
function splitDateTime(value) {
  if (!value || !value.includes("T")) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date, time };
}

// Main ----------------------------------------------------
/* ============================================================================
   Main Popup Initialization
   ----------------------------------------------------------------------------
   Handles:
   - Loading saved values
   - Checking authentication state
   - Handling UI interactions
   - Triggering the calendar scheduler via background scripts
   ============================================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  const btnConnect = document.getElementById("btnConnect");
  const btnRun = document.getElementById("btnRunScheduler");

  // Cargar valores previos
  await loadFormValues();

  // Guardar automáticamente al cambiar
  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("change", saveFormValues);
  });

  // Verificar autenticación
  setStatus("Verificando sesión...");
  disableRun(true);

  chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (response) => {
    if (response?.isAuthenticated) {
      setStatus("Conectado a Google Calendar");
      disableRun(false);
    } else {
      setStatus("Conéctate a Google para usar el scheduler.");
      disableRun(true);
    }
  });

  // Botón conectar
  btnConnect.addEventListener("click", () => {
    setStatus("Conectando...");
    disableRun(true);

    chrome.runtime.sendMessage({ type: "AUTH_GOOGLE" }, (response) => {
      if (response?.success) {
        setStatus("Conectado correctamente ✔️");
        disableRun(false);
      } else {
        setStatus("Error: " + (response?.error || "No se pudo conectar."));
      }
    });
  });

  // Botón ejecutar scheduler
  btnRun.addEventListener("click", () => {
    setStatus("Generando bloques...");

    const eventName = document.getElementById("eventName").value;
    const eventColor = document.getElementById("eventColor").value;
    const workdayStart = document.getElementById("workdayStart").value;
    const workdayEnd = document.getElementById("workdayEnd").value;

    const startDT = document.getElementById("taskStartDateTime").value;
    const endDT = document.getElementById("taskEndDateTime").value;

    const { date: dateStart, time: taskStart } = splitDateTime(startDT);
    const { date: dateEnd, time: taskEnd } = splitDateTime(endDT);

    const payload = {
      eventName,
      eventColor,
      dateStart,
      dateEnd,
      workdayStart,
      workdayEnd,
      taskStart,
      taskEnd,
    };

    chrome.runtime.sendMessage(
      { type: "RUN_SCHEDULER", payload },
      (response) => {
        if (response?.success) {
          setStatus(response.message || "Bloques creados ✔️");
        } else {
          setStatus("Error: " + (response?.error || "No se pudo crear los bloques."));
        }
      }
    );
  });
});
