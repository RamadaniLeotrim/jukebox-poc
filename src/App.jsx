import { useEffect, useRef, useState } from "react";
import spotifyService from "./services/spotifyService";
import { getAccessTokenFromCode } from "./services/spotifyAuth";
import { UIController } from "./components/uiController";
import jukeboxLogo from "/logo.png";

// ---------------------------------------------------------------------
// APP Controller mapped to React component
// ---------------------------------------------------------------------
export default function App() {
  // refs for DOM elements
  const refs = {
    genre: useRef(),
    playlist: useRef(),
    submit: useRef(),
    songDetail: useRef(),
    tracks: useRef(),
    token: useRef(),
    songSearch: useRef(),
    artistSearch: useRef(),
    searchBtn: useRef(),
    wishBtn: useRef(),
  };

  const [searchResults, setSearchResults] = useState([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  const handleWish = async (track) => {
    console.log("Gewünschter Song:", track);

    const token = await spotifyService.getUserToken();

    if (!token) {
      // Benutzer wurde umgeleitet, wir können hier nichts weiter machen
      return;
    }

    await spotifyService.postTrackToQueue(token, track.uri);
    alert(`Du hast "${track.name}" von ${track.artists[0].name} gewünscht!`);
  };

  useEffect(() => {
    const DOMInputs = UIController.inputField(refs);

    const fetchToken = async () => {
      const token = await getAccessTokenFromCode();
      if (token) {
        console.log("Spotify User Token:", token);
      }
    };

    const loadGenres = async () => {
      const token = await spotifyService.getToken();
      UIController.storeToken(refs, token);

      const genres = await spotifyService.getGenres(token);
      genres.forEach((g) => UIController.createGenre(refs, g.name, g.id));
    };

    // const loadCurrentlyPlaying = async () => {
    //   const token = await spotifyService.getUserToken();
    //   const track = await spotifyService.getCurrentlyPlayingTrack(token);
    //   setCurrentlyPlaying(track);
    // };

    fetchToken();
    loadGenres();

    // loadCurrentlyPlaying();

    // genre change event
    DOMInputs.genre.addEventListener("change", async () => {
      UIController.resetPlaylist(refs);
      const token = UIController.getStoredToken(refs).token;

      const genreId =
        DOMInputs.genre.options[DOMInputs.genre.selectedIndex].value;

      const playlists = await spotifyService.getPlaylistByGenre(token, genreId);

      playlists.forEach((p) =>
        UIController.createPlaylist(refs, p.name, p.tracks.href)
      );
    });

    // submit button click
    DOMInputs.submit.addEventListener("click", async (e) => {
      e.preventDefault();
      UIController.resetTracks(refs);

      const token = UIController.getStoredToken(refs).token;
      const playlistField = DOMInputs.playlist;

      const tracksEndpoint =
        playlistField.options[playlistField.selectedIndex].value;

      const tracks = await spotifyService.getTracks(token, tracksEndpoint);

      tracks.forEach((el) =>
        UIController.createTrack(refs, el.track.href, el.track.name)
      );
    });

    // track click
    DOMInputs.tracks.addEventListener("click", async (e) => {
      e.preventDefault();
      UIController.resetTrackDetail(refs);

      const token = UIController.getStoredToken(refs).token;
      const trackEndpoint = e.target.id;

      const track = await spotifyService.getTrack(token, trackEndpoint);

      UIController.createTrackDetail(
        refs,
        track.album.images[2].url,
        track.name,
        track.artists[0].name
      );
    });

    refs.searchBtn.current.addEventListener("click", async (e) => {
      e.preventDefault();
      UIController.resetTracks(refs); // optional, um alte Inhalte zu löschen

      const token = UIController.getStoredToken(refs).token;
      const song = refs.songSearch.current.value;
      const artist = refs.artistSearch.current.value;

      const results = await spotifyService.searchTracks(token, song, artist);
      setSearchResults(results);
    });
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-start p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg flex flex-col space-y-4 mb-4 p-6">
        <input type="hidden" ref={refs.token} id="hidden_token" />

        <div className="mb-4 text-center">
          <a href="https://vite.dev" target="_blank">
            <img src={jukeboxLogo} className="logo mb-3" alt="Jukebox logo" />
          </a>
        </div>

        <div className="invisible row mb-3">
          <div className="col-sm-4">
            <select ref={refs.genre} id="select_genre" className="form-select">
              <option value="">Wähle ein Genre</option>
            </select>
          </div>

          <div className="col-sm-4">
            <select
              ref={refs.playlist}
              id="select_playlist"
              className="form-select"
            >
              <option value="">Wähle eine Playlist</option>
            </select>
          </div>

          <div className="col-sm-4">
            <button
              ref={refs.submit}
              id="btn_submit"
              className="btn btn-primary"
            >
              Laden
            </button>
          </div>
        </div>

        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <p className="mb-8">Läuft gerade</p>
          {currentlyPlaying ? (
            <div className="d-flex align-items-center">
              <img
                src={currentlyPlaying.album.images[2].url}
                alt={currentlyPlaying.name}
                className="me-3"
              />
              <div>
                <div className="font-bold text-lg">{currentlyPlaying.name}</div>
                <div className=" text-gray-400">
                  {currentlyPlaying.artists[0].name}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted">Nichts wird gerade abgespielt</p>
          )}
        </div>

        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <p className="mb-8">Als nächstes (3)</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <div className="row">
            <div ref={refs.tracks} className="song-list col-sm-6"></div>
            <div
              ref={refs.songDetail}
              id="song-detail"
              className="col-sm-6"
            ></div>
          </div>
          <p className="mb-8">Song wünschen</p>
          <div className="flex flex-col space-y-4 mb-4">
            <div className="col-sm-5">
              <input
                ref={refs.songSearch}
                type="text"
                className="w-full bg-gray-100 rounded-sm form-control p-2"
                placeholder="Song Name"
              />
            </div>
            <div className="col-sm-5">
              <input
                ref={refs.artistSearch}
                type="text"
                className="w-full bg-gray-100 rounded-sm form-control p-2"
                placeholder="Artist Name"
              />
            </div>
            <div className="col-sm-2 d-grid">
              <button ref={refs.searchBtn} className="btn btn-success">
                Suchen
              </button>
            </div>
          </div>

          <div className="row">
            <div className="col-sm-6">
              {searchResults.length === 0 && (
                <p className="text-muted">Keine Ergebnisse</p>
              )}
              <div className="max-h-[400px] overflow-y-auto">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="border border-gray-100 p-2 rounded-lg card mb-2"
                  >
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <div className="font-bold text-lg">{track.name}</div>
                        <div className=" text-gray-400">
                          {track.artists[0].name}
                        </div>
                        <span className="inline-block mt-1 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {track.album?.genres?.[0] || "Genre"}
                        </span>
                      </div>
                      <div>
                        <span className="me-2">CHF 2.50</span>
                        <button
                          className="btn btn-dark btn-sm"
                          onClick={() => handleWish(track)}
                        >
                          Wünschen ❤️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={refs.songDetail} id="song-detail" className="col-sm-6"></div>
    </div>
  );
}
