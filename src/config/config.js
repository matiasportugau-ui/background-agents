/**
 * Configuration for the Background Agents framework
 */

require('dotenv').config();

const config = {
  // Application settings
  app: {
    name: 'Background Agents',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logDir: 'logs',
    maxFiles: 5,
    maxSize: '10m'
  },

  // Agent configuration
  agents: {
    // Default agent settings
    default: {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000
    },
    
    // Agent-specific configurations
    monitor: {
      interval: '*/5 * * * *', // Every 5 minutes
      timeout: 10000
    },
    
    processor: {
      interval: '0 */1 * * *', // Every hour
      batchSize: 100
    }
  },

  // Database configuration (if needed)
  database: {
    url: process.env.DATABASE_URL,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // External service configurations
  services: {
    // Add your external service configurations here
    api: {
      baseUrl: process.env.API_BASE_URL,
      timeout: 10000,
      retries: 3
    }
  },

  // Security settings
  security: {
    jwtSecret: process.env.JWT_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY
  }
};

module.exports = config;
