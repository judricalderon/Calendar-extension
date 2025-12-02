// src/popup/popup.js

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function disableRun(disabled) {
  document.getElementById("btnRunScheduler").disabled = disabled;
}

// Cargar y guardar datos del formulario -------------------

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

// Util para partir YYYY-MM-DDTHH:MM en partes
function splitDateTime(value) {
  if (!value || !value.includes("T")) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date, time };
}

// Main ----------------------------------------------------

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
