const BaseAgent = require('../core/BaseAgent');

class TestAgentAgent extends BaseAgent {
  static metadata = {
    name: 'test-agent',
    description: 'Test monitoring agent',
    version: '1.0.0',
    author: 'Background Agents Framework',
    category: 'monitoring',
    dependencies: ['axios']
  };

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
      const response = await this.makeRequest(target);
      const responseTime = Date.now() - startTime;
      
      if (this.thresholds.responseTime && responseTime > this.thresholds.responseTime) {
        this.logger.warn(`Target ${target.name} response time exceeded threshold: ${responseTime}ms`);
      }
      
      this.logger.debug(`Target ${target.name} is healthy (${responseTime}ms)`);
      
    } catch (error) {
      this.logger.error(`Target ${target.name} is down:`, error.message);
    }
  }

  async makeRequest(target) {
    const axios = require('axios');
    return await axios.get(target.url, {
      timeout: target.timeout || 5000,
      headers: target.headers || {}
    });
  }
}

module.exports = TestAgentAgent;