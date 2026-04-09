// Monitor de localStorage para debug
// Este arquivo adiciona logs detalhados sobre mudanças no localStorage

if (typeof window !== 'undefined') {
  // Salvar referências originais
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  const originalClear = localStorage.clear;

  // Override setItem
  localStorage.setItem = function(key: string, value: string) {
    if (key === 'token' || key === 'user') {
      console.log(`💾 [localStorage] setItem("${key}")`, {
        value: key === 'token' ? value.substring(0, 30) + '...' : 'user data',
        stack: new Error().stack?.split('\n').slice(2, 5).join('\n')
      });
    }
    return originalSetItem.apply(this, [key, value]);
  };

  // Override removeItem
  localStorage.removeItem = function(key: string) {
    if (key === 'token' || key === 'user') {
      console.error(`🗑️ [localStorage] removeItem("${key}")`);
      console.trace('Stack trace:');
    }
    return originalRemoveItem.apply(this, [key]);
  };

  // Override clear
  localStorage.clear = function() {
    console.error('🗑️ [localStorage] clear() - TODOS OS DADOS REMOVIDOS');
    console.trace('Stack trace:');
    return originalClear.apply(this);
  };

  console.log('👁️ [localStorage] Monitor ativado');
}

export {};
