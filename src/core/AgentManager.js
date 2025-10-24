/**
 * Agent Manager - Core component for managing background agents
 */

const { Logger } = require('../utils/Logger');
const BaseAgent = require('./BaseAgent');

class AgentManager {
  constructor() {
    this.logger = new Logger('AgentManager');
    this.agents = new Map();
    this.isRunning = false;
  }

  async initialize() {
    this.logger.info('Initializing Agent Manager...');
    // Initialize any required services
    this.isRunning = true;
  }

  async loadAgents() {
    this.logger.info('Loading agents...');
    
    // This is where you would load agent configurations
    // and instantiate agents based on configuration
    
    // Example: Load agents from config or discovery
    const agentConfigs = this.getAgentConfigs();
    
    for (const config of agentConfigs) {
      try {
        const agent = this.createAgent(config);
        this.agents.set(config.id, agent);
        this.logger.info(`Loaded agent: ${config.id}`);
      } catch (error) {
        this.logger.error(`Failed to load agent ${config.id}:`, error);
      }
    }
  }

  createAgent(config) {
    // Factory method to create agents based on configuration
    // This would typically use a registry or factory pattern
    return new BaseAgent(config);
  }

  getAgentConfigs() {
    // Return agent configurations
    // In a real implementation, this would load from files or database
    return [
      {
        id: 'monitor-agent',
        type: 'monitor',
        schedule: '*/5 * * * *', // Every 5 minutes
        config: {}
      }
    ];
  }

  async startAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.start();
      this.logger.info(`Started agent: ${agentId}`);
    }
  }

  async stopAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.stop();
      this.logger.info(`Stopped agent: ${agentId}`);
    }
  }

  async shutdown() {
    this.logger.info('Shutting down all agents...');
    
    for (const [agentId, agent] of this.agents) {
      try {
        await agent.stop();
        this.logger.info(`Stopped agent: ${agentId}`);
      } catch (error) {
        this.logger.error(`Error stopping agent ${agentId}:`, error);
      }
    }
    
    this.agents.clear();
    this.isRunning = false;
  }

  getAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    return agent ? agent.getStatus() : null;
  }

  getAllAgentStatuses() {
    const statuses = {};
    for (const [agentId, agent] of this.agents) {
      statuses[agentId] = agent.getStatus();
    }
    return statuses;
  }
}

module.exports = { AgentManager };
