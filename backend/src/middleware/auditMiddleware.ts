/**
 * Audit Middleware
 * Automatically logs all tenant operations for audit trail
 */

import { Request, Response, NextFunction } from 'express';
import { tenantAuditService, AuditLogEntry, SecurityEvent } from '../services/tenantAuditService';

interface AuditableRequest extends Request {
  tenant?: any;
  user?: any;
  auditContext?: {
    operation?: string;
    entityType?: string;
    entityId?: string;
    skipAudit?: boolean;
  };
}

export class AuditMiddleware {
  
  /**
   * Main audit logging middleware
   */
  static auditLogger() {
    return async (req: AuditableRequest, res: Response, next: NextFunction) => {
      // Skip audit for certain endpoints
      if (req.path.includes('/health') || req.path.includes('/metrics')) {
        return next();
      }

      const startTime = Date.now();
      const originalSend = res.send;
      
      // Capture request data
      const requestData = {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        tenantId: req.tenant?.id,
        userId: req.user?.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      // Override response send to capture response data
      res.send = function(data: any) {
        const responseTime = Date.now() - startTime;
        
        // Don't wait for audit logging to complete
        setImmediate(async () => {
          try {
            await AuditMiddleware.logOperation(
              req,
              res,
              requestData,
              responseTime,
              data
            );
          } catch (error) {
            console.error('Audit logging failed:', error);
          }
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Log the operation based on request/response data
   */
  private static async logOperation(
    req: AuditableRequest,
    res: Response,
    requestData: any,
    responseTime: number,
    responseData: any
  ): Promise<void> {
    
    // Skip if explicitly disabled
    if (req.auditContext?.skipAudit) {
      return;
    }

    const operation = AuditMiddleware.determineOperation(req);
    const { entityType, entityId } = AuditMiddleware.extractEntityInfo(req);
    const category = AuditMiddleware.determineCategory(req.path);
    const severity = AuditMiddleware.determineSeverity(req.method, res.statusCode);

    // Create audit log entry
    const auditEntry: AuditLogEntry = {
      tenantId: requestData.tenantId,
      operation,
      entityType,
      entityId,
      userId: requestData.userId,
      ipAddress: requestData.ipAddress,
      userAgent: requestData.userAgent,
      severity,
      category,
      metadata: {
        method: requestData.method,
        path: requestData.path,
        statusCode: res.statusCode,
        responseTime,
        query: requestData.query,
        requestBody: requestData.body,
        responseSize: responseData ? JSON.stringify(responseData).length : 0
      }
    };

    // Add old/new values for update operations
    if (req.method === 'PUT' || req.method === 'PATCH') {
      auditEntry.newValues = requestData.body;
      // In a real implementation, you'd fetch the old values from the database
    }

    await tenantAuditService.logAuditEvent(auditEntry);

    // Check for security violations
    await AuditMiddleware.checkSecurityViolations(req, res, requestData);

    // Log performance metrics
    await AuditMiddleware.logPerformanceMetrics(
      requestData.tenantId,
      req.path,
      req.method,
      responseTime,
      res.statusCode
    );
  }

  /**
   * Determine operation type from request
   */
  private static determineOperation(req: AuditableRequest): string {
    if (req.auditContext?.operation) {
      return req.auditContext.operation;
    }

    const method = req.method.toLowerCase();
    const path = req.path.toLowerCase();

    // Map HTTP methods to operations
    switch (method) {
      case 'post':
        return 'create';
      case 'put':
      case 'patch':
        return 'update';
      case 'delete':
        return 'delete';
      case 'get':
        return path.includes('/search') ? 'search' : 'read';
      default:
        return method;
    }
  }

  /**
   * Extract entity information from request
   */
  private static extractEntityInfo(req: AuditableRequest): {
    entityType?: string;
    entityId?: string;
  } {
    if (req.auditContext?.entityType) {
      return {
        entityType: req.auditContext.entityType,
        entityId: req.auditContext.entityId
      };
    }

    const pathParts = req.path.split('/').filter(part => part);
    
    // Try to extract entity type from path
    let entityType: string | undefined;
    let entityId: string | undefined;

    // Common patterns: /api/tenants/123, /api/users/456, etc.
    if (pathParts.length >= 2) {
      entityType = pathParts[1]; // Skip 'api'
      
      if (pathParts.length >= 3 && pathParts[2] !== 'search') {
        entityId = pathParts[2];
      }
    }

    // Handle nested resources: /api/tenants/123/users/456
    if (pathParts.length >= 4) {
      entityType = pathParts[3];
      if (pathParts.length >= 5) {
        entityId = pathParts[4];
      }
    }

    return { entityType, entityId };
  }

  /**
   * Determine audit category from path
   */
  private static determineCategory(path: string): 'tenant_management' | 'user_management' | 'data_access' | 'security' | 'configuration' | 'system' {
    const lowerPath = path.toLowerCase();

    if (lowerPath.includes('/tenant')) {
      return 'tenant_management';
    }
    if (lowerPath.includes('/user') || lowerPath.includes('/auth')) {
      return 'user_management';
    }
    if (lowerPath.includes('/config')) {
      return 'configuration';
    }
    if (lowerPath.includes('/security') || lowerPath.includes('/audit')) {
      return 'security';
    }
    
    return 'data_access';
  }

  /**
   * Determine severity based on method and status code
   */
  private static determineSeverity(method: string, statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
    // Critical for security-related failures
    if (statusCode === 401 || statusCode === 403) {
      return 'critical';
    }

    // High for server errors
    if (statusCode >= 500) {
      return 'high';
    }

    // Medium for client errors
    if (statusCode >= 400) {
      return 'medium';
    }

    // Medium for destructive operations
    if (method === 'DELETE') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check for security violations
   */
  private static async checkSecurityViolations(
    req: AuditableRequest,
    res: Response,
    requestData: any
  ): Promise<void> {
    
    // Check for cross-tenant access attempts
    if (res.statusCode === 403 && requestData.tenantId) {
      const securityEvent: SecurityEvent = {
        type: 'cross_tenant_access',
        tenantId: requestData.tenantId,
        userId: requestData.userId,
        severity: 'high',
        ipAddress: requestData.ipAddress,
        userAgent: requestData.userAgent,
        details: {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode
        }
      };

      await tenantAuditService.logSecurityEvent(securityEvent);
    }

    // Check for unauthorized access attempts
    if (res.statusCode === 401) {
      const securityEvent: SecurityEvent = {
        type: 'unauthorized_access',
        tenantId: requestData.tenantId,
        userId: requestData.userId,
        severity: 'medium',
        ipAddress: requestData.ipAddress,
        userAgent: requestData.userAgent,
        details: {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode
        }
      };

      await tenantAuditService.logSecurityEvent(securityEvent);
    }

    // Check for suspicious activity (multiple failed attempts)
    if (res.statusCode === 401 || res.statusCode === 403) {
      await AuditMiddleware.checkSuspiciousActivity(requestData.ipAddress, requestData.tenantId);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private static async checkSuspiciousActivity(ipAddress: string, tenantId?: string): Promise<void> {
    if (!ipAddress) return;

    try {
      const db = require('../database');
      
      // Check for multiple failed attempts in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const result = await db.query(`
        SELECT COUNT(*) as failed_attempts
        FROM tenant_audit_log
        WHERE ip_address = $1
          AND created_at >= $2
          AND severity IN ('high', 'critical')
          AND category = 'security'
      `, [ipAddress, oneHourAgo]);

      const failedAttempts = parseInt(result.rows[0]?.failed_attempts || 0);

      if (failedAttempts >= 5) {
        const securityEvent: SecurityEvent = {
          type: 'suspicious_activity',
          tenantId,
          severity: failedAttempts >= 10 ? 'critical' : 'high',
          ipAddress,
          details: {
            failedAttempts,
            timeWindow: '1 hour',
            description: 'Multiple failed authentication/authorization attempts'
          }
        };

        await tenantAuditService.logSecurityEvent(securityEvent);
      }
    } catch (error) {
      console.error('Failed to check suspicious activity:', error);
    }
  }

  /**
   * Log performance metrics
   */
  private static async logPerformanceMetrics(
    tenantId: string,
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): Promise<void> {
    if (!tenantId) return;

    try {
      const db = require('../database');
      
      await db.query(`
        INSERT INTO tenant_performance_metrics (
          tenant_id, endpoint, method, response_time, status_code
        ) VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, endpoint, method, responseTime, statusCode]);
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
    }
  }

  /**
   * Middleware to set audit context
   */
  static setAuditContext(
    operation?: string,
    entityType?: string,
    entityId?: string
  ) {
    return (req: AuditableRequest, res: Response, next: NextFunction) => {
      req.auditContext = {
        operation,
        entityType,
        entityId
      };
      next();
    };
  }

  /**
   * Middleware to skip audit logging
   */
  static skipAudit() {
    return (req: AuditableRequest, res: Response, next: NextFunction) => {
      req.auditContext = { skipAudit: true };
      next();
    };
  }
}

export default AuditMiddleware;