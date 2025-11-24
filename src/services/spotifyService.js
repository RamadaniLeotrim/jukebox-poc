import { redirectToSpotifyAuth, getAccessTokenFromCode } from "./spotifyAuth";

// api/spotifyApi.js
const clientId = "ba42e441ded44d0d81d99ebcee70accd";
const clientSecret = "504f5915c5c344b19704b611155f0bc9";

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
  let token = window.localStorage.getItem("spotify_access_token");
  if (!token) {
    // Wenn noch kein Token existiert, redirect
    await redirectToSpotifyAuth("user-read-private user-read-email user-modify-playback-state");
    return null; // Browser wird weitergeleitet
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

// const getCurrentlyPlayingTrack = async (token) => {
//   const url = `https://api.spotify.com/v1/me/player/currently-playing`;

//   const result = await fetch(url, {
//     headers: { Authorization: "Bearer " + token },
//   });

//   if (result.status === 204) {
//     return null; // Nichts wird gerade abgespielt
//   }
//   const data = await result.json();
//   return data.item; // Aktuell abgespielter Track
// }

const searchTracks = async (token, song = "", artist = "") => {
  let query = "";

  if (song) query += `track:${song}`;
  if (artist) query += song ? ` artist:${artist}` : `artist:${artist}`;

  if (!query) return []; // falls nichts eingegeben

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query
  )}&type=track&market=CH&limit=10`;

  const result = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });

  const data = await result.json();
  return data.tracks.items; // Array von Tracks
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

export default {
  getToken,
  getUserToken,
  getGenres,
  getPlaylistByGenre,
  getTracks,
  getTrack,
  searchTracks,
  postTrackToQueue,
};
