require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./src/config/database');
const path = require('path');
const { sanitizeInput } = require('./src/middleware/sanitize');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const { initSocket } = require('./src/utils/socketManager');
const { securityHeaders, preventParamPollution } = require('./src/middleware/security');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const citizenRoutes = require('./src/routes/citizenRoutes');
const ngoRoutes = require('./src/routes/ngoRoutes');
const rescueTeamRoutes = require('./src/routes/rescueTeamRoutes');
const disasterRoutes = require('./src/routes/disasterRoutes');
const emergencyRoutes = require('./src/routes/emergencyRoutes');
const alertRoutes = require('./src/routes/alertRoutes');
const resourceRoutes = require('./src/routes/resourceRoutes');
const resourcePackageRoutes = require('./src/routes/resourcePackageRoutes');
const donationRoutes = require('./src/routes/donationRoutes');
const donorRoutes = require('./src/routes/donorRoutes');
const distributionPlanRoutes = require('./src/routes/distributionPlanRoutes');
const feedbackRoutes = require('./src/routes/feedbackRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const emergencyContactRoutes = require('./src/routes/emergencyContactRoutes');
const mapLocationRoutes = require('./src/routes/mapLocationRoutes');
const bankAccountRoutes = require('./src/routes/bankAccountRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const fundAccountRoutes = require('./src/routes/fundAccountRoutes');
const chatRoutes = require('./src/routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(preventParamPollution);
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message: { success: false, message: 'Too many requests, please try again later.', error: 'RATE_LIMIT_EXCEEDED' }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sanitize inputs
app.use(sanitizeInput);

// Logging
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/citizens', citizenRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/rescue-teams', rescueTeamRoutes);
app.use('/api/disasters', disasterRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/resource-packages', resourcePackageRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/distribution-plans', distributionPlanRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);
app.use('/api/map-locations', mapLocationRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/fund-accounts', fundAccountRoutes);
app.use('/api/chat', chatRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  // Ensure dynamic tables exist
  const { DisasterUpdate, EmergencyUpdate, Message, EmergencyAssignment } = require('./src/models');
  await DisasterUpdate.createTable().catch(e => console.error('DisasterUpdate table init:', e.message));
  await EmergencyUpdate.createTable().catch(e => console.error('EmergencyUpdate table init:', e.message));
  await Message.createTable().catch(e => console.error('Message table init:', e.message));
  await EmergencyAssignment.createTables().catch(e => console.error('EmergencyAssignment table init:', e.message));
  const FundAccount = require('./src/models/FundAccount');
  await FundAccount.createTable().catch(e => console.error('FundAccount table init:', e.message));
  const http = require('http');
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

if (require.main === module) {
  startServer();
}

module.exports = app;
