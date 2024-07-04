import React from 'react';
import { Button } from "./ui/button";
import { Music, Zap, Brain, Smile, LogIn, Keyboard, X, Headphones} from 'lucide-react';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3050/auth/spotify/callback';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5, 
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  const iconVariants = {
    hidden: { scale: 0 },
    visible: { 
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  const buttonVariants = {
    hover: { 
      scale: 1.05,
      transition: { duration: 0.3 }
    },
    tap: { scale: 0.95 }
  };

  return (
    <motion.div 
      className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <motion.div className="flex flex-col items-center mb-12" variants={itemVariants}>
          <motion.div className="flex items-center mb-6" variants={itemVariants}>
            <motion.h1 
              className="text-6xl md:text-8xl font-spotify text-primary"
              variants={itemVariants}
            >
              typify.
            </motion.h1>
          </motion.div>
          <motion.div 
            className="flex items-center text-xl md:text-2xl mb-8 font-spotify text-muted-foreground text-center"
            variants={itemVariants}
          >
            <motion.div variants={iconVariants}>
              <Music className="h-10 w-10" />
            </motion.div>

            <motion.div variants={iconVariants}>
              <X className="h-6 w-6 ml-2" />
            </motion.div>

            <motion.div variants={iconVariants}>
              <Keyboard className="h-10 w-10 ml-2" />
            </motion.div>
          </motion.div>
          <motion.div
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              onClick={handleLogin}
              className="bg-primary hover:bg-primary/80 text-card font-spotify py-4 px-8 rounded-full text-xl transition duration-300 ease-in-out flex items-center"
            >
              <LogIn className="mr-2 h-6 w-6" />
              Login with Spotify
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Login;