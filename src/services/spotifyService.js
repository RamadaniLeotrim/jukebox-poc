import { redirectToSpotifyAuth } from "./spotifyAuth";

// services/spotifyService.js
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

const getToken = async () => {
  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
    },
    body: "grant_type=client_credentials",
  });

  const data = await result.json();
  console.log(data.access_token);
  return data.access_token;
};

const getUserToken = async () => {
  let token = localStorage.getItem("spotify_access_token");

  if (!token) {
    try {
      // Try to get token from our Vercel backend
      const response = await fetch('/api/token');

      if (!response.ok) {
        const text = await response.text();
        alert(`DEBUG ERROR: Backend Login failed!\nStatus: ${response.status}\nMessage: ${text}`);
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      if (data.access_token) {
        console.log("Auto-Login via Backend erfolgreich!");
        localStorage.setItem("spotify_access_token", data.access_token);
        return data.access_token;
      }
    } catch (e) {
      console.error("Backend Auto-Login failed", e);
      // Stop here for debugging, don't redirect yet
      return null;
    }

    // Fallback to manual login if backend fails
    /* 
    await redirectToSpotifyAuth(
      "user-read-private user-read-email user-modify-playback-state user-read-playback-state user-read-currently-playing"
    );
    */
    return null;
  }

  return token;
};

const getGenres = async (token) => {
  const result = await fetch(
    `https://api.spotify.com/v1/browse/categories?locale=de_CH`,
    { headers: { Authorization: "Bearer " + token } }
  );
  return (await result.json()).categories.items;
};

const getPlaylistByGenre = async (token, genreId) => {
  const result = await fetch(
    `https://api.spotify.com/v1/browse/categories/${genreId}/playlists?limit=10`,
    { headers: { Authorization: "Bearer " + token } }
  );
  return (await result.json()).playlists.items;
};

const getTracks = async (token, endpoint) => {
  const result = await fetch(`${endpoint}?limit=10`, {
    headers: { Authorization: "Bearer " + token },
  });
  return (await result.json()).items;
};

const getTrack = async (token, endpoint) => {
  const result = await fetch(endpoint, {
    headers: { Authorization: "Bearer " + token },
  });
  return await result.json();
};

const searchTracks = async (token, song = "", artist = "") => {
  let query = "";

  if (song) query += `track:${song}`;
  if (artist) query += song ? ` artist:${artist}` : `artist:${artist}`;

  if (!query) return [];

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query
  )}&type=track&market=CH&limit=10`;

  const result = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });

  const data = await result.json();
  return data.tracks.items;
};

const postTrackToQueue = async (token, trackUri) => {
  const url = `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(
    trackUri
  )}`;

  const result = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });

  if (!result.ok) {
    const text = await result.text();
    console.error("Fehler beim Hinzufügen:", text);
    throw new Error(`Queue Fehler: ${result.status}`);
  }

  console.log(`Track ${trackUri} erfolgreich zur Queue hinzugefügt!`);
};

const getQueue = async () => {
  let token = localStorage.getItem("spotify_access_token");
  if (!token) {
    token = await getUserToken();
    if (!token) return null;
  }
  const url = "https://api.spotify.com/v1/me/player/queue";

  const result = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });

  if (result.status === 401) {
    await redirectToSpotifyAuth(
      "user-read-private user-read-email user-modify-playback-state user-read-playback-state user-read-currently-playing"
    );
    return null;
  }

  if (result.status === 204) return null;
  if (!result.ok) return null;

  const data = await result.json();
  return data;
};

export default {
  getToken,
  getUserToken,
  getGenres,
  getPlaylistByGenre,
  getTracks,
  getTrack,
  searchTracks,
  postTrackToQueue,
  getQueue
};
