export default async function handler(request, response) {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!client_id || !client_secret || !refresh_token) {
        return response.status(500).json({ error: 'Missing environment variables' });
    }

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
    });

    try {
        const spotifyResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
            },
            body: params,
        });

        const data = await spotifyResponse.json();

        if (!spotifyResponse.ok) {
            return response.status(spotifyResponse.status).json(data);
        }

        // Return only the access token to the client
        return response.status(200).json({
            access_token: data.access_token,
            expires_in: data.expires_in,
        });
    } catch (error) {
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
