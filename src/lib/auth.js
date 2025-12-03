// src/lib/auth.js
import { loadConfig } from "../storage/config.js";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_KEY = "googleTokens";

// 👉 PON AQUÍ TUS CREDENCIALES POR DEFECTO (opción A)
const DEFAULT_CLIENT_ID =
  "client.apps.googleusercontent.com";
const DEFAULT_CLIENT_SECRET =
  "codedasdasdasdasd";

// -------------------- helpers storage --------------------
function saveTokens(tokens) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [TOKEN_KEY]: tokens }, () => resolve(true));
  });
}

function loadTokens() {
  return new Promise(resolve => {
    chrome.storage.local.get(TOKEN_KEY, data => {
      resolve(data[TOKEN_KEY] || null);
    });
  });
}

export function clearTokens() {
  return new Promise(resolve => {
    chrome.storage.local.remove(TOKEN_KEY, () => resolve(true));
  });
}

// -------------------- helpers tiempo --------------------
function isTokenStillValid(tokens) {
  if (!tokens || !tokens.access_token || !tokens.expires_at) return false;
  // 60s de margen
  const now = Date.now();
  return now < (tokens.expires_at - 60 * 1000);
}

// -------------------- PKCE helpers --------------------
function generateRandomString(length = 64) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  randomValues.forEach(v => {
    result += charset[v % charset.length];
  });
  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64urlencode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
}

// -------------------- helpers clientId / clientSecret --------------------

async function getClientId() {
  const cfg = await loadConfig();

  // Si el usuario configuró uno en options, lo usa.
  // Si no, usa el de defecto (opción A).
  if (cfg.clientId) {
    return cfg.clientId;
  }

  if (DEFAULT_CLIENT_ID && DEFAULT_CLIENT_ID !== "TU_CLIENT_ID.apps.googleusercontent.com") {
    return DEFAULT_CLIENT_ID;
  }

  // fallback al manifest por si lo tienes también ahí
  const manifest = chrome.runtime.getManifest();
  const manifestClientId = manifest.oauth2?.client_id;
  if (manifestClientId) {
    return manifestClientId;
  }

  throw new Error("Client ID de Google no configurado.");
}

async function getClientSecret() {
  const cfg = await loadConfig();

  // Permite sobreescribir en options si quieres
  if (cfg.clientSecret) {
    return cfg.clientSecret;
  }

  if (
    DEFAULT_CLIENT_SECRET &&
    DEFAULT_CLIENT_SECRET !== "TU_CLIENT_SECRET_AQUI"
  ) {
    return DEFAULT_CLIENT_SECRET;
  }

  throw new Error("Client Secret de Google no configurado.");
}

// -------------------- redirect --------------------

async function getRedirectUri() {
  // Chrome genera algo como: https://<extension-id>.chromiumapp.org/
  return chrome.identity.getRedirectURL();
}

// -------------------- intercambio de tokens --------------------

async function exchangeCodeForTokens({ code, clientId, redirectUri, codeVerifier }) {
  const clientSecret = await getClientSecret();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Error al intercambiar code por tokens:", txt);
    throw new Error("No se pudo obtener el token de Google.");
  }

  const data = await res.json();
  const now = Date.now();
  const expiresAt = now + (data.expires_in || 3600) * 1000;

  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token, // puede venir undefined
    expires_at: expiresAt
  };

  await saveTokens(tokens);
  return tokens;
}

async function refreshAccessToken(tokens, clientId) {
  if (!tokens.refresh_token) {
    throw new Error("No hay refresh_token disponible. Reautentica con Google.");
  }

  const clientSecret = await getClientSecret();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Error al refrescar token:", txt);
    throw new Error("Error al refrescar el token de Google.");
  }

  const data = await res.json();
  const now = Date.now();
  const expiresAt = now + (data.expires_in || 3600) * 1000;

  const newTokens = {
    access_token: data.access_token,
    // Mantener el refresh_token existente si no viene uno nuevo
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: expiresAt
  };

  await saveTokens(newTokens);
  return newTokens;
}

// -------------------- API pública --------------------

// Para el CHECK_AUTH del popup
export async function isAuthenticated() {
  const tokens = await loadTokens();
  return isTokenStillValid(tokens);
}

// Para cuando el background necesite un access_token válido
export async function getAccessToken() {
  const clientId = await getClientId();
  let tokens = await loadTokens();

  if (isTokenStillValid(tokens)) {
    return tokens.access_token;
  }

  // Intentar refrescar si hay refresh_token
  if (tokens && tokens.refresh_token) {
    try {
      tokens = await refreshAccessToken(tokens, clientId);
      return tokens.access_token;
    } catch (err) {
      console.warn("No se pudo refrescar el token, se requiere nueva autenticación:", err);
    }
  }

  // Si llegamos aquí, toca hacer flujo completo de Auth
  tokens = await startAuthFlowInternal(clientId);
  return tokens.access_token;
}

// Para el botón "Conectar con Google" del popup
export async function startAuthFlow() {
  const clientId = await getClientId();
  await startAuthFlowInternal(clientId);
  return true;
}

// -------------------- núcleo del auth flow --------------------
async function startAuthFlowInternal(clientId) {
  const redirectUri = await getRedirectUri();

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // forza pedir permisos otra vez p/refreshtoken
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const authUrlStr = authUrl.toString();

  const redirectResponse = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrlStr,
        interactive: true
      },
      redirectUrl => {
        if (chrome.runtime.lastError) {
          console.error("launchWebAuthFlow error:", chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!redirectUrl) {
          reject(new Error("No se recibió redirectUrl de Google."));
          return;
        }
        resolve(redirectUrl);
      }
    );
  });

  // redirectResponse tendrá algo como: https://<id>.chromiumapp.org/?code=XXX&scope=...
  const url = new URL(redirectResponse);
  const code = url.searchParams.get("code");
  if (!code) {
    throw new Error("No se recibió 'code' en la respuesta de Google.");
  }

  const tokens = await exchangeCodeForTokens({
    code,
    clientId,
    redirectUri,
    codeVerifier
  });

  return tokens;
}
