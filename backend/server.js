const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const salesRoutes = require('./routes/salesRoutes');
const dcRoutes = require('./routes/dcRoutes');
const dcOrderRoutes = require('./routes/dcOrderRoutes');
const empDcRoutes = require('./routes/empDcRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const metadataRoutes = require('./routes/metadataRoutes');
const stockReturnRoutes = require('./routes/stockReturnRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const locationRoutes = require('./routes/locationRoutes');
const productRoutes = require('./routes/productRoutes');
const executiveManagerRoutes = require('./routes/executiveManagerRoutes');
const sampleRequestRoutes = require('./routes/sampleRequestRoutes');

dotenv.config();

const app = express();

// Middleware
// CORS configuration - allow Railway domain and common frontend origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.NEXT_PUBLIC_FRONTEND_URL,
      'https://crm-backend-production-2ffd.up.railway.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ].filter(Boolean); // Remove undefined values
    
    // Check if origin is allowed or if we're in development
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      // In production, be more strict, but still allow if no specific origins set
      if (allowedOrigins.length === 0) {
        callback(null, true); // Allow all if no specific origins configured
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const connectDB = require('./config/db');

// Connect to database before starting server
let dbConnected = false;

const startServer = async () => {
  try {
    // Wait for database connection
    await connectDB();
    dbConnected = true;
    console.log('✅ Database connection established. Starting server...');
    
    // Start server only after database is connected
    // Railway automatically sets PORT environment variable
    const PORT = process.env.PORT || 5000;
    // Railway requires binding to 0.0.0.0, not localhost
    const HOST = process.env.RAILWAY_ENVIRONMENT ? '0.0.0.0' : 'localhost';
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
      if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        console.log(`Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
      }
    });

    // Handle port conflicts gracefully
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`Please stop the process using port ${PORT} or use a different port.\n`);
        console.error('To find and kill the process on Windows:');
        console.error(`  netstat -ano | findstr :${PORT}`);
        console.error(`  taskkill /PID <PID> /F\n`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  } catch (err) {
    console.error('❌ Failed to connect to database on startup:', err.message);
    console.error('   Server will not start without database connection.');
    process.exit(1);
  }
};

// Start the application
startServer();

// Handle connection events (mongoose is already imported at the top)
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
  // If error is about a specific IP/host, log it but don't fail the entire connection
  if (err.message && err.message.includes('timed out')) {
    console.warn('⚠️  Connection timeout detected. This may be due to an unreachable replica set member.');
    console.warn('   MongoDB will automatically skip unreachable hosts and use available ones.');
  }
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

// Handle server selection errors
mongoose.connection.on('serverSelectionError', (err) => {
  console.error('MongoDB server selection error:', err.message);
  if (err.message && err.message.includes('timed out')) {
    console.warn('⚠️  Server selection timeout. Some replica set members may be unreachable.');
    console.warn('   Ensure your Atlas cluster is accessible and your IP is whitelisted.');
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dc', dcRoutes);
app.use('/api/contact-queries', require('./routes/contactQueryRoutes'));
app.use('/api/dc-orders', dcOrderRoutes);
app.use('/api/emp-dc', empDcRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/stock-returns', stockReturnRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/executive-managers', executiveManagerRoutes);
app.use('/api/sample-requests', sampleRequestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CRM System Management Forge API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Note: Server is started in startServer() function after database connection is established
// Handle port conflicts gracefully (will be set up in startServer)

module.exports = app;

