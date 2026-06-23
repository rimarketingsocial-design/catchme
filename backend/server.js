require('dotenv').config();
// Fix SSL certificate verification for local development on Windows
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://catchme.vercel.app',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    // Allow local network IPs for mobile testing
    if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return cb(null, true);
    if (/^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/club-auth', require('./src/routes/club-auth'));
app.use('/api/clubs', require('./src/routes/clubs'));
app.use('/api/checkins', require('./src/routes/checkins'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/intentions', require('./src/routes/intentions'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api/vibe', require('./src/routes/vibe'));
app.use('/api/society', require('./src/routes/society'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CatchMe API running on port ${PORT}`));
