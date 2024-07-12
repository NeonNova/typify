// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import cookieParser from 'cookie-parser';




dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

app.use('/api', gameRoutes);

app.use(cookieParser());



// Session middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport Spotify Strategy setup
passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.SPOTIFY_CLIENT_ID as string,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
            callbackURL: process.env.SPOTIFY_REDIRECT_URL as string,
        },
        (accessToken, refreshToken, expires_in, profile, done) => {
            // Here you would typically find or create a user in your database
            // For now, we'll just pass the profile info and tokens to the next middleware
            return done(null, { profile, accessToken, refreshToken });
        }
    )
);



// Serialize user to the session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((obj: Express.User, done) => {
    done(null, obj);
});

// Routes
app.use('/auth', authRoutes);
app.use('/game', gameRoutes);

const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;