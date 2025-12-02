// Helpers UI -------------------------------------

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function disableRun(disabled) {
  document.getElementById("btnRunScheduler").disabled = disabled;
}

// Cargar y guardar datos del formulario -----------

async function loadFormValues() {
  return new Promise(resolve => {
    chrome.storage.local.get("popupForm", data => {
      const form = data.popupForm || {};

      document.getElementById("eventName").value = form.eventName || "";
      document.getElementById("eventColor").value = form.eventColor || "1";
      document.getElementById("dateStart").value = form.dateStart || "";
      document.getElementById("dateEnd").value = form.dateEnd || "";
      document.getElementById("workdayStart").value = form.workdayStart || "07:00";
      document.getElementById("workdayEnd").value = form.workdayEnd || "17:00";
      document.getElementById("taskStart").value = form.taskStart || "";
      document.getElementById("taskEnd").value = form.taskEnd || "";

      resolve();
    });
  });
}

function saveFormValues() {
  const popupForm = {
    eventName: document.getElementById("eventName").value,
    eventColor: document.getElementById("eventColor").value,
    dateStart: document.getElementById("dateStart").value,
    dateEnd: document.getElementById("dateEnd").value,
    workdayStart: document.getElementById("workdayStart").value,
    workdayEnd: document.getElementById("workdayEnd").value,
    taskStart: document.getElementById("taskStart").value,
    taskEnd: document.getElementById("taskEnd").value,
  };

  chrome.storage.local.set({ popupForm });
}

// Main --------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const btnConnect = document.getElementById("btnConnect");
  const btnRun = document.getElementById("btnRunScheduler");

  // Cargar valores previos
  await loadFormValues();

  // Guardar automáticamente al cambiar
  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("change", saveFormValues);
  });

  // Verificar si ya está autenticado
  setStatus("Verificando sesión...");
  disableRun(true);

  chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, response => {
    if (response?.isAuthenticated) {
      setStatus("Conectado a Google Calendar");
      disableRun(false);
    } else {
      setStatus("Conéctate a Google para usar el scheduler.");
      disableRun(true);
    }
  });

  // Conexión con Google
  btnConnect.addEventListener("click", () => {
    setStatus("Conectando...");
    disableRun(true);

    chrome.runtime.sendMessage({ type: "AUTH_GOOGLE" }, response => {
      if (response?.success) {
        setStatus("Conectado correctamente ✔️");
        disableRun(false);
      } else {
        setStatus("Error: " + response?.error);
      }
    });
  });

  // Ejecutar Scheduler
  btnRun.addEventListener("click", () => {
    setStatus("Generando bloques...");

    const payload = {
      eventName: document.getElementById("eventName").value,
      eventColor: document.getElementById("eventColor").value,
      dateStart: document.getElementById("dateStart").value,
      dateEnd: document.getElementById("dateEnd").value,
      workdayStart: document.getElementById("workdayStart").value,
      workdayEnd: document.getElementById("workdayEnd").value,
      taskStart: document.getElementById("taskStart").value,
      taskEnd: document.getElementById("taskEnd").value,
    };

    // Enviar al background
    chrome.runtime.sendMessage(
      { type: "RUN_SCHEDULER", payload },
      (response) => {
        if (response?.success) {
          setStatus("Bloques creados ✔️ " + response.message);
        } else {
          setStatus("Error: " + response?.error);
        }
      }
    );
  });
});
