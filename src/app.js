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
    origin: true,
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
