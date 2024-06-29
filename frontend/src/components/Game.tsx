import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

import { Card, CardContent, CardHeader } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
}

interface LyricLine {
  startTimeMs: string;
  words: string;
  syllables: string[];
  endTimeMs: string;
}

const Game: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [typedText, setTypedText] = useState<string>('');
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const accessToken = queryParams.get('token');
    if (accessToken) {
      setToken(accessToken);
    }
  }, [location]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isGameActive && !gameEnded) {
      interval = setInterval(() => {
        const currentTime = Date.now() - (startTimeRef.current ?? 0);

        const newLineIndex = lyrics.findIndex((line, index) =>
          currentTime >= parseInt(line.startTimeMs) &&
          (index === lyrics.length - 1 || currentTime < parseInt(lyrics[index + 1].startTimeMs))
        );

        if (newLineIndex !== -1 && newLineIndex !== currentLineIndex) {
          setCurrentLineIndex(newLineIndex);
          calculateScore(currentLineIndex);
          setTypedText('');
        }

        if (newLineIndex === lyrics.length - 1) {
          setGameEnded(true);
          calculateScore(lyrics.length - 1);
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isGameActive, gameEnded, currentLineIndex, lyrics]);

  const calculateScore = (lineIndex: number) => {
    const cleanText = (text: string) => text.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase();
    
    const currentLine = cleanText(lyrics[lineIndex].words);
    const typedTextClean = cleanText(typedText);
    
    const correctChars = typedTextClean.split('').filter((char, index) => char === currentLine[index]);
    
    // Update score based on correct characters typed
    setScore(prevScore => prevScore + correctChars.length);
  };
  

  const searchTracks = async () => {
    setError(null);
    if (!token) {
      setError("No access token available. Please log in again.");
      return;
    }
    if (!searchQuery) {
      setError("Please enter a search query");
      return;
    }
    try {
      const response = await axios.get(`http://localhost:3050/game/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setSearchResults(response.data);
    } catch (error) {
      setError("Failed to search tracks. Please try again.");
    }
  };

  const selectTrack = async (track: Track) => {
    setSelectedTrack(track);
    setError(null);
    setLyrics([]);
    try {
      const response = await axios.get(`http://localhost:3050/game/lyrics?trackId=${track.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      if (response.data && response.data.lyrics && response.data.lyrics.lines) {
        setLyrics(response.data.lyrics.lines);
      } else {
        setError('No lyrics found for this track.');
      }
    } catch (error) {
      setError("Failed to fetch lyrics. Please try again.");
    }
  };

  const startGame = async () => {
    if (lyrics.length > 0 && selectedTrack) {
      setIsGameActive(true);
      setGameEnded(false);
      setTypedText('');
      setCurrentLineIndex(0);
      setScore(0);
      startTimeRef.current = Date.now();
      try {
        await axios.post('http://localhost:3050/game/play', { trackUri: selectedTrack.uri }, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
      } catch (error) {
        setError("Failed to start playback. Please try again.");
      }
      inputRef.current?.focus();
    } else {
      setError("No lyrics available. Please select a track first.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedText(e.target.value);
  };

  const renderLyrics = () => {
    const beforeAfterCount = 2; // Number of lines before and after the current line to display
    const startLine = Math.max(0, currentLineIndex - beforeAfterCount);
    const endLine = Math.min(lyrics.length, currentLineIndex + beforeAfterCount + 1);
  
    const cleanText = (text: string) => text.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase();
  
    return (
      <div className="text-2xl font-bold mb-4">
        {lyrics.slice(startLine, endLine).map((line, index) => {
          const lineIndex = startLine + index;
          const isCurrentLine = lineIndex === currentLineIndex;
          const typedSoFar = isCurrentLine ? typedText : '';
  
          // Clean the text for display
          const cleanedText = cleanText(line.words);
  
          return (
            <div key={lineIndex} className={isCurrentLine ? 'text-white' : 'text-gray-500'}>
              {cleanedText.split('').map((char, charIndex) => {
                let color = 'text-gray-500';
                if (isCurrentLine && charIndex < typedSoFar.length) {
                  color = typedSoFar[charIndex].toLowerCase() === char.toLowerCase() ? 'text-green-500' : 'text-red-500';
                }
                return <span key={charIndex} className={color}>{char}</span>;
              })}
            </div>
          );
        })}
      </div>
    );
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-green-500 p-4">
      <h1 className="text-4xl font-bold mb-8">typify</h1>
      {error && <div className="error-message text-red-500 mb-4">{error}</div>}
      {token ? (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <h2 className="text-2xl font-bold">Lyrics Typing Game</h2>
          </CardHeader>
          <CardContent>
            {!isGameActive && !gameEnded && (
              <>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a track"
                  className="w-full mb-4"
                />
                <Button onClick={searchTracks} className="w-full mb-4">Search</Button>
                {searchResults.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-2">Search Results</h3>
                    <ul className="space-y-2">
                      {searchResults.map((track) => (
                        <li key={track.id} onClick={() => selectTrack(track)} className="cursor-pointer hover:bg-gray-700 p-2 rounded">
                          <strong>{track.name}</strong> - {track.artists[0].name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedTrack && (
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-2">Selected Track</h3>
                    <p className="mb-2"><strong>{selectedTrack.name}</strong> - {selectedTrack.artists[0].name}</p>
                    <Button onClick={startGame} className="w-full">Start Game</Button>
                  </div>
                )}
              </>
            )}
            {isGameActive && !gameEnded && (
              <>
                {renderLyrics()}
                <Input
                  ref={inputRef}
                  type="text"
                  value={typedText}
                  onChange={handleInputChange}
                  placeholder="Type the lyrics here..."
                  className="w-full mt-4"
                />
                <div className="mt-4">Score: {score}</div>
              </>
            )}
            {gameEnded && (
              <div>
                <h3 className="text-xl font-bold mb-2">Game Over!</h3>
                <p>Your final score: {score}</p>
                <Button onClick={startGame} className="mt-4">Play Again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-xl">Waiting for Spotify authentication...</p>
      )}
    </div>
  );
};

export default Game;
