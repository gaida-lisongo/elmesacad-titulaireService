import logger from 'jet-logger';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config();

import EnvVars from './common/constants/env';
import server from './server';

/******************************************************************************
                                Constants
******************************************************************************/

const SERVER_START_MESSAGE =
  'Express server started on port: ' + EnvVars.Port.toString();

/******************************************************************************
                                  Run
******************************************************************************/

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || EnvVars.MongoUri;
mongoose.connect(mongoUri)
  .then(() => {
    logger.info('Connected to MongoDB');
    // Start the server
    const port = process.env.PORT || EnvVars.Port;
    server.listen(port, () => {
      logger.info('Express server started on port: ' + port.toString());
    });
  })
  .catch((err) => {
    logger.err('MongoDB connection error: ' + err.message);
  });

