require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = async () => {
  if (process.env.NODE_ENV !== 'test') {
    const connect = require('./config/db');
    await connect();
  }
};

const routes = require('./routes');
const socketService = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

// Connect to Database (Only if not in testing mode)
connectDB();

// Initialize Cron Jobs (Only if not in testing mode)
if (process.env.NODE_ENV !== 'test') {
  const { initGpsCronJob } = require('./jobs/compressGps');
  const { initWeatherCronJob } = require('./jobs/weatherCheck');
  initGpsCronJob();
  initWeatherCronJob();
}

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading local uploads in browser
}));

// CORS — cho phép web dashboard (Vercel) + local dev + Expo app
const allowedOrigins = [
  'http://localhost:5173',       // Vite dev (rescuelink-web)
  'http://localhost:5174',       // Vite dev (rescuelink-vqg)
  'http://localhost:3000',
  process.env.WEB_URL,           // Vercel URL (set trên Render dashboard)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile app, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Cho phép mọi *.vercel.app trong dev/staging
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // Support larger payloads for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));


// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to RescueLink Emergency API' });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// Export for testing
module.exports = { app, server };
