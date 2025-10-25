const BaseAgent = require('../core/BaseAgent');
const axios = require('axios');

class ApiMonitorAgent extends BaseAgent {
  static metadata = {
    name: 'api-monitor',
    description: 'Monitors API endpoints for availability and performance',
    version: '1.0.0',
    author: 'Background Agents Framework',
    category: 'monitoring',
    dependencies: ['axios'],
    configuration: {
      endpoints: { type: 'array', required: true, description: 'List of API endpoints to monitor' },
      alertWebhook: { type: 'string', description: 'Webhook URL for alerts' },
      timeout: { type: 'number', default: 10000, description: 'Request timeout in milliseconds' }
    }
  };

  constructor(config) {
    super(config);
    this.endpoints = config.endpoints || [];
    this.alertWebhook = config.alertWebhook;
    this.timeout = config.timeout || 10000;
    this.monitoringResults = new Map();
    this.alertThreshold = 3; // Number of consecutive failures before alert
    this.consecutiveFailures = new Map();
  }

  async run() {
    this.logger.info('Starting API monitoring cycle...');
    
    if (this.endpoints.length === 0) {
      this.logger.warn('No endpoints configured for monitoring');
      return;
    }

    const monitoringPromises = this.endpoints.map(endpoint => 
      this.monitorEndpoint(endpoint)
    );

    try {
      await Promise.allSettled(monitoringPromises);
      this.logger.info('API monitoring cycle completed');
    } catch (error) {
      this.logger.error('API monitoring cycle failed:', error);
    }
  }

  async monitorEndpoint(endpoint) {
    const startTime = Date.now();
    const endpointKey = `${endpoint.name}-${endpoint.url}`;
    
    try {
      this.logger.debug(`Monitoring endpoint: ${endpoint.name} (${endpoint.url})`);
      
      const response = await this.makeRequest(endpoint);
      const responseTime = Date.now() - startTime;
      
      const result = {
        endpoint: endpoint.name,
        url: endpoint.url,
        status: 'success',
        statusCode: response.status,
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        expectedStatus: endpoint.expectedStatus || 200,
        isHealthy: this.isResponseHealthy(response, endpoint)
      };

      // Reset consecutive failures on success
      this.consecutiveFailures.set(endpointKey, 0);
      
      // Store result
      this.monitoringResults.set(endpointKey, result);
      
      if (result.isHealthy) {
        this.logger.debug(`✅ ${endpoint.name}: ${responseTime}ms (${response.status})`);
      } else {
        this.logger.warn(`⚠️  ${endpoint.name}: Unexpected status ${response.status} (expected ${result.expectedStatus})`);
        await this.handleUnhealthyEndpoint(endpoint, result);
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result = {
        endpoint: endpoint.name,
        url: endpoint.url,
        status: 'error',
        error: error.message,
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        isHealthy: false
      };

      // Increment consecutive failures
      const failures = (this.consecutiveFailures.get(endpointKey) || 0) + 1;
      this.consecutiveFailures.set(endpointKey, failures);
      
      // Store result
      this.monitoringResults.set(endpointKey, result);
      
      this.logger.error(`❌ ${endpoint.name}: ${error.message} (${responseTime}ms)`);
      
      // Check if we should send an alert
      if (failures >= this.alertThreshold) {
        await this.handleEndpointFailure(endpoint, result, failures);
      }
    }
  }

  async makeRequest(endpoint) {
    const requestConfig = {
      method: endpoint.method || 'GET',
      url: endpoint.url,
      timeout: this.timeout,
      headers: endpoint.headers || {},
      validateStatus: () => true // Don't throw on HTTP error status codes
    };

    // Add authentication if provided
    if (endpoint.auth) {
      if (endpoint.auth.type === 'bearer') {
        requestConfig.headers.Authorization = `Bearer ${endpoint.auth.token}`;
      } else if (endpoint.auth.type === 'basic') {
        requestConfig.auth = {
          username: endpoint.auth.username,
          password: endpoint.auth.password
        };
      }
    }

    // Add request body if provided
    if (endpoint.body) {
      requestConfig.data = endpoint.body;
    }

    return await axios(requestConfig);
  }

  isResponseHealthy(response, endpoint) {
    const expectedStatus = endpoint.expectedStatus || 200;
    return response.status === expectedStatus;
  }

  async handleUnhealthyEndpoint(endpoint, result) {
    this.logger.warn(`Endpoint ${endpoint.name} returned unexpected status: ${result.statusCode}`);
    
    // You can add custom logic here for handling unhealthy endpoints
    // For example: restart services, scale up resources, etc.
  }

  async handleEndpointFailure(endpoint, result, consecutiveFailures) {
    this.logger.error(`Endpoint ${endpoint.name} has failed ${consecutiveFailures} times consecutively`);
    
    // Send alert if webhook is configured
    if (this.alertWebhook) {
      await this.sendAlert(endpoint, result, consecutiveFailures);
    }
    
    // You can add other alert mechanisms here (email, SMS, etc.)
  }

  async sendAlert(endpoint, result, consecutiveFailures) {
    try {
      const alertData = {
        type: 'api_monitor_alert',
        timestamp: new Date().toISOString(),
        endpoint: {
          name: endpoint.name,
          url: endpoint.url
        },
        result: {
          status: result.status,
          error: result.error,
          responseTime: result.responseTime
        },
        consecutiveFailures: consecutiveFailures,
        message: `API endpoint ${endpoint.name} has failed ${consecutiveFailures} times consecutively`
      };

      await axios.post(this.alertWebhook, alertData, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info(`Alert sent for endpoint: ${endpoint.name}`);
      
    } catch (error) {
      this.logger.error('Failed to send alert:', error);
    }
  }

  getEndpointStatus(endpointName) {
    for (const [key, result] of this.monitoringResults) {
      if (result.endpoint === endpointName) {
        return result;
      }
    }
    return null;
  }

  getAllEndpointStatuses() {
    return Array.from(this.monitoringResults.values());
  }

  getHealthyEndpoints() {
    return this.getAllEndpointStatuses().filter(result => result.isHealthy);
  }

  getUnhealthyEndpoints() {
    return this.getAllEndpointStatuses().filter(result => !result.isHealthy);
  }

  getAverageResponseTime(endpointName = null) {
    const results = endpointName 
      ? [this.getEndpointStatus(endpointName)].filter(Boolean)
      : this.getAllEndpointStatuses();
    
    if (results.length === 0) return 0;
    
    const totalTime = results.reduce((sum, result) => sum + result.responseTime, 0);
    return Math.round(totalTime / results.length);
  }

  getUptimePercentage(endpointName) {
    const results = this.getAllEndpointStatuses().filter(r => r.endpoint === endpointName);
    if (results.length === 0) return 0;
    
    const healthyCount = results.filter(r => r.isHealthy).length;
    return Math.round((healthyCount / results.length) * 100);
  }

  getStatus() {
    const baseStatus = super.getStatus();
    const allStatuses = this.getAllEndpointStatuses();
    
    return {
      ...baseStatus,
      endpointsCount: this.endpoints.length,
      monitoredEndpoints: allStatuses.length,
      healthyEndpoints: this.getHealthyEndpoints().length,
      unhealthyEndpoints: this.getUnhealthyEndpoints().length,
      averageResponseTime: this.getAverageResponseTime(),
      lastCheck: allStatuses.length > 0 ? Math.max(...allStatuses.map(r => new Date(r.timestamp).getTime())) : null
    };
  }
}

module.exports = ApiMonitorAgent;
