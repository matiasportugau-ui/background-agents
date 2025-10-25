/**
 * Background Agents Dashboard
 * Web-based dashboard for monitoring and managing agents
 */

const express = require('express');
const path = require('path');
const { Logger } = require('../utils/Logger');

class Dashboard {
  constructor(agentManager, port = 3000) {
    this.agentManager = agentManager;
    this.port = port;
    this.app = express();
    this.logger = new Logger('Dashboard');
    this.setupRoutes();
  }

  setupRoutes() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());

    // API Routes
    this.app.get('/api/agents', (req, res) => {
      try {
        const agents = this.agentManager.getAllAgentStatuses();
        res.json({ success: true, data: agents });
      } catch (error) {
        this.logger.error('Error getting agents:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/agents/registry', (req, res) => {
      try {
        const registry = this.agentManager.getAgentRegistryStatus();
        res.json({ success: true, data: registry });
      } catch (error) {
        this.logger.error('Error getting registry:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/agents/:id', (req, res) => {
      try {
        const agent = this.agentManager.getAgentStatus(req.params.id);
        if (agent) {
          res.json({ success: true, data: agent });
        } else {
          res.status(404).json({ success: false, error: 'Agent not found' });
        }
      } catch (error) {
        this.logger.error('Error getting agent:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/agents/:id/start', async (req, res) => {
      try {
        await this.agentManager.startAgent(req.params.id);
        res.json({ success: true, message: 'Agent started' });
      } catch (error) {
        this.logger.error('Error starting agent:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/agents/:id/stop', async (req, res) => {
      try {
        await this.agentManager.stopAgent(req.params.id);
        res.json({ success: true, message: 'Agent stopped' });
      } catch (error) {
        this.logger.error('Error stopping agent:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/agents/:id/enable', async (req, res) => {
      try {
        await this.agentManager.enableAgent(req.params.id);
        res.json({ success: true, message: 'Agent enabled' });
      } catch (error) {
        this.logger.error('Error enabling agent:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/agents/:id/disable', async (req, res) => {
      try {
        await this.agentManager.disableAgent(req.params.id);
        res.json({ success: true, message: 'Agent disabled' });
      } catch (error) {
        this.logger.error('Error disabling agent:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/agents/:id/run', async (req, res) => {
      try {
        await this.agentManager.runAgentNow(req.params.id);
        res.json({ success: true, message: 'Agent executed' });
      } catch (error) {
        this.logger.error('Error running agent:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Agent creation endpoints
    this.app.get('/api/templates', (req, res) => {
      try {
        const templates = [
          {
            id: 'monitoring',
            name: 'Monitoring Agent',
            description: 'Monitor systems, APIs, or services',
            category: 'monitoring'
          },
          {
            id: 'processing',
            name: 'Data Processing Agent',
            description: 'Process files, data, or batch operations',
            category: 'data'
          },
          {
            id: 'notification',
            name: 'Notification Agent',
            description: 'Send emails, alerts, or notifications',
            category: 'communication'
          },
          {
            id: 'custom',
            name: 'Custom Agent',
            description: 'Build your own agent from scratch',
            category: 'custom'
          }
        ];
        res.json({ success: true, data: templates });
      } catch (error) {
        this.logger.error('Error getting templates:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/agents/create', async (req, res) => {
      try {
        const { name, template, config } = req.body;
        
        if (!name || !template) {
          return res.status(400).json({ 
            success: false, 
            error: 'Agent name and template are required' 
          });
        }

        // Create agent file from template
        const agentCreated = await this.createAgentFromTemplate(name, template, config);
        
        if (agentCreated) {
          // Hot-reload the agent registry
          await this.agentManager.agentRegistry.initialize();
          
          res.json({ 
            success: true, 
            message: `Agent ${name} created successfully`,
            agentName: name
          });
        } else {
          res.status(500).json({ 
            success: false, 
            error: 'Failed to create agent' 
          });
        }
      } catch (error) {
        this.logger.error('Error creating agent:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        success: true, 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Serve dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error) => {
        if (error) {
          this.logger.error('Failed to start dashboard:', error);
          reject(error);
        } else {
          this.logger.info(`Dashboard started on http://localhost:${this.port}`);
          resolve();
        }
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Dashboard stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async createAgentFromTemplate(name, template, config) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Get template content
      const templateContent = this.getTemplateContent(template);
      
      // Replace placeholders in template
      const agentContent = templateContent
        .replace(/{{AGENT_NAME}}/g, this.toPascalCase(name))
        .replace(/{{AGENT_ID}}/g, name)
        .replace(/{{SCHEDULE}}/g, config?.schedule || '*/5 * * * *')
        .replace(/{{DESCRIPTION}}/g, config?.description || `Custom ${template} agent`);
      
      // Create agent file
      const agentsDir = path.join(__dirname, '..', 'agents');
      const agentFile = path.join(agentsDir, `${name}-agent.js`);
      
      if (!fs.existsSync(agentsDir)) {
        fs.mkdirSync(agentsDir, { recursive: true });
      }
      
      fs.writeFileSync(agentFile, agentContent);
      
      // Update agents.json configuration
      await this.updateAgentConfig(name, {
        enabled: true,
        schedule: config?.schedule || '*/5 * * * *',
        timeout: config?.timeout || 30000,
        retries: config?.retries || 3,
        config: config?.agentConfig || {}
      });
      
      this.logger.info(`Created agent: ${name} from template: ${template}`);
      return true;
      
    } catch (error) {
      this.logger.error('Error creating agent from template:', error);
      return false;
    }
  }

  getTemplateContent(template) {
    const templates = {
      monitoring: `const BaseAgent = require('../core/BaseAgent');

class {{AGENT_NAME}}Agent extends BaseAgent {
  static metadata = {
    name: '{{AGENT_ID}}',
    description: '{{DESCRIPTION}}',
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
        this.logger.error(\`Failed to monitor target \${target.name}:\`, error);
      }
    }
    
    this.logger.info('Monitoring cycle completed');
  }

  async monitorTarget(target) {
    this.logger.debug(\`Monitoring \${target.name}...\`);
    
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(target);
      const responseTime = Date.now() - startTime;
      
      if (this.thresholds.responseTime && responseTime > this.thresholds.responseTime) {
        this.logger.warn(\`Target \${target.name} response time exceeded threshold: \${responseTime}ms\`);
      }
      
      this.logger.debug(\`Target \${target.name} is healthy (\${responseTime}ms)\`);
      
    } catch (error) {
      this.logger.error(\`Target \${target.name} is down:\`, error.message);
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

module.exports = {{AGENT_NAME}}Agent;`,

      processing: `const BaseAgent = require('../core/BaseAgent');
const fs = require('fs').promises;
const path = require('path');

class {{AGENT_NAME}}Agent extends BaseAgent {
  static metadata = {
    name: '{{AGENT_ID}}',
    description: '{{DESCRIPTION}}',
    version: '1.0.0',
    author: 'Background Agents Framework',
    category: 'data',
    dependencies: []
  };

  constructor(config) {
    super(config);
    this.sourcePath = config.sourcePath || './data/input';
    this.outputPath = config.outputPath || './data/output';
    this.batchSize = config.batchSize || 100;
  }

  async run() {
    this.logger.info('Starting data processing cycle...');
    
    try {
      await this.ensureDirectoryExists(this.outputPath);
      const files = await this.getFilesToProcess();
      
      if (files.length === 0) {
        this.logger.info('No files to process');
        return;
      }

      this.logger.info(\`Found \${files.length} files to process\`);
      await this.processFiles(files);
      
    } catch (error) {
      this.logger.error('Data processing failed:', error);
      throw error;
    }
  }

  async getFilesToProcess() {
    try {
      const files = await fs.readdir(this.sourcePath);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(\`Source directory \${this.sourcePath} does not exist\`);
        return [];
      }
      throw error;
    }
  }

  async processFiles(files) {
    for (const file of files) {
      try {
        await this.processFile(file);
        this.logger.debug(\`Processed file: \${file}\`);
      } catch (error) {
        this.logger.error(\`Error processing file \${file}:\`, error);
      }
    }
  }

  async processFile(filename) {
    const inputPath = path.join(this.sourcePath, filename);
    const outputPath = path.join(this.outputPath, \`processed_\${filename}\`);
    
    const data = await fs.readFile(inputPath, 'utf8');
    const processedData = JSON.parse(data);
    
    processedData._processed = {
      timestamp: new Date().toISOString(),
      processor: '{{AGENT_ID}}-agent'
    };
    
    await fs.writeFile(outputPath, JSON.stringify(processedData, null, 2));
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }
}

module.exports = {{AGENT_NAME}}Agent;`,

      notification: `const BaseAgent = require('../core/BaseAgent');

class {{AGENT_NAME}}Agent extends BaseAgent {
  static metadata = {
    name: '{{AGENT_ID}}',
    description: '{{DESCRIPTION}}',
    version: '1.0.0',
    author: 'Background Agents Framework',
    category: 'communication',
    dependencies: ['nodemailer']
  };

  constructor(config) {
    super(config);
    this.recipients = config.recipients || [];
    this.subject = config.subject || 'Background Agent Notification';
    this.template = config.template || 'default';
  }

  async run() {
    this.logger.info('Starting notification cycle...');
    
    try {
      const message = await this.prepareMessage();
      await this.sendNotifications(message);
      this.logger.info('Notifications sent successfully');
    } catch (error) {
      this.logger.error('Notification failed:', error);
      throw error;
    }
  }

  async prepareMessage() {
    return {
      subject: this.subject,
      text: \`Notification from {{AGENT_ID}} agent at \${new Date().toISOString()}\`,
      html: \`<h2>Agent Notification</h2><p>This is a notification from the {{AGENT_ID}} agent.</p>\`
    };
  }

  async sendNotifications(message) {
    for (const recipient of this.recipients) {
      try {
        await this.sendNotification(recipient, message);
        this.logger.debug(\`Notification sent to \${recipient}\`);
      } catch (error) {
        this.logger.error(\`Failed to send notification to \${recipient}:\`, error);
      }
    }
  }

  async sendNotification(recipient, message) {
    // Implement your notification logic here
    // This could be email, Slack, Discord, etc.
    this.logger.info(\`Would send notification to \${recipient}: \${message.subject}\`);
  }
}

module.exports = {{AGENT_NAME}}Agent;`,

      custom: `const BaseAgent = require('../core/BaseAgent');

class {{AGENT_NAME}}Agent extends BaseAgent {
  static metadata = {
    name: '{{AGENT_ID}}',
    description: '{{DESCRIPTION}}',
    version: '1.0.0',
    author: 'Background Agents Framework',
    category: 'custom',
    dependencies: []
  };

  constructor(config) {
    super(config);
    // Add your custom configuration properties here
  }

  async run() {
    this.logger.info('{{AGENT_NAME}} agent is running...');
    
    try {
      // Implement your custom logic here
      await this.performCustomTask();
      
      this.logger.info('{{AGENT_NAME}} agent completed successfully');
    } catch (error) {
      this.logger.error('{{AGENT_NAME}} agent failed:', error);
      throw error;
    }
  }

  async performCustomTask() {
    // TODO: Implement your custom task logic
    this.logger.debug('Performing custom task...');
    
    // Example: Add your custom logic here
    // await this.processData();
    // await this.callAPI();
    // await this.updateDatabase();
  }

  // Add your custom methods here
  // async processData() {
  //   // Your data processing logic
  // }
  
  // async callAPI() {
  //   // Your API call logic
  // }
  
  // async updateDatabase() {
  //   // Your database update logic
  // }
}

module.exports = {{AGENT_NAME}}Agent;`
    };

    return templates[template] || templates.custom;
  }

  async updateAgentConfig(agentName, config) {
    const fs = require('fs');
    const path = require('path');
    
    const configPath = path.join(__dirname, '..', 'config', 'agents.json');
    let configData = {};
    
    if (fs.existsSync(configPath)) {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    configData[`${agentName}-agent`] = config;
    
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  }

  toPascalCase(str) {
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
  }
}

module.exports = { Dashboard };
