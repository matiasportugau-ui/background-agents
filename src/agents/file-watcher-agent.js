const BaseAgent = require('../core/BaseAgent');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class FileWatcherAgent extends BaseAgent {
  static metadata = {
    name: 'file-watcher',
    description: 'Monitors file system changes and triggers actions',
    version: '1.0.0',
    author: 'Background Agents Framework',
    category: 'monitoring',
    dependencies: ['chokidar'],
    configuration: {
      watchPaths: { type: 'array', default: ['./uploads'], description: 'Directories to watch' },
      fileExtensions: { type: 'array', default: ['.txt', '.json'], description: 'File extensions to monitor' },
      action: { type: 'string', default: 'process', description: 'Action to take when files change' }
    }
  };

  constructor(config) {
    super(config);
    this.watchPaths = config.watchPaths || ['./uploads'];
    this.fileExtensions = config.fileExtensions || ['.txt', '.json'];
    this.action = config.action || 'process';
    this.watchers = new Map();
    this.fileEvents = [];
    this.maxEvents = 1000; // Keep last 1000 events
  }

  async start() {
    if (this.isRunning) {
      this.logger.warn(`Agent ${this.id} is already running`);
      return;
    }

    this.logger.info(`Starting file watcher for paths: ${this.watchPaths.join(', ')}`);
    
    // Start watching each path
    for (const watchPath of this.watchPaths) {
      await this.startWatching(watchPath);
    }
    
    this.isRunning = true;
  }

  async stop() {
    if (!this.isRunning) {
      this.logger.warn(`Agent ${this.id} is not running`);
      return;
    }

    this.logger.info('Stopping file watchers...');
    
    // Close all watchers
    for (const [path, watcher] of this.watchers) {
      await watcher.close();
      this.logger.debug(`Stopped watching: ${path}`);
    }
    
    this.watchers.clear();
    this.isRunning = false;
  }

  async startWatching(watchPath) {
    try {
      // Ensure the path exists
      if (!fs.existsSync(watchPath)) {
        this.logger.warn(`Watch path does not exist: ${watchPath}`);
        return;
      }

      const watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      });

      // Set up event handlers
      watcher
        .on('add', (filePath) => this.handleFileEvent('add', filePath))
        .on('change', (filePath) => this.handleFileEvent('change', filePath))
        .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
        .on('error', (error) => this.logger.error(`Watcher error for ${watchPath}:`, error));

      this.watchers.set(watchPath, watcher);
      this.logger.info(`Started watching: ${watchPath}`);
      
    } catch (error) {
      this.logger.error(`Failed to start watching ${watchPath}:`, error);
    }
  }

  async handleFileEvent(eventType, filePath) {
    // Check if file extension matches our criteria
    if (!this.shouldProcessFile(filePath)) {
      return;
    }

    const event = {
      type: eventType,
      path: filePath,
      timestamp: new Date().toISOString(),
      size: this.getFileSize(filePath)
    };

    // Add to events log
    this.fileEvents.unshift(event);
    if (this.fileEvents.length > this.maxEvents) {
      this.fileEvents = this.fileEvents.slice(0, this.maxEvents);
    }

    this.logger.info(`File ${eventType}: ${filePath}`);

    // Process the file event
    try {
      await this.processFileEvent(event);
    } catch (error) {
      this.logger.error(`Error processing file event for ${filePath}:`, error);
    }
  }

  shouldProcessFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.fileExtensions.includes(ext);
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  async processFileEvent(event) {
    switch (this.action) {
      case 'process':
        await this.processFile(event.path);
        break;
      case 'move':
        await this.moveFile(event.path);
        break;
      case 'copy':
        await this.copyFile(event.path);
        break;
      case 'log':
        this.logFileEvent(event);
        break;
      default:
        this.logger.warn(`Unknown action: ${this.action}`);
    }
  }

  async processFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        this.logger.info(`Processing file: ${filePath}`);
        
        // Example processing logic
        const content = fs.readFileSync(filePath, 'utf8');
        const processedContent = this.transformContent(content, filePath);
        
        // Write processed content to a new location
        const outputPath = this.getOutputPath(filePath);
        fs.writeFileSync(outputPath, processedContent);
        
        this.logger.info(`Processed file saved to: ${outputPath}`);
      }
    } catch (error) {
      this.logger.error(`Error processing file ${filePath}:`, error);
    }
  }

  transformContent(content, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.json':
        try {
          const data = JSON.parse(content);
          return JSON.stringify({
            ...data,
            _processed: {
              timestamp: new Date().toISOString(),
              processor: 'file-watcher-agent',
              originalPath: filePath
            }
          }, null, 2);
        } catch (error) {
          return content; // Return original if not valid JSON
        }
      
      case '.txt':
        return `[PROCESSED] ${content}`;
      
      default:
        return content;
    }
  }

  getOutputPath(originalPath) {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const name = path.basename(originalPath, ext);
    const processedDir = path.join(dir, 'processed');
    
    // Ensure processed directory exists
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    
    return path.join(processedDir, `${name}_processed${ext}`);
  }

  async moveFile(filePath) {
    const outputPath = this.getOutputPath(filePath);
    fs.renameSync(filePath, outputPath);
    this.logger.info(`Moved file to: ${outputPath}`);
  }

  async copyFile(filePath) {
    const outputPath = this.getOutputPath(filePath);
    fs.copyFileSync(filePath, outputPath);
    this.logger.info(`Copied file to: ${outputPath}`);
  }

  logFileEvent(event) {
    this.logger.info(`File event logged: ${event.type} - ${event.path}`);
  }

  getRecentEvents(limit = 10) {
    return this.fileEvents.slice(0, limit);
  }

  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      watchPaths: this.watchPaths,
      fileExtensions: this.fileExtensions,
      action: this.action,
      watchersCount: this.watchers.size,
      eventsCount: this.fileEvents.length,
      recentEvents: this.getRecentEvents(5)
    };
  }
}

module.exports = FileWatcherAgent;
