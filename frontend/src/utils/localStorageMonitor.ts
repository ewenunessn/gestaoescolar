// Monitor de localStorage para debug
// Este arquivo adiciona logs detalhados sobre mudanças no localStorage

// Array global para armazenar logs
if (typeof window !== 'undefined') {
  (window as any).debugLogs = [];
  
  const addLog = (message: string, data?: any) => {
    const log = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    (window as any).debugLogs.push(log);
    console.log(message, data || '');
  };

  // Salvar referências originais
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  const originalClear = localStorage.clear;

  // Override setItem
  localStorage.setItem = function(key: string, value: string) {
    if (key === 'token' || key === 'user') {
      const logMsg = `💾 [localStorage] setItem("${key}")`;
      const logData = {
        value: key === 'token' ? value.substring(0, 30) + '...' : 'user data',
        stack: new Error().stack?.split('\n').slice(2, 5).join('\n')
      };
      addLog(logMsg, logData);
    }
    return originalSetItem.apply(this, [key, value]);
  };

  // Override removeItem
  localStorage.removeItem = function(key: string) {
    if (key === 'token' || key === 'user') {
      const logMsg = `🗑️ [localStorage] removeItem("${key}")`;
      addLog(logMsg);
      console.trace('Stack trace:');
    }
    return originalRemoveItem.apply(this, [key]);
  };

  // Override clear
  localStorage.clear = function() {
    const logMsg = '🗑️ [localStorage] clear() - TODOS OS DADOS REMOVIDOS';
    addLog(logMsg);
    console.trace('Stack trace:');
    return originalClear.apply(this);
  };

  addLog('👁️ [localStorage] Monitor ativado');
  
  // Função para exportar logs
  (window as any).exportLogs = () => {
    console.log('📋 TODOS OS LOGS:');
    console.log(JSON.stringify((window as any).debugLogs, null, 2));
    return (window as any).debugLogs;
  };
  
  console.log('💡 Use window.exportLogs() para ver todos os logs salvos');
}

export {};
