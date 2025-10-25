const BaseAgent = require('../core/BaseAgent');
const fs = require('fs').promises;
const path = require('path');

class DataProcessorAgent extends BaseAgent {
  static metadata = {
    name: 'data-processor',
    description: 'Processes data files in batches with configurable patterns',
    version: '1.0.0',
    author: 'Background Agents Framework',
    category: 'data',
    dependencies: [],
    configuration: {
      batchSize: { type: 'number', default: 100, description: 'Number of files to process per batch' },
      sourcePath: { type: 'string', default: './data/input', description: 'Source directory for files' },
      outputPath: { type: 'string', default: './data/output', description: 'Output directory for processed files' },
      filePattern: { type: 'string', default: '*.json', description: 'File pattern to match' }
    }
  };

  constructor(config) {
    super(config);
    this.batchSize = config.batchSize || 100;
    this.sourcePath = config.sourcePath || './data/input';
    this.outputPath = config.outputPath || './data/output';
    this.filePattern = config.filePattern || '*.json';
    this.processedCount = 0;
    this.errorCount = 0;
  }

  async run() {
    this.logger.info('Starting data processing cycle...');
    
    try {
      // Ensure output directory exists
      await this.ensureDirectoryExists(this.outputPath);
      
      // Get list of files to process
      const files = await this.getFilesToProcess();
      
      if (files.length === 0) {
        this.logger.info('No files to process');
        return;
      }

      this.logger.info(`Found ${files.length} files to process`);
      
      // Process files in batches
      const batches = this.createBatches(files, this.batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} files)`);
        
        await this.processBatch(batch);
        
        // Small delay between batches to prevent overwhelming the system
        if (i < batches.length - 1) {
          await this.sleep(1000);
        }
      }
      
      this.logger.info(`Data processing completed. Processed: ${this.processedCount}, Errors: ${this.errorCount}`);
      
    } catch (error) {
      this.logger.error('Data processing failed:', error);
      throw error;
    }
  }

  async getFilesToProcess() {
    try {
      const files = await fs.readdir(this.sourcePath);
      return files.filter(file => this.matchesPattern(file, this.filePattern));
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`Source directory ${this.sourcePath} does not exist`);
        return [];
      }
      throw error;
    }
  }

  matchesPattern(filename, pattern) {
    if (pattern === '*') return true;
    if (pattern.startsWith('*.')) {
      const extension = pattern.substring(1);
      return filename.endsWith(extension);
    }
    return filename.includes(pattern);
  }

  createBatches(files, batchSize) {
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }

  async processBatch(files) {
    const promises = files.map(file => this.processFile(file));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.processedCount++;
      } else {
        this.errorCount++;
        this.logger.error(`Failed to process file ${files[index]}:`, result.reason);
      }
    });
  }

  async processFile(filename) {
    const inputPath = path.join(this.sourcePath, filename);
    const outputPath = path.join(this.outputPath, `processed_${filename}`);
    
    try {
      // Read the file
      const data = await fs.readFile(inputPath, 'utf8');
      
      // Process the data (customize this based on your needs)
      const processedData = await this.processData(data, filename);
      
      // Write the processed data
      await fs.writeFile(outputPath, JSON.stringify(processedData, null, 2));
      
      // Move original file to processed folder or delete it
      await this.handleProcessedFile(inputPath);
      
      this.logger.debug(`Processed file: ${filename}`);
      
    } catch (error) {
      this.logger.error(`Error processing file ${filename}:`, error);
      throw error;
    }
  }

  async processData(data, filename) {
    try {
      // Parse JSON data
      const parsedData = JSON.parse(data);
      
      // Add processing metadata
      const processedData = {
        ...parsedData,
        _metadata: {
          originalFile: filename,
          processedAt: new Date().toISOString(),
          processor: 'data-processor-agent',
          version: '1.0.0'
        }
      };
      
      // Add any custom processing logic here
      // Example: data validation, transformation, enrichment, etc.
      
      return processedData;
      
    } catch (error) {
      // If it's not JSON, treat as plain text
      return {
        content: data,
        _metadata: {
          originalFile: filename,
          processedAt: new Date().toISOString(),
          processor: 'data-processor-agent',
          version: '1.0.0',
          type: 'text'
        }
      };
    }
  }

  async handleProcessedFile(filePath) {
    const processedDir = path.join(this.sourcePath, 'processed');
    await this.ensureDirectoryExists(processedDir);
    
    const filename = path.basename(filePath);
    const newPath = path.join(processedDir, filename);
    
    await fs.rename(filePath, newPath);
    this.logger.debug(`Moved processed file to: ${newPath}`);
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
        this.logger.debug(`Created directory: ${dirPath}`);
      } else {
        throw error;
      }
    }
  }

  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      sourcePath: this.sourcePath,
      outputPath: this.outputPath,
      batchSize: this.batchSize
    };
  }
}

module.exports = DataProcessorAgent;
