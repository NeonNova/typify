import express from 'express';
import passport from 'passport';

const router = express.Router();

router.get('/spotify', passport.authenticate('spotify', {
  scope: ['user-read-email', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state']
}));

router.get('/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: 'http://localhost:3000/login' }),
  (req, res) => {
    // Assuming the user object is attached to req by Passport
    const user = req.user as any;
    // Redirect to the frontend game page with the access token
    res.redirect(`http://localhost:3000/game?token=${user.accessToken}`);
  }
);


export default router;