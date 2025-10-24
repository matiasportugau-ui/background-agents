/**
 * Base Agent - Abstract base class for all background agents
 */

const cron = require('node-cron');
const { Logger } = require('../utils/Logger');

class BaseAgent {
  constructor(config) {
    this.id = config.id;
    this.type = config.type;
    this.schedule = config.schedule;
    this.config = config.config || {};
    this.logger = new Logger(`Agent-${this.id}`);
    this.isRunning = false;
    this.task = null;
    this.lastRun = null;
    this.runCount = 0;
    this.errorCount = 0;
  }

  async start() {
    if (this.isRunning) {
      this.logger.warn(`Agent ${this.id} is already running`);
      return;
    }

    this.logger.info(`Starting agent ${this.id}`);
    
    if (this.schedule) {
      this.task = cron.schedule(this.schedule, async () => {
        await this.execute();
      }, {
        scheduled: false
      });
      
      this.task.start();
    } else {
      // Run immediately if no schedule
      await this.execute();
    }
    
    this.isRunning = true;
  }

  async stop() {
    if (!this.isRunning) {
      this.logger.warn(`Agent ${this.id} is not running`);
      return;
    }

    this.logger.info(`Stopping agent ${this.id}`);
    
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    
    this.isRunning = false;
  }

  async execute() {
    try {
      this.logger.debug(`Executing agent ${this.id}`);
      this.lastRun = new Date();
      this.runCount++;
      
      await this.run();
      
      this.logger.debug(`Agent ${this.id} executed successfully`);
    } catch (error) {
      this.errorCount++;
      this.logger.error(`Agent ${this.id} execution failed:`, error);
      
      // Implement retry logic or error handling as needed
      await this.handleError(error);
    }
  }

  async run() {
    // This method should be implemented by subclasses
    throw new Error('run() method must be implemented by subclass');
  }

  async handleError(error) {
    // Default error handling - can be overridden by subclasses
    this.logger.error(`Error in agent ${this.id}:`, error);
  }

  getStatus() {
    return {
      id: this.id,
      type: this.type,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      runCount: this.runCount,
      errorCount: this.errorCount,
      schedule: this.schedule
    };
  }

  // Utility methods for common agent operations
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retry(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
}

module.exports = BaseAgent;
