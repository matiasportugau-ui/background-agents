#!/usr/bin/env node

/**
 * Background Agents Framework
 * Main entry point for the background agents system
 */

const { AgentManager } = require('./core/AgentManager');
const { Logger } = require('./utils/Logger');
const { Dashboard } = require('./dashboard/Dashboard');
const config = require('./config/config');

class BackgroundAgentsApp {
  constructor() {
    this.logger = new Logger('BackgroundAgents');
    this.agentManager = new AgentManager();
    this.dashboard = new Dashboard(this.agentManager, config.app.port);
  }

  async start() {
    try {
      this.logger.info('Starting Background Agents Framework...');
      
      // Initialize the agent manager
      await this.agentManager.initialize();
      
      // Load and start agents
      await this.agentManager.loadAgents();
      
      // Start the dashboard
      await this.dashboard.start();
      
      this.logger.info('Background Agents Framework started successfully');
      this.logger.info(`Dashboard available at: http://localhost:${config.app.port}`);
      
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
    await this.dashboard.stop();
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
