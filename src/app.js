const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const checkInRoutes = require('./routes/checkInRoutes');
const taskRoutes = require('./routes/taskRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const testRoutes = require('./routes/testRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

app.use(
  cors({
    origin: function originCheck(origin, callback) {
      const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((item) => item.trim()) : [];

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS policy does not allow this origin.'));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'HealthOS backend is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/test', testRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
