import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// Helper to read .env manually since we might not have dotenv installed
const readEnv = () => {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        });
        return env;
    } catch (e) {
        console.error("Could not read .env file. Make sure it exists in the root.");
        return {};
    }
};

const env = readEnv();
const CLIENT_ID = env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.VITE_SPOTIFY_CLIENT_SECRET;
// Ensure this matches your Spotify Dashboard!
const REDIRECT_URI = 'http://127.0.0.1:3000/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Error: VITE_SPOTIFY_CLIENT_ID or VITE_SPOTIFY_CLIENT_SECRET missing in .env");
    process.exit(1);
}

const SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-currently-playing'
].join(' ');

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/login') {
        const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        res.writeHead(302, { Location: authUrl });
        res.end();
    } else if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        if (code) {
            try {
                const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
                    },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        code: code,
                        redirect_uri: REDIRECT_URI
                    })
                });

                const data = await tokenResponse.json();

                if (data.refresh_token) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<h1>Success!</h1><p>Your Refresh Token is:</p><pre>${data.refresh_token}</pre><p>Copy this to your Vercel Environment Variables as SPOTIFY_REFRESH_TOKEN</p>`);
                    console.log("\n=======================================================");
                    console.log("SUCCESS! Here is your Refresh Token:");
                    console.log("=======================================================");
                    console.log(data.refresh_token);
                    console.log("=======================================================\n");

                    // Optional: Write to a file for convenience
                    fs.writeFileSync('refresh_token.txt', data.refresh_token);
                    console.log("Token also saved to refresh_token.txt");

                    setTimeout(() => process.exit(0), 1000);
                } else {
                    res.end('Error: No refresh token received. Check console.');
                    console.error("Error response:", data);
                }
            } catch (error) {
                res.end('Error exchanging code for token.');
                console.error(error);
            }
        }
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<a href="/login">Login with Spotify to get Refresh Token</a>');
    }
});

server.listen(3000, () => {
    console.log(`Server running at http://127.0.0.1:3000`);
    console.log(`1. Ensure '${REDIRECT_URI}' is added to your Spotify Dashboard Redirect URIs.`);
    console.log(`2. Open http://127.0.0.1:3000/login in your browser.`);
});
