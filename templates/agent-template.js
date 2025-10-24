const BaseAgent = require('../src/core/BaseAgent');

class {{AGENT_NAME}}Agent extends BaseAgent {
  constructor(config) {
    super(config);
    
    // Agent-specific configuration
    this.interval = config.interval || 60000; // 1 minute default
    this.enabled = config.enabled !== false;
    
    // Add your custom properties here
    // this.apiKey = config.apiKey;
    // this.endpoint = config.endpoint;
  }

  async run() {
    if (!this.enabled) {
      this.logger.info('{{AGENT_NAME}} agent is disabled');
      return;
    }

    this.logger.info('{{AGENT_NAME}} agent is running...');
    
    try {
      // Implement your agent logic here
      await this.performTask();
      
      this.logger.info('{{AGENT_NAME}} agent completed successfully');
    } catch (error) {
      this.logger.error('{{AGENT_NAME}} agent failed:', error);
      throw error;
    }
  }

  async performTask() {
    // TODO: Implement your custom task logic
    this.logger.debug('Performing {{AGENT_NAME}} task...');
    
    // Example: API call
    // const response = await this.makeApiCall();
    // this.logger.info('API response:', response);
    
    // Example: File processing
    // await this.processFiles();
    
    // Example: Database operation
    // await this.updateDatabase();
    
    // Add your custom logic here
  }

  // Add your custom methods here
  // async makeApiCall() {
  //   // API call implementation
  // }
  
  // async processFiles() {
  //   // File processing implementation
  // }
  
  // async updateDatabase() {
  //   // Database operation implementation
  // }

  // Override error handling if needed
  async handleError(error) {
    this.logger.error('{{AGENT_NAME}} agent error:', error);
    
    // Add custom error handling logic
    // Example: Send alert, retry logic, etc.
    
    // Call parent error handler
    await super.handleError(error);
  }
}

module.exports = {{AGENT_NAME}}Agent;
