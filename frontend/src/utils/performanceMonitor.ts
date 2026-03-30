// Performance monitoring utilities
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  private static enabled = process.env.NODE_ENV === 'development';

  static start(label: string): void {
    if (!this.enabled) return;
    this.timers.set(label, performance.now());
  }

  static end(label: string): number {
    if (!this.enabled) return 0;
    
    const startTime = this.timers.get(label);
    if (!startTime) {
      // Don't warn for missing timers, just return 0
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);
    
    // Log com cores baseadas na performance
    const color = duration < 50 ? '#22c55e' : duration < 200 ? '#f59e0b' : '#ef4444';
    console.log(`%c⚡ ${label}: ${duration.toFixed(2)}ms`, `color: ${color}; font-weight: bold`);
    
    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    if (!this.enabled) return fn();
    
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }

  static logMemoryUsage(label: string): void {
    if (!this.enabled || !('memory' in performance)) return;
    
    const memory = (performance as any).memory;
    console.log(`📊 ${label} - Memória:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
    });
  }
}

// Hook para monitorar re-renders
export function useRenderCount(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const renderCount = React.useRef(0);
  renderCount.current++;
  
  console.log(`🔄 ${componentName} renderizado ${renderCount.current} vez(es)`);
}

// Hook para detectar mudanças desnecessárias
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const previousProps = React.useRef<Record<string, any>>();
  
  React.useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        console.log(`🔍 ${name} - Props alteradas:`, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

import React from 'react';