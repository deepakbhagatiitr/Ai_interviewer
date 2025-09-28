const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interview');
const reportsRoutes = require('./routes/reports');
const interviewSessionRoutes = require('./routes/interviewSessions');
const chatMessageRoutes = require('./routes/chatMessages');
const aiInteractionRoutes = require('./routes/aiInteractions');
const { setupSocketHandlers } = require('./socket/socketHandlers');

// Import AI service
const { initializeAI } = require('./services/aiService');

const app = express();
const server = http.createServer(app);

// Set default environment variables
process.env.PORT = process.env.PORT || '5000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-interviewer';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_key_for_development';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-proj-placeholder-key';

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/interview-sessions', interviewSessionRoutes);
app.use('/api/chat-messages', chatMessageRoutes);
app.use('/api/ai-interactions', aiInteractionRoutes);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Setup socket handlers
setupSocketHandlers(io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Initialize AI service
initializeAI().then(() => {
  console.log('AI Service initialized successfully');
}).catch((error) => {
  console.error('AI Service initialization failed:', error);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WebSocket server ready for connections');
});