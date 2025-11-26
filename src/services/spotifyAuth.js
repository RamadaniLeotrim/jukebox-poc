// services/spotifyAuth.js
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

const generateRandomString = (length) => {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
};

const base64urlencode = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const generatePKCECodes = async () => {
  const codeVerifier = generateRandomString(128);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlencode(hashed);
  return { codeVerifier, codeChallenge };
};

export const redirectToSpotifyAuth = async (scope = "user-read-private user-read-email user-modify-playback-state") => {
  const { codeVerifier, codeChallenge } = await generatePKCECodes();
  localStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    scope,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const getAccessTokenFromCode = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return null;

  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  if (!codeVerifier) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  console.log("Token Exchange Debug:");
  console.log("Redirect URI:", redirectUri);
  console.log("Code Verifier:", codeVerifier);
  console.log("Code:", code);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Token Exchange Error:", errorData);
    return null;
  }

  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem("spotify_access_token", data.access_token);
    // Log Refresh Token for Vercel setup
    if (data.refresh_token) {
      console.log("!!! WICHTIG - KOPIERE DIESEN TOKEN FÜR VERCEL !!!");
      console.log("SPOTIFY_REFRESH_TOKEN=" + data.refresh_token);
      console.log("!!! ------------------------------------------- !!!");
    }
  }
  return data.access_token;
};
