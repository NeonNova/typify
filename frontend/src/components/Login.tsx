import React from 'react';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3050/auth/spotify/callback';
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-green-500 p-4">
      <h1 className="text-4xl font-bold mb-8">typify.</h1>
      <button
        onClick={handleLogin}
        className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-lg text-xl transition duration-300 ease-in-out transform hover:scale-105"
      >
        Login with Spotify
      </button>
      
      <p className="mt-4 text-sm">
        
      </p>
      <p className="mt-4 text-sm">Type the lyrics of your favourite songs!  </p>
    </div>
  );
};

export default Login;