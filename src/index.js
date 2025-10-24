#!/usr/bin/env node

/**
 * Background Agents Framework
 * Main entry point for the background agents system
 */

const { AgentManager } = require('./core/AgentManager');
const { Logger } = require('./utils/Logger');
const config = require('./config/config');

class BackgroundAgentsApp {
  constructor() {
    this.logger = new Logger('BackgroundAgents');
    this.agentManager = new AgentManager();
  }

  async start() {
    try {
      this.logger.info('Starting Background Agents Framework...');
      
      // Initialize the agent manager
      await this.agentManager.initialize();
      
      // Load and start agents
      await this.agentManager.loadAgents();
      
      this.logger.info('Background Agents Framework started successfully');
      
      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error) {
      this.logger.error('Failed to start Background Agents Framework:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    this.logger.info('Shutting down Background Agents Framework...');
    await this.agentManager.shutdown();
    this.logger.info('Background Agents Framework stopped');
    process.exit(0);
  }
}

// Start the application
if (require.main === module) {
  const app = new BackgroundAgentsApp();
  app.start();
}

module.exports = BackgroundAgentsApp;
