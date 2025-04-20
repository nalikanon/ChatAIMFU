import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { connectDB } from './lib/mongodb';
import authRoutes from './routes/auth';
import trainingRoutes from './routes/training';
import embeddingRoutes from './routes/embedding';
import chatRoutes from './routes/chat';
import modelsRoutes from './routes/models';
import bodyParser from 'body-parser';
import compression from 'compression';
import adminRoutes from './routes/admin';
import statsRoutes from './routes/stats';
import departmentRoutes from './routes/department';

const app = express();

// Connect to MongoDB
connectDB();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://mfulearnai.mfu.ac.th'];
console.log('Allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // console.log('Request origin:', origin);
    
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Not allowed by CORS'), false);
    }

    return callback(null, true);
  },
  credentials: true
}));

app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/embed', embeddingRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/departments', departmentRoutes);

// เพิ่มการตั้งค่า timeout
app.use((req, res, next) => {
  res.setTimeout(24 * 60 * 60 * 1000); // 24 hours
  next();
});

// ปิดการใช้งาน compression middleware สำหรับ SSE endpoints
app.use((req, res, next) => {
  if (req.url.includes('/api/chat') && req.method === 'POST') {
    // ข้าม compression สำหรับ chat endpoint
    next();
  } else {
    compression()(req, res, next);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // console.log(`Server running on port ${PORT}`);
}); 