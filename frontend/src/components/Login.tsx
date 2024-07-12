import React from 'react';
import { Button } from "./ui/button";
import { Music, LogIn, Keyboard, X} from 'lucide-react';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3050/auth/spotify/callback';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center mb-6">
            <h1 className="text-6xl md:text-8xl font-spotify text-primary">typify.</h1>
          </div>
          <div className="flex items-center text-xl md:text-2xl mb-8 font-spotify text-muted-foreground text-center">
            <Music className="h-10 w-10" />

            <X className="h-6 w-6 ml-2" />

            <Keyboard className="h-10 w-10 ml-2" />
            
          </div>
          <Button
            onClick={handleLogin}
            className="bg-primary hover:bg-primary/80 text-card font-spotify py-4 px-8 rounded-full text-xl transition duration-300 ease-in-out transform hover:scale-105 flex items-center"
          >
            <LogIn className="mr-2 h-6 w-6" />
            Login with Spotify
          </Button>
        </div>

        
        </div>
      </div>

  );
};

export default Login;
