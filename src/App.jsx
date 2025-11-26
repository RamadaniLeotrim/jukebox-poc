import { useEffect, useRef, useState } from "react";
import spotifyService from "./services/spotifyService";
import { getAccessTokenFromCode } from "./services/spotifyAuth";
import { UIController } from "./components/uiController";
import jukeboxLogo from "/logo.png";
import SectionHeader from "./components/SectionHeader";
import { Play, Clock, Heart } from "lucide-react";
import QRCode from "react-qr-code";

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
  const [queue, setQueue] = useState([]);

  const handleWish = async (track) => {
    console.log("Gewünschter Song:", track);

    const token = await spotifyService.getUserToken();

    if (!token) {
      return;
    }

    await spotifyService.postTrackToQueue(token, track.uri);
    alert(`Du hast "${track.name}" von ${track.artists[0].name} gewünscht!`);
  };

  // fetch queue every second
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await spotifyService.getQueue();
      setCurrentlyPlaying(response.currently_playing);
      setQueue(response.queue);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

    fetchToken();
    loadGenres();

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
    <div className="min-h-screen flex justify-center items-start p-4 relative">
      {/* QR Code for Desktop */}
      <div className="hidden md:flex fixed left-10 top-1/2 -translate-y-1/2 flex-col items-center bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Scan to Join</h3>
        <div className="p-2 bg-white rounded-lg">
          <QRCode
            value={import.meta.env.VITE_SPOTIFY_REDIRECT_URI}
            size={180}
            level="H"
          />
        </div>
        <p className="mt-4 text-sm text-gray-500 text-center max-w-[200px]">
          Scan with your phone to control the jukebox
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-lg shadow-lg flex flex-col space-y-4 mb-4 p-6">
        <input type="hidden" ref={refs.token} id="hidden_token" />

        <div className="mb-4 text-center">
          <a href="https://vite.dev" target="_blank">
            <img src={jukeboxLogo} className="logo mb-3" alt="Jukebox logo" />
          </a>
        </div>

        <div className="invisible row">
          <div>
            <select ref={refs.genre} id="select_genre" className="form-select">
              <option value="">Wähle ein Genre</option>
            </select>
          </div>

          <div>
            <select
              ref={refs.playlist}
              id="select_playlist"
              className="form-select"
            >
              <option value="">Wähle eine Playlist</option>
            </select>
          </div>

          <div>
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
          <SectionHeader icon={Play} title="Läuft gerade" />
          {currentlyPlaying ? (
            <div className="flex flex-row align-items-center">
              <img
                src={currentlyPlaying.album.images[2].url}
                alt={currentlyPlaying.name}
                className="w-16 h-16 me-3 rounded-sm"
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
          <SectionHeader icon={Clock} title="Als nächstes (3)" />
          <div className="flex flex-col space-y-4">
            {queue &&
              queue.slice(0, 3).map((item) => (
                <div key={item.name} className="flex align-items-center bg-gray-50 rounded p-3">
                  <img
                    src={item.album.images[2].url}
                    alt={item.name}
                    className="w-16 h-16 me-3 rounded-sm"
                  />
                  <div>
                    <div className="font-bold text-lg">{item.name}</div>
                    <div className=" text-gray-400">{item.artists[0].name}</div>
                  </div>
                </div>
              ))}
          </div>
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
          <SectionHeader icon={Heart} title="Song wünschen" />
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

          <div className="max-h-[400px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-gray-400">Keine Ergebnisse</p>
            ) : (
              searchResults.map((track) => (
                <div
                  key={track.id}
                  className="border border-gray-200 rounded p-2 mb-2 flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold">{track.name}</div>
                    <div className="text-gray-400">{track.artists[0].name}</div>
                    <span className="inline-block mt-1 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      CHF 2.50
                    </span>
                  </div>
                  <button
                    onClick={() => handleWish(track)}
                    className="btn btn-dark flex gap-1 items-center px-2 py-1 rounded"
                  >
                    <Heart className="w-4 h-4" />
                    Wünschen
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div ref={refs.songDetail} id="song-detail" className="col-sm-6"></div>
    </div>
  );
}
