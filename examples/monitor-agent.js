/**
 * Example Monitor Agent
 * Demonstrates how to create a custom background agent
 */

const BaseAgent = require('../src/core/BaseAgent');
const axios = require('axios');

class MonitorAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.targets = config.targets || [];
    this.thresholds = config.thresholds || {};
  }

  async run() {
    this.logger.info('Starting monitoring cycle...');
    
    for (const target of this.targets) {
      try {
        await this.monitorTarget(target);
      } catch (error) {
        this.logger.error(`Failed to monitor target ${target.name}:`, error);
      }
    }
    
    this.logger.info('Monitoring cycle completed');
  }

  async monitorTarget(target) {
    this.logger.debug(`Monitoring ${target.name}...`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.get(target.url, {
        timeout: target.timeout || 5000,
        headers: target.headers || {}
      });
      
      const responseTime = Date.now() - startTime;
      
      // Check response time threshold
      if (this.thresholds.responseTime && responseTime > this.thresholds.responseTime) {
        this.logger.warn(`Target ${target.name} response time exceeded threshold: ${responseTime}ms`);
        await this.handleThresholdViolation(target, 'responseTime', responseTime);
      }
      
      // Check status code
      if (response.status !== 200) {
        this.logger.warn(`Target ${target.name} returned non-200 status: ${response.status}`);
        await this.handleStatusError(target, response.status);
      }
      
      this.logger.debug(`Target ${target.name} is healthy (${responseTime}ms)`);
      
    } catch (error) {
      this.logger.error(`Target ${target.name} is down:`, error.message);
      await this.handleTargetDown(target, error);
    }
  }

  async handleThresholdViolation(target, metric, value) {
    // Implement alerting logic here
    this.logger.warn(`Threshold violation for ${target.name}: ${metric} = ${value}`);
  }

  async handleStatusError(target, statusCode) {
    // Implement error handling logic here
    this.logger.warn(`Status error for ${target.name}: ${statusCode}`);
  }

  async handleTargetDown(target, error) {
    // Implement down-time handling logic here
    this.logger.error(`Target ${target.name} is down:`, error.message);
  }
}

// Example usage
const monitorConfig = {
  id: 'web-monitor',
  type: 'monitor',
  schedule: '*/2 * * * *', // Every 2 minutes
  targets: [
    {
      name: 'API Health Check',
      url: 'https://api.example.com/health',
      timeout: 5000
    },
    {
      name: 'Website Status',
      url: 'https://example.com',
      timeout: 10000
    }
  ],
  thresholds: {
    responseTime: 2000, // 2 seconds
    errorRate: 0.05 // 5%
  }
};

module.exports = { MonitorAgent, monitorConfig };
