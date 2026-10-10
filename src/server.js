const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/db');

dotenv.config();

const defaults = {
  PORT: '5001',
  FRONTEND_URL: 'http://localhost:3000',
  NODE_ENV: 'development',
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is missing. Add it to your .env file.');
}

const PORT = Number(process.env.PORT) || 5001;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
