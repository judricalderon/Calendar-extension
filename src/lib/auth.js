// src/lib/auth.js
/**
 * Authentication Library (Google OAuth with PKCE)
 *
 * This module manages:
 * - Storing and loading OAuth tokens in chrome.storage.local.
 * - PKCE code verifier and code challenge generation.
 * - Exchanging authorization codes for access/refresh tokens.
 * - Refreshing access tokens using the refresh token.
 * - Launching the Google OAuth flow via chrome.identity.
 *
 * Public API:
 * - isAuthenticated(): checks if there is a valid access token.
 * - getAccessToken(): returns a valid access token (refreshing or re-authing if needed).
 * - startAuthFlow(): forces a full interactive OAuth flow.
 * - clearTokens(): removes stored tokens.
 */
import { loadConfig } from "../storage/config.js";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_KEY = "googleTokens";

/**
 * Default OAuth credentials fallback.
 * In production, these should be replaced with environment-based or configuration values,
 * and never hard-coded in public repositories.
 */
const DEFAULT_CLIENT_ID =
  "client.apps.googleusercontent.com";
const DEFAULT_CLIENT_SECRET =
  "code-secret";

// -------------------- helpers storage --------------------
/**
 * Persists tokens in chrome.storage.local.
 *
 * @param {{ access_token: string; refresh_token?: string; expires_at: number }} tokens
 * @returns {Promise<boolean>} Resolves to true when the tokens are stored.
 */
function saveTokens(tokens) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [TOKEN_KEY]: tokens }, () => resolve(true));
  });
}

/**
 * Loads tokens from chrome.storage.local.
 *
 * @returns {Promise<{ access_token: string; refresh_token?: string; expires_at: number } | null>}
 */
function loadTokens() {
  return new Promise(resolve => {
    chrome.storage.local.get(TOKEN_KEY, data => {
      resolve(data[TOKEN_KEY] || null);
    });
  });
}

/**
 * Clears any stored tokens from chrome.storage.local.
 *
 * @returns {Promise<boolean>} Resolves to true once tokens are removed.
 */
export function clearTokens() {
  return new Promise(resolve => {
    chrome.storage.local.remove(TOKEN_KEY, () => resolve(true));
  });
}

// -------------------- helpers tiempo --------------------

/**
 * Checks whether the given token object is still valid (not expired).
 * A 60-second safety margin is applied.
 *
 * @param {{ access_token?: string; expires_at?: number } | null} tokens
 * @returns {boolean} True if the token is present and not expired.
 */
function isTokenStillValid(tokens) {
  if (!tokens || !tokens.access_token || !tokens.expires_at) return false;
  // 60s de margen
  const now = Date.now();
  return now < (tokens.expires_at - 60 * 1000);
}

// -------------------- PKCE helpers --------------------
/**
 * Generates a cryptographically secure random string used as PKCE code verifier.
 *
 * @param {number} [length=64] Length of the random string.
 * @returns {string} Random URL-safe string.
 */
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

/**
 * Computes the SHA-256 digest of a plain string.
 *
 * @param {string} plain
 * @returns {Promise<ArrayBuffer>} SHA-256 digest as an ArrayBuffer.
 */
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

/**
 * Encodes an ArrayBuffer using base64 URL-safe encoding.
 *
 * @param {ArrayBuffer} buffer
 * @returns {string} Base64url-encoded string.
 */
function base64urlencode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/**
 * Creates a PKCE code challenge from a code verifier.
 *
 * @param {string} verifier
 * @returns {Promise<string>} Base64url-encoded SHA-256 hash of the verifier.
 */
async function createCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
}

// -------------------- helpers clientId / clientSecret --------------------
/**
 * Resolves the OAuth client ID to use.
 *
 * Priority:
 * 1. User-defined clientId in extension config.
 * 2. DEFAULT_CLIENT_ID constant.
 * 3. OAuth client_id defined in manifest.json (if present).
 *
 * @returns {Promise<string>} Client ID string.
 * @throws {Error} If no client ID can be resolved.
 */
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

  const manifest = chrome.runtime.getManifest();
  const manifestClientId = manifest.oauth2?.client_id;
  if (manifestClientId) {
    return manifestClientId;
  }

  throw new Error("Client ID de Google no configurado.");
}
/**
 * Resolves the OAuth client secret to use.
 *
 * Priority:
 * 1. User-defined clientSecret in extension config.
 * 2. DEFAULT_CLIENT_SECRET constant.
 *
 * @returns {Promise<string>} Client secret string.
 * @throws {Error} If no client secret can be resolved.
 */
async function getClientSecret() {
  const cfg = await loadConfig();
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
/**
 * Returns the redirect URI used by chrome.identity for OAuth flows.
 *
 * @returns {Promise<string>} Redirect URI string.
 */
async function getRedirectUri() {
  // Chrome genera algo como: https://<extension-id>.chromiumapp.org/
  return chrome.identity.getRedirectURL();
}

// -------------------- intercambio de tokens --------------------
/**
 * Exchanges an authorization code for access and refresh tokens.
 *
 * @param {{
 *   code: string;
 *   clientId: string;
 *   redirectUri: string;
 *   codeVerifier: string;
 * }} params
 * @returns {Promise<{ access_token: string; refresh_token?: string; expires_at: number }>}
 *   Token object with expiration timestamp.
 * @throws {Error} If the token endpoint returns an error.
 */
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

/**
 * Refreshes an access token using a valid refresh token.
 *
 * @param {{ access_token: string; refresh_token?: string; expires_at: number }} tokens
 * @param {string} clientId
 * @returns {Promise<{ access_token: string; refresh_token?: string; expires_at: number }>}
 *   New token object with updated expiration.
 * @throws {Error} If the refresh token is missing or the refresh fails.
 */
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
/**
 * Checks if the user is currently authenticated,
 * meaning there is a non-expired access token stored.
 *
 * @returns {Promise<boolean>} True if a valid token is present, false otherwise.
 */
export async function isAuthenticated() {
  const tokens = await loadTokens();
  return isTokenStillValid(tokens);
}

/**
 * Returns a valid access token, refreshing or re-authenticating if needed.
 *
 * Flow:
 * 1. Load tokens from storage.
 * 2. If still valid, return the current access token.
 * 3. If expired but refresh_token is present, attempt to refresh.
 * 4. If refresh fails or there is no refresh_token, run the full auth flow.
 *
 * @returns {Promise<string>} Access token string.
 */
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
  tokens = await startAuthFlowInternal(clientId);
  return tokens.access_token;
}

/**
 * Starts the interactive Google OAuth flow.
 * Intended to be called from the popup when the user clicks "Connect with Google".
 *
 * @returns {Promise<boolean>} Resolves to true when the flow completes successfully.
 */
export async function startAuthFlow() {
  const clientId = await getClientId();
  await startAuthFlowInternal(clientId);
  return true;
}

// -------------------- núcleo del auth flow --------------------

/**
 * Core implementation of the OAuth flow using PKCE and chrome.identity.
 *
 * Steps:
 * - Build the authorization URL with PKCE parameters.
 * - Launch chrome.identity.launchWebAuthFlow.
 * - Parse the returned redirect URL to extract the authorization code.
 * - Exchange the code for tokens.
 * - Store tokens in chrome.storage.local.
 *
 * @param {string} clientId
 * @returns {Promise<{ access_token: string; refresh_token?: string; expires_at: number }>}
 */
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
