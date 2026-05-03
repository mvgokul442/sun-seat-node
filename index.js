require('dotenv').config();  // add this line at the very top

const express = require('express');
const SunCalc = require('suncalc');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Restrict CORS to your frontend domain
app.use(cors({
  origin: "https://sun-seat-web.vercel.app" // replace with your actual frontend URL
}));


// ✅ Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: { error: "Too many requests, please try again later." }
});
app.use(limiter);

// ✅ Simple API key authentication
const API_KEY = process.env.API_KEY;

// Middleware runs before any routes
app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key' });
  }
  next();
});

// Calculate bearing between two coordinates
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

app.get('/recommend-seat', (req, res) => {
  const { fromLat, fromLon, toLat, toLon, time } = req.query;

  if (!fromLat || !fromLon || !toLat || !toLon || !time) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const bearing = calculateBearing(
    parseFloat(fromLat),
    parseFloat(fromLon),
    parseFloat(toLat),
    parseFloat(toLon)
  );

  const date = new Date(time);
  const sunPos = SunCalc.getPosition(date, parseFloat(fromLat), parseFloat(fromLon));
  const sunAzimuth = (sunPos.azimuth * 180 / Math.PI) + 180;

  const diff = (sunAzimuth - bearing + 360) % 360;
  const seat = diff <= 90 || diff >= 270 ? 'right' : 'left';

  res.json({ recommendation: `Sit on the ${seat} side` });
});

app.listen(PORT, () => console.log(`Server running securely on port ${PORT}`));
