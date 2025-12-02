// src/background/background.js
import { isAuthenticated, startAuthFlow } from "../lib/auth.js";

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
    return true; // indicamos que respondemos async
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
    // Aquí más adelante:
    // 1) leer config
    // 2) llamar getAccessToken()
    // 3) llamar scheduler + calendarApi
    console.log("RUN_SCHEDULER solicitado (stub)");
    sendResponse({
      success: true,
      message: "Simulación: aquí se ejecutaría el scheduler."
    });
    return true;
  }

  // Mensaje no reconocido
  sendResponse({ success: false, error: "Tipo de mensaje no soportado." });
  return true;
});
