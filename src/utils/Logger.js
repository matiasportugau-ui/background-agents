/**
 * Logger utility for the Background Agents framework
 */

const winston = require('winston');

class Logger {
  constructor(component = 'BackgroundAgents') {
    this.component = component;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { component: this.component },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        })
      ]
    });
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, error = null, meta = {}) {
    if (error instanceof Error) {
      this.logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
      this.logger.error(message, { error, ...meta });
    }
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Create a child logger with additional context
  child(additionalMeta = {}) {
    const childLogger = new Logger(this.component);
    childLogger.logger = this.logger.child(additionalMeta);
    return childLogger;
  }
}

module.exports = { Logger };
