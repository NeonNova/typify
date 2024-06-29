import express from 'express';
import axios, { AxiosError } from 'axios';

const router = express.Router();

interface User {
  accessToken: string;
  refreshToken: string;
}

interface SpotifyDevice {
    id: string;
    is_active: boolean;
    // Add other properties as needed
  }

// Helper function to get Spotify API headers
const getSpotifyHeaders = (accessToken: string) => ({
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

// Token refresh function
const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID || '',
        client_secret: process.env.SPOTIFY_CLIENT_SECRET || ''
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
};

// Middleware to check if the user is authenticated
const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Helper function to handle token refresh and retry
const handleTokenRefreshAndRetry = async (user: User, apiCall: () => Promise<any>) => {
  try {
    return await apiCall();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        const newAccessToken = await refreshAccessToken(user.refreshToken);
        user.accessToken = newAccessToken;
        return await apiCall();
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        throw new Error('Failed to refresh token');
      }
    }
    throw error;
  }
};

// Search route
router.get('/search', isAuthenticated, async (req, res) => {
  const { query } = req.query;
  const user = req.user as User;

  if (!user.accessToken) {
    return res.status(401).json({ error: 'No access token available' });
  }

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const response = await handleTokenRefreshAndRetry(user, () =>
      axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'track',
          limit: 10,
        },
        headers: getSpotifyHeaders(user.accessToken),
      })
    );
    res.json(response.data.tracks.items);
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

// Lyrics route
router.get('/lyrics', isAuthenticated, async (req, res) => {
  const { trackId } = req.query;

  if (!trackId) {
    return res.status(400).json({ error: 'trackId is required' });
  }

  try {
    const response = await axios.get(`http://localhost:8000?trackid=${trackId}`);

    if (response.data && response.data.lyrics) {
      res.json({ lyrics: response.data.lyrics });
    } else {
      res.status(404).json({ error: 'No lyrics found for this track' });
    }
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
});

// Play route
router.post('/play', isAuthenticated, async (req, res) => {
    const { trackUri } = req.body;
    const user = req.user as User;
  
    if (!trackUri) {
      return res.status(400).json({ error: 'trackUri is required' });
    }
  
    try {
      // First, get the user's available devices
      const devicesResponse = await handleTokenRefreshAndRetry(user, () =>
        axios.get('https://api.spotify.com/v1/me/player/devices', 
          { headers: getSpotifyHeaders(user.accessToken) }
        )
      );
  
      const devices: SpotifyDevice[] = devicesResponse.data.devices;
  
      if (devices.length === 0) {
        return res.status(404).json({ error: 'No active Spotify devices found. Please open Spotify on a device and try again.' });
      }
  
      // If there's an active device, use it. Otherwise, use the first available device.
      const deviceId = devices.find((d: SpotifyDevice) => d.is_active)?.id || devices[0].id;
  
      await handleTokenRefreshAndRetry(user, () =>
        axios.put('https://api.spotify.com/v1/me/player/play', 
          { uris: [trackUri], device_id: deviceId },
          { headers: getSpotifyHeaders(user.accessToken) }
        )
      );
      res.json({ message: 'Playback started' });
    } catch (error) {
      console.error('Error starting playback:', error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        res.status(404).json({ error: 'Playback failed. Please ensure you have an active Spotify Premium account.' });
      } else {
        res.status(500).json({ error: 'Failed to start playback' });
      }
    }
  });

// Recent tracks route
router.get('/recent', isAuthenticated, async (req, res) => {
  const user = req.user as User;

  try {
    const response = await handleTokenRefreshAndRetry(user, () =>
      axios.get('https://api.spotify.com/v1/me/player/recently-played', {
        params: { limit: 50 },
        headers: getSpotifyHeaders(user.accessToken)
      })
    );

    const tracks = response.data.items.map((item: any) => item.track);
    res.json(tracks);
  } catch (error) {
    console.error('Error fetching recent tracks:', error);
    res.status(500).json({ error: 'Failed to fetch recent tracks' });
  }
});

export default router;