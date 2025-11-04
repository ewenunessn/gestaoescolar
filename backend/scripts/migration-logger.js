/**
 * MIGRATION LOGGER
 * 
 * Centralized logging system for inventory tenant migration operations.
 * Provides structured logging, error tracking, and report generation.
 */

const fs = require('fs').promises;
const path = require('path');

class MigrationLogger {
  constructor(operationType = 'migration', options = {}) {
    this.operationType = operationType;
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    this.logs = [];
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      warningOperations: 0,
      recordsProcessed: 0,
      tablesModified: 0
    };
    this.options = {
      verbose: false,
      exportLogs: true,
      logToFile: true,
      ...options
    };
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async log(level, operation, message, details = null, metrics = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      sessionId: this.sessionId,
      timestamp,
      level,
      operation,
      message,
      details,
      metrics,
      duration: Date.now() - this.startTime.getTime()
    };

    this.logs.push(logEntry);
    this.updateMetrics(level, metrics);

    // Console output
    const prefix = this.getLevelPrefix(level);
    console.log(`${prefix} [${timestamp}] ${operation}: ${message}`);
    
    if (details && this.options.verbose) {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }

    if (metrics && this.options.verbose) {
      console.log('   Metrics:', JSON.stringify(metrics, null, 2));
    }

    // File logging
    if (this.options.logToFile) {
      await this.writeToFile(logEntry);
    }
  }

  getLevelPrefix(level) {
    const prefixes = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🔍',
      'MIGRATION': '🔄',
      'VALIDATION': '🔍',
      'ROLLBACK': '↩️'
    };
    return prefixes[level] || '📋';
  }

  updateMetrics(level, operationMetrics) {
    this.metrics.totalOperations++;
    
    switch (level) {
      case 'SUCCESS':
        this.metrics.successfulOperations++;
        break;
      case 'ERROR':
        this.metrics.failedOperations++;
        break;
      case 'WARNING':
        this.metrics.warningOperations++;
        break;
    }

    if (operationMetrics) {
      if (operationMetrics.recordsProcessed) {
        this.metrics.recordsProcessed += operationMetrics.recordsProcessed;
      }
      if (operationMetrics.tablesModified) {
        this.metrics.tablesModified += operationMetrics.tablesModified;
      }
    }
  }

  async writeToFile(logEntry) {
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      await fs.mkdir(logDir, { recursive: true });
      
      const filename = `${this.operationType}-${this.sessionId}.log`;
      const filepath = path.join(logDir, filename);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(filepath, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error.message);
    }
  }

  async logMigrationStep(stepName, status, message, details = null, metrics = null) {
    await this.log('MIGRATION', stepName, message, details, metrics);
  }

  async logValidationResult(checkName, status, message, details = null) {
    const level = status === 'PASS' ? 'SUCCESS' : status === 'FAIL' ? 'ERROR' : 'WARNING';
    await this.log('VALIDATION', checkName, message, details);
  }

  async logRollbackStep(stepName, status, message, details = null) {
    const level = status === 'SUCCESS' ? 'SUCCESS' : status === 'ERROR' ? 'ERROR' : 'WARNING';
    await this.log('ROLLBACK', stepName, message, details);
  }

  async logError(operation, error, context = null) {
    await this.log('ERROR', operation, error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    });
  }

  async logWarning(operation, message, details = null) {
    await this.log('WARNING', operation, message, details);
  }

  async logInfo(operation, message, details = null) {
    await this.log('INFO', operation, message, details);
  }

  async logSuccess(operation, message, details = null, metrics = null) {
    await this.log('SUCCESS', operation, message, details, metrics);
  }

  async logDebug(operation, message, details = null) {
    if (this.options.verbose) {
      await this.log('DEBUG', operation, message, details);
    }
  }

  getSessionSummary() {
    const duration = Date.now() - this.startTime.getTime();
    const successRate = this.metrics.totalOperations > 0 
      ? (this.metrics.successfulOperations / this.metrics.totalOperations * 100).toFixed(2)
      : 100;

    return {
      sessionId: this.sessionId,
      operationType: this.operationType,
      startTime: this.startTime.toISOString(),
      duration: Math.round(duration / 1000), // seconds
      metrics: {
        ...this.metrics,
        successRate: `${successRate}%`
      },
      status: this.metrics.failedOperations === 0 
        ? (this.metrics.warningOperations === 0 ? 'SUCCESS' : 'SUCCESS_WITH_WARNINGS')
        : 'FAILED'
    };
  }

  async generateReport() {
    const summary = this.getSessionSummary();
    
    const report = {
      summary,
      logs: this.logs,
      generatedAt: new Date().toISOString()
    };

    // Console summary
    console.log('\n========================================');
    console.log(`${this.operationType.toUpperCase()} SESSION REPORT`);
    console.log('========================================\n');
    
    console.log(`Session ID: ${summary.sessionId}`);
    console.log(`Status: ${summary.status}`);
    console.log(`Duration: ${summary.duration}s`);
    console.log(`Success Rate: ${summary.metrics.successRate}`);
    console.log(`Total Operations: ${summary.metrics.totalOperations}`);
    console.log(`Successful: ${summary.metrics.successfulOperations}`);
    console.log(`Failed: ${summary.metrics.failedOperations}`);
    console.log(`Warnings: ${summary.metrics.warningOperations}`);
    
    if (summary.metrics.recordsProcessed > 0) {
      console.log(`Records Processed: ${summary.metrics.recordsProcessed}`);
    }
    
    if (summary.metrics.tablesModified > 0) {
      console.log(`Tables Modified: ${summary.metrics.tablesModified}`);
    }

    // Show recent errors
    const errors = this.logs.filter(log => log.level === 'ERROR');
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.slice(-5).forEach(error => {
        console.log(`  - ${error.operation}: ${error.message}`);
      });
    }

    // Show recent warnings
    const warnings = this.logs.filter(log => log.level === 'WARNING');
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      warnings.slice(-5).forEach(warning => {
        console.log(`  - ${warning.operation}: ${warning.message}`);
      });
    }

    console.log('\n========================================\n');

    // Export detailed report
    if (this.options.exportLogs) {
      await this.exportReport(report);
    }

    return report;
  }

  async exportReport(report) {
    try {
      const reportsDir = path.join(__dirname, '..', 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `${this.operationType}-report-${this.sessionId}.json`;
      const filepath = path.join(reportsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report exported to: ${filepath}`);
    } catch (error) {
      console.error('Failed to export report:', error.message);
    }
  }

  async exportLogsAsCSV() {
    try {
      const reportsDir = path.join(__dirname, '..', 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `${this.operationType}-logs-${this.sessionId}.csv`;
      const filepath = path.join(reportsDir, filename);
      
      // CSV header
      const header = 'Timestamp,Level,Operation,Message,Duration\n';
      
      // CSV rows
      const rows = this.logs.map(log => {
        const timestamp = log.timestamp;
        const level = log.level;
        const operation = log.operation.replace(/,/g, ';'); // Escape commas
        const message = log.message.replace(/,/g, ';'); // Escape commas
        const duration = log.duration;
        
        return `${timestamp},${level},${operation},${message},${duration}`;
      }).join('\n');
      
      await fs.writeFile(filepath, header + rows);
      console.log(`📊 CSV logs exported to: ${filepath}`);
    } catch (error) {
      console.error('Failed to export CSV logs:', error.message);
    }
  }

  // Utility methods for common migration operations
  async logTableModification(tableName, operation, recordsAffected = 0) {
    await this.logSuccess(
      `TABLE_${operation.toUpperCase()}`,
      `${operation} completed on table ${tableName}`,
      { tableName, operation },
      { recordsProcessed: recordsAffected, tablesModified: 1 }
    );
  }

  async logIndexOperation(indexName, operation) {
    await this.logSuccess(
      `INDEX_${operation.toUpperCase()}`,
      `Index ${indexName} ${operation}`,
      { indexName, operation }
    );
  }

  async logConstraintOperation(constraintName, tableName, operation) {
    await this.logSuccess(
      `CONSTRAINT_${operation.toUpperCase()}`,
      `Constraint ${constraintName} ${operation} on table ${tableName}`,
      { constraintName, tableName, operation }
    );
  }

  async logDataMigration(tableName, recordsMigrated, totalRecords) {
    const percentage = totalRecords > 0 ? ((recordsMigrated / totalRecords) * 100).toFixed(2) : 100;
    
    await this.logSuccess(
      'DATA_MIGRATION',
      `Migrated ${recordsMigrated}/${totalRecords} records (${percentage}%) in ${tableName}`,
      { tableName, recordsMigrated, totalRecords, percentage },
      { recordsProcessed: recordsMigrated, tablesModified: 1 }
    );
  }

  async logValidationCheck(checkName, passed, total, details = null) {
    const percentage = total > 0 ? ((passed / total) * 100).toFixed(2) : 100;
    const status = percentage === '100.00' ? 'PASS' : percentage >= '95.00' ? 'WARNING' : 'FAIL';
    
    await this.logValidationResult(
      checkName,
      status,
      `Validation ${status}: ${passed}/${total} checks passed (${percentage}%)`,
      { checkName, passed, total, percentage, ...details }
    );
  }

  // Method to create child logger for sub-operations
  createChildLogger(subOperation) {
    const childLogger = new MigrationLogger(`${this.operationType}-${subOperation}`, {
      ...this.options,
      logToFile: false, // Child loggers don't write to separate files
      exportLogs: false // Child loggers don't export separate reports
    });
    
    // Share session ID and start time
    childLogger.sessionId = `${this.sessionId}-${subOperation}`;
    childLogger.startTime = this.startTime;
    
    return childLogger;
  }

  // Method to merge child logger results
  mergeChildLogger(childLogger) {
    this.logs.push(...childLogger.logs);
    
    // Merge metrics
    this.metrics.totalOperations += childLogger.metrics.totalOperations;
    this.metrics.successfulOperations += childLogger.metrics.successfulOperations;
    this.metrics.failedOperations += childLogger.metrics.failedOperations;
    this.metrics.warningOperations += childLogger.metrics.warningOperations;
    this.metrics.recordsProcessed += childLogger.metrics.recordsProcessed;
    this.metrics.tablesModified += childLogger.metrics.tablesModified;
  }
}

module.exports = MigrationLogger;