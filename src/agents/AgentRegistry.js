/**
 * Agent Registry - Central registry for all available agents
 */

const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/Logger');

class AgentRegistry {
  constructor() {
    this.logger = new Logger('AgentRegistry');
    this.agents = new Map();
    this.agentConfigs = new Map();
    this.agentDirectory = path.join(__dirname);
  }

  async initialize() {
    this.logger.info('Initializing Agent Registry...');
    await this.discoverAgents();
    await this.loadAgentConfigurations();
    this.logger.info(`Discovered ${this.agents.size} agents`);
  }

  async discoverAgents() {
    try {
      const agentFiles = fs.readdirSync(this.agentDirectory)
        .filter(file => file.endsWith('-agent.js') && file !== 'AgentRegistry.js');

      for (const file of agentFiles) {
        try {
          const agentPath = path.join(this.agentDirectory, file);
          const AgentClass = require(agentPath);
          
          // Extract agent name from filename
          const agentName = file.replace('-agent.js', '');
          
          // Get agent metadata
          const metadata = this.extractAgentMetadata(AgentClass, agentName);
          
          this.agents.set(agentName, {
            name: agentName,
            class: AgentClass,
            path: agentPath,
            metadata: metadata,
            status: 'discovered'
          });

          this.logger.debug(`Discovered agent: ${agentName}`);
        } catch (error) {
          this.logger.error(`Failed to load agent ${file}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to discover agents:', error);
    }
  }

  extractAgentMetadata(AgentClass, agentName) {
    const metadata = {
      name: agentName,
      description: 'No description available',
      version: '1.0.0',
      author: 'Unknown',
      category: 'general',
      dependencies: [],
      configuration: {},
      schedule: null,
      enabled: true
    };

    // Try to get metadata from static properties or constructor
    if (AgentClass.metadata) {
      Object.assign(metadata, AgentClass.metadata);
    }

    return metadata;
  }

  async loadAgentConfigurations() {
    const configPath = path.join(__dirname, '..', 'config', 'agents.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        for (const [agentName, config] of Object.entries(configData)) {
          this.agentConfigs.set(agentName, config);
          
          // Update agent metadata with configuration
          if (this.agents.has(agentName)) {
            const agent = this.agents.get(agentName);
            agent.config = config;
            agent.status = 'configured';
          }
        }
      } catch (error) {
        this.logger.error('Failed to load agent configurations:', error);
      }
    }
  }

  getAgent(name) {
    return this.agents.get(name);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getAgentsByCategory(category) {
    return this.getAllAgents().filter(agent => 
      agent.metadata.category === category
    );
  }

  getEnabledAgents() {
    return this.getAllAgents().filter(agent => 
      agent.config?.enabled !== false && agent.metadata.enabled !== false
    );
  }

  async createAgentInstance(name, customConfig = {}) {
    const agentInfo = this.agents.get(name);
    if (!agentInfo) {
      throw new Error(`Agent ${name} not found`);
    }

    const config = {
      ...agentInfo.config,
      ...customConfig,
      id: `${name}-${Date.now()}`,
      type: name
    };

    const AgentClass = agentInfo.class;
    return new AgentClass(config);
  }

  async updateAgentConfiguration(name, config) {
    this.agentConfigs.set(name, config);
    
    if (this.agents.has(name)) {
      this.agents.get(name).config = config;
    }

    // Save to file
    await this.saveAgentConfigurations();
  }

  async saveAgentConfigurations() {
    const configPath = path.join(__dirname, '..', 'config', 'agents.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configData = Object.fromEntries(this.agentConfigs);
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  }

  getAgentStatus(name) {
    const agent = this.agents.get(name);
    if (!agent) return null;

    return {
      name: agent.name,
      status: agent.status,
      metadata: agent.metadata,
      config: agent.config,
      lastUpdated: new Date().toISOString()
    };
  }

  getAllAgentStatuses() {
    const statuses = {};
    for (const [name, agent] of this.agents) {
      statuses[name] = this.getAgentStatus(name);
    }
    return statuses;
  }

  // Agent management methods
  async enableAgent(name) {
    await this.updateAgentConfiguration(name, { enabled: true });
    this.logger.info(`Enabled agent: ${name}`);
  }

  async disableAgent(name) {
    await this.updateAgentConfiguration(name, { enabled: false });
    this.logger.info(`Disabled agent: ${name}`);
  }

  async updateAgentSchedule(name, schedule) {
    await this.updateAgentConfiguration(name, { schedule });
    this.logger.info(`Updated schedule for agent ${name}: ${schedule}`);
  }
}

module.exports = { AgentRegistry };
