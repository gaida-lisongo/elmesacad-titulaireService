import logger from 'jet-logger';
import mongoose from 'mongoose';

import EnvVars from './common/constants/env';
import server from './server';

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
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.err('MongoDB connection error: ' + message);
  });

