import express from 'express';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import api from './routes/api.js';
import logger from './utils/winston.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080

const connectToDatabase = async () => {
  try {
    await mongoose.connect(`mongodb+srv://tamiisoledad:${process.env.MONGO_PASS}@cluster0.c4rhxf2.mongodb.net/`)
    logger.info('Connect success');
  } catch (error) {
    logger.error(`Error connecting to the database: ${error}`)
  }
}
const requestLoggerMiddleware = (req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  next();
};

connectToDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

app.use('/', api);
app.use('*', (req, res, next) => {
  const error = new Error('Route not found');
  res.status(404).json({error: error.message})
});

const server = app.listen(PORT, () => logger.info(`Server running in http://localhost:${PORT}`))

export default server;
