import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { AlertCircle, Play, Pause, Search, RefreshCw } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
  album: {
    images: { url: string }[];
  };
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
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const location = useLocation();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [correctChars, setCorrectChars] = useState<boolean[]>([]);
  const [totalLines, setTotalLines] = useState<number>(0);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const accessToken = queryParams.get('token');
    if (accessToken) {
      setToken(accessToken);
    }
  }, [location]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isGameActive && !gameEnded && !isPaused) {
      interval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - (gameStartTime ?? currentTime);

        const newLineIndex = lyrics.findIndex((line, index) =>
          elapsedTime >= parseInt(line.startTimeMs) &&
          (index === lyrics.length - 1 || elapsedTime < parseInt(lyrics[index + 1].startTimeMs))
        );

        if (newLineIndex !== -1 && newLineIndex !== currentLineIndex) {
          setCurrentLineIndex(newLineIndex);
          setTypedText('');
          setCorrectChars([]);
        }

        if (newLineIndex === lyrics.length - 1) {
          setGameEnded(true);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isGameActive, gameEnded, currentLineIndex, lyrics, isPaused, gameStartTime]);

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
      setIsPaused(false);
      setCorrectChars([]);
      setTotalLines(lyrics.length);
      const currentTime = Date.now();
      setGameStartTime(currentTime);
      try {
        await axios.post('http://localhost:3050/game/play', { trackUri: selectedTrack.uri }, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
      } catch (error) {
        setError("Failed to start playback. Please try again.");
      }
      gameContainerRef.current?.focus();
    } else {
      setError("No lyrics available. Please select a track first.");
    }
  };


  const cleanText = (text: string) => {
    return text
      .replace(/\([^)]*\)/g, "") // Remove text within parentheses
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .toLowerCase()
      .trim();
  };

  const togglePause = async () => {
    setIsPaused(!isPaused);
    try {
      await axios.post('http://localhost:3050/game/pause', {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
    } catch (error) {
      setError("Failed to pause/resume playback. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isGameActive || gameEnded || isPaused) return;

    const currentLine = cleanText(lyrics[currentLineIndex].words);
    const key = e.key.toLowerCase();

    if (key === 'backspace') {
      if (typedText.length > 0) {
        const newTypedText = typedText.slice(0, -1);
        setTypedText(newTypedText);
        const newCorrectChars = [...correctChars];
        newCorrectChars.pop();
        setCorrectChars(newCorrectChars);
        setScore(prevScore => Math.max(0, prevScore - 1));
      }
    } else if (key.length === 1 && /[a-z0-9\s]/.test(key)) {
      const newTypedText = typedText + key;
      setTypedText(newTypedText);

      const isCorrect = key === currentLine[typedText.length];
      const newCorrectChars = [...correctChars, isCorrect];
      setCorrectChars(newCorrectChars);

      if (isCorrect) {
        setScore(prevScore => prevScore + 1);
      }

      if (newTypedText.length === currentLine.length) {
        setCurrentLineIndex(prevIndex => prevIndex + 1);
        setTypedText('');
        setCorrectChars([]);
      }
    }
  };;

  const renderLyrics = () => {
    const visibleLines = 5;
    const halfVisibleLines = Math.floor(visibleLines / 2);
    
    // Calculate the range of lines to display
    let startIndex = Math.max(0, currentLineIndex - halfVisibleLines);
    let endIndex = Math.min(lyrics.length, startIndex + visibleLines);
    
    // Adjust startIndex if we're near the end of the lyrics
    if (endIndex - startIndex < visibleLines) {
      startIndex = Math.max(0, endIndex - visibleLines);
    }
    
    // Create an array of line elements to render
    const linesToRender = [];
    
    for (let i = 0; i < visibleLines; i++) {
      const lineIndex = startIndex + i;
      
      if (lineIndex < lyrics.length) {
        const line = lyrics[lineIndex];
        const cleanedLine = cleanText(line.words);
        const isCurrentLine = lineIndex === currentLineIndex;
        const opacity = isCurrentLine ? 1 : 0.5;

        linesToRender.push(
          <div
            key={lineIndex}
            className={`text-3xl font-bold transition-all duration-300 ease-in-out ${
              isCurrentLine ? 'text-white' : 'text-gray-500'
            } flex items-center justify-center w-full`}
            style={{
              opacity,
              transform: `translateY(${(i - halfVisibleLines) * 10}px)`,
              marginBottom: '4px',
            }}
          >
            {isCurrentLine && (
              <span className="absolute left-0 transform -translate-x-full text-accent animate-pulse mr-2">
                ▶
              </span>
            )}
            <div className="text-center">
              {cleanedLine.split('').map((char, charIndex) => (
                <span
                  key={charIndex}
                  className={`${
                    isCurrentLine && charIndex < typedText.length
                      ? correctChars[charIndex]
                        ? 'text-green-500'
                        : 'text-red-500'
                      : ''
                  } ${
                    isCurrentLine && charIndex === typedText.length ? 'border-b-2 border-white' : ''
                  }`}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        );
      } else {
        // Render empty lines with animated ellipsis
        linesToRender.push(
          <div
            key={`empty-${i}`}
            className="text-3xl font-bold text-green-500 flex items-center justify-center w-full h-10"
            style={{
              transform: `translateY(${(i - halfVisibleLines) * 10}px)`,
              marginBottom: '4px',
            }}
          >
            <span className="animate-pulse">...</span>
          </div>
        );
      }
    }
    
    return (
      <div className="relative h-64 flex flex-col justify-center items-center overflow-hidden">
        {linesToRender}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-white p-4 md:p-8 font-spotify">
      <h1 className="text-5xl md:text-7xl font-bold mb-8 md:mb-12 text-accent">typify.</h1>
      {error && (
        <div className="flex items-center bg-red-900 text-white p-4 rounded-md mb-8 w-full max-w-4xl">
          <AlertCircle className="mr-4 h-6 w-6" />
          <span className="text-lg">{error}</span>
        </div>
      )}
      {token ? (
        <div className="w-full max-w-5xl">
          {!isGameActive && !gameEnded && (
            <div className="space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a track"
                  className="flex-grow bg-[#282828] text-white border-accent text-lg p-3 md:p-4 rounded-full"
                />
                <Button onClick={searchTracks} className="bg-accent hover:bg-hover-accent text-black font-bold py-3 px-6 rounded-full text-lg">
                  <Search className="mr-2 h-5 w-5" /> Search
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-6 md:mt-8">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 text-accent">Search Results</h3>
                  <ul className="space-y-3 max-h-64 md:max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                    {searchResults.map((track) => (
                      <li
                        key={track.id}
                        onClick={() => selectTrack(track)}
                        className="cursor-pointer hover:bg-[#282828] p-3 rounded-md flex items-center space-x-4 transition-colors duration-200"
                      >
                        <img src={track.album.images[0]?.url} alt="Album cover" className="w-16 h-16 rounded-md" />
                        <div>
                          <strong className="text-lg md:text-xl block">{track.name}</strong>
                          <p className="text-text-secondary text-sm md:text-base">{track.artists.map(artist => artist.name).join(', ')}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedTrack && (
                <div className="mt-6 md:mt-8 p-4 md:p-6 bg-[#282828] rounded-md">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 text-accent">Selected Track</h3>
                  <div className="flex items-center space-x-4">
                    <img src={selectedTrack.album.images[0]?.url} alt="Album cover" className="w-16 h-16 rounded-md" />
                    <div>
                      <strong className="text-lg md:text-xl block">{selectedTrack.name}</strong>
                      <p className="text-text-secondary text-sm md:text-base">{selectedTrack.artists.map(artist => artist.name).join(', ')}</p>
                    </div>
                  </div>
                  <Button onClick={startGame} className="mt-4 w-full bg-accent hover:bg-hover-accent text-black font-bold py-3 px-6 rounded-full text-lg md:text-xl">
                    <Play className="mr-3 h-5 w-5 md:h-6 md:w-6" /> Start Game
                  </Button>
                </div>
              )}
            </div>
          )}
          {isGameActive && !gameEnded && (
            <div
              ref={gameContainerRef}
              tabIndex={0}
              onKeyDown={handleKeyPress}
              className="space-y-6 md:space-y-8 focus:outline-none"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <img src={selectedTrack?.album.images[0]?.url} alt="Album cover" className="w-12 h-12 rounded-md mr-4" />
                  <div>
                    <p className="text-lg font-bold">{selectedTrack?.name}</p>
                    <p className="text-sm text-gray-300">{selectedTrack?.artists.map(artist => artist.name).join(', ')}</p>
                  </div>
                </div>
                <div className="text-xl font-bold">
                  Score: {score}
                </div>
              </div>
              <Progress value={(currentLineIndex / totalLines) * 100} className="w-full h-3 md:h-4" />
              <div className="h-64 flex items-center justify-center">
                {renderLyrics()}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-lg">Line: {currentLineIndex + 1} / {totalLines}</p>
                <div>
                  <Button onClick={togglePause} className="bg-accent hover:bg-hover-accent text-black font-bold py-2 px-4 rounded-full text-lg mr-2">
                    {isPaused ? <Play className="h-5 w-5 md:h-6 md:w-6" /> : <Pause className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>
                  <Button onClick={startGame} className="bg-accent hover:bg-hover-accent text-black font-bold py-2 px-4 rounded-full text-lg">
                    <RefreshCw className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {gameEnded && (
            <div className="text-center space-y-6 md:space-y-8">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-accent">Game Over!</h3>
              <p className="text-2xl md:text-3xl">Your final score: {score}</p>
              <p className="text-xl">Accuracy: {((score / (totalLines * 100)) * 100).toFixed(2)}%</p>
              <Button onClick={startGame} className="mt-6 md:mt-8 bg-accent hover:bg-hover-accent text-black font-bold py-3 px-6 rounded-full text-lg md:text-xl">
                <Play className="mr-3 h-5 w-5 md:h-6 md:w-6" /> Play Again
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xl md:text-2xl animate-pulse">Waiting for Spotify authentication...</p>
      )}
    </div>
  );
};

export default Game;

