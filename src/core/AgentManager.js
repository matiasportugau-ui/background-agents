/**
 * Agent Manager - Core component for managing background agents
 */

const { Logger } = require('../utils/Logger');
const { AgentRegistry } = require('../agents/AgentRegistry');
const BaseAgent = require('./BaseAgent');

class AgentManager {
  constructor() {
    this.logger = new Logger('AgentManager');
    this.agents = new Map();
    this.agentRegistry = new AgentRegistry();
    this.isRunning = false;
  }

  async initialize() {
    this.logger.info('Initializing Agent Manager...');
    
    // Initialize the agent registry
    await this.agentRegistry.initialize();
    
    // Initialize any required services
    this.isRunning = true;
  }

  async loadAgents() {
    this.logger.info('Loading agents...');
    
    // Get enabled agents from registry
    const enabledAgents = this.agentRegistry.getEnabledAgents();
    
    for (const agentInfo of enabledAgents) {
      try {
        const agent = await this.agentRegistry.createAgentInstance(agentInfo.name);
        this.agents.set(agentInfo.name, agent);
        await agent.start(); // Auto-start agents
        this.logger.info(`Loaded and started agent: ${agentInfo.name}`);
      } catch (error) {
        this.logger.error(`Failed to load agent ${agentInfo.name}:`, error);
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

  // Registry management methods
  getAvailableAgents() {
    return this.agentRegistry.getAllAgents();
  }

  getAgentInfo(agentName) {
    return this.agentRegistry.getAgent(agentName);
  }

  async enableAgent(agentName) {
    await this.agentRegistry.enableAgent(agentName);
    this.logger.info(`Enabled agent: ${agentName}`);
  }

  async disableAgent(agentName) {
    await this.agentRegistry.disableAgent(agentName);
    this.logger.info(`Disabled agent: ${agentName}`);
  }

  async updateAgentConfig(agentName, config) {
    await this.agentRegistry.updateAgentConfiguration(agentName, config);
    this.logger.info(`Updated configuration for agent: ${agentName}`);
  }

  getAgentRegistryStatus() {
    return this.agentRegistry.getAllAgentStatuses();
  }

  async runAgentNow(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.logger.info(`Running agent ${agentId} immediately...`);
      await agent.execute();
      this.logger.info(`Agent ${agentId} executed successfully`);
    } else {
      throw new Error(`Agent ${agentId} not found`);
    }
  }
}

module.exports = { AgentManager };
