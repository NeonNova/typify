import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { AlertCircle, Music, Play, Pause, Search } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [correctWords, setCorrectWords] = useState<boolean[]>([]);
  const [lineCompleted, setLineCompleted] = useState<boolean>(false);

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

  useEffect(() => {
    // Reset correctWords when moving to a new line
    setCorrectWords([]);
    setTypedText('');
  }, [currentLineIndex]);

  
  const calculateScore = (lineIndex: number) => {
    const cleanText = (text: string) => text.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase();
    
    const currentLine = cleanText(lyrics[lineIndex].words);
    const typedTextClean = cleanText(typedText);
    
    const correctChars = typedTextClean.split('').filter((char, index) => char === currentLine[index]);
    
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

  const renderTrackInfo = (track: Track) => (
    <div className="flex items-center space-x-4">
      <img src={track.album.images[0]?.url} alt="Album cover" className="w-16 h-16 rounded-md" />
      <div>
        <strong className="text-lg md:text-xl block">{track.name}</strong>
        <p className="text-text-secondary text-sm md:text-base">{track.artists.map(artist => artist.name).join(', ')}</p>
      </div>
    </div>
  );

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
      inputRef.current?.focus();
    } else {
      setError("No lyrics available. Please select a track first.");
    }
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

  const cleanText = (text: string) => {
    return text
      .replace(/\([^)]*\)/g, "") // Remove text within parentheses
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .toLowerCase()
      .trim();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTypedText = e.target.value;
    setTypedText(newTypedText);

    if (lineCompleted) {
      return; // Don't update score if the line is already completed
    }

    const currentLine = lyrics[currentLineIndex].words;
    const cleanedCurrentLine = cleanText(currentLine);
    const currentLineWords = cleanedCurrentLine.split(' ');
    const typedWords = newTypedText.split(' ');

    let newScore = 0;
    let newCorrectWords = [...correctWords];

    typedWords.forEach((typedWord, wordIndex) => {
      const targetWord = currentLineWords[wordIndex];
      if (targetWord) {
        let wordCorrect = true;
        for (let i = 0; i < Math.max(typedWord.length, targetWord.length); i++) {
          if (typedWord[i]?.toLowerCase() === targetWord[i]) {
            newScore += 1;
          } else {
            wordCorrect = false;
            break;
          }
        }
        newCorrectWords[wordIndex] = wordCorrect && typedWord.length === targetWord.length;
      }
    });

    setScore(prevScore => prevScore + newScore);
    setCorrectWords(newCorrectWords);

    // Check if the user has typed the same number of words as the target line
    if (typedWords.length === currentLineWords.length+2 && typedWords[typedWords.length]+1 !== '') {
      setLineCompleted(true);
      // Move to the next line
      setCurrentLineIndex(prevIndex => prevIndex + 1);
    }
  };

  useEffect(() => {
    // Reset correctWords, typedText, and lineCompleted when moving to a new line
    setCorrectWords([]);
    setTypedText('');
    setLineCompleted(false);
  }, [currentLineIndex]);
  const renderLyrics = () => {
    const beforeAfterCount = 2;
    const startLine = Math.max(0, currentLineIndex - beforeAfterCount);
    const endLine = Math.min(lyrics.length, currentLineIndex + beforeAfterCount + 1);
  
    return (
      <div className="text-2xl font-bold mb-4">
        {lyrics.slice(startLine, endLine).map((line, index) => {
          const lineIndex = startLine + index;
          const isCurrentLine = lineIndex === currentLineIndex;
          const cleanedText = cleanText(line.words);
          const lineWords = cleanedText.split(' ');
          const typedWords = isCurrentLine ? typedText.split(' ') : [];
  
          return (
            <div key={lineIndex} className={`${isCurrentLine ? 'text-white bg-gray-800 p-2 rounded' : 'text-gray-500'} mb-2`}>
              {isCurrentLine && (
                <span className="text-green-500 mr-2 inline-block align-middle">▶</span>
              )}
              <span className="inline-block">
                {lineWords.map((word, wordIndex) => (
                  <span key={wordIndex} className="mr-1">
                    {word.split('').map((char, charIndex) => {
                      let color = isCurrentLine ? 'text-white' : 'text-gray-500';
                      if (isCurrentLine) {
                        if (correctWords[wordIndex]) {
                          color = 'text-green-500';
                        } else if (typedWords[wordIndex]) {
                          if (charIndex < typedWords[wordIndex].length) {
                            color = typedWords[wordIndex][charIndex].toLowerCase() === char ? 'text-green-500' : 'text-red-500';
                          }
                        }
                      }
                      return <span key={charIndex} className={color}>{char}</span>;
                    })}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
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
        <Card className="w-full max-w-5xl bg-[#181818] border-[#282828] shadow-lg">
          <CardHeader className="p-6 md:p-8">
            {isGameActive && selectedTrack ? (
              renderTrackInfo(selectedTrack)
            ) : (
              <h2 className="text-4xl md:text-3xl font-bold text-center text-accent">Choose your song!</h2>
            )}
          </CardHeader>
          <CardContent className="p-6 md:p-8">
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
                            {renderTrackInfo(track)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedTrack && (
                    <div className="mt-6 md:mt-8 p-4 md:p-6 bg-[#282828] rounded-md">
                      <h3 className="text-2xl md:text-3xl font-bold mb-4 text-accent">Selected Track</h3>
                      {renderTrackInfo(selectedTrack)}
                      <Button onClick={startGame} className="mt-4 w-full bg-accent hover:bg-hover-accent text-black font-bold py-3 px-6 rounded-full text-lg md:text-xl">
                        <Play className="mr-3 h-5 w-5 md:h-6 md:w-6" /> Start Game
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {isGameActive && !gameEnded && (
              <div className="space-y-6 md:space-y-8">
                <div className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 h-48 md:h-56 overflow-y-auto custom-scrollbar">
                  {renderLyrics()}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={typedText}
                  onChange={handleInputChange}
                  className="w-full bg-[#282828] text-white border-accent text-lg p-3 md:p-4 rounded-full"
                  autoFocus
                />
                <div className="flex justify-between items-center">
                  <div className="text-xl md:text-2xl font-bold">
                    <div>Score: {score}</div>
                  </div>
                  <Button onClick={togglePause} className="bg-accent hover:bg-hover-accent text-black font-bold py-2 px-4 rounded-full text-lg">
                    {isPaused ? <Play className="h-5 w-5 md:h-6 md:w-6" /> : <Pause className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>
                </div>
                <Progress value={(currentLineIndex / lyrics.length) * 100} className="w-full h-3 md:h-4" />
              </div>
            )}
            {gameEnded && (
              <div className="text-center space-y-6 md:space-y-8">
                <h3 className="text-3xl md:text-4xl font-bold mb-4 text-accent">Game Over!</h3>
                <p className="text-2xl md:text-3xl">Your final score: {score}</p>
                <Button onClick={startGame} className="mt-6 md:mt-8 bg-accent hover:bg-hover-accent text-black font-bold py-3 px-6 rounded-full text-lg md:text-xl">
                  <Play className="mr-3 h-5 w-5 md:h-6 md:w-6" /> Play Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-xl md:text-2xl animate-pulse">Waiting for Spotify authentication...</p>
      )}
    </div>
  );
}

export default Game;