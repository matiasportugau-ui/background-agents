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
}

module.exports = { Dashboard };
