import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Banner } from 'react-native-paper';
import { useOffline } from '../contexts/OfflineContext';

export default function OfflineIndicator() {
  const {
    isOnline,
    pendingOperations,
    failedOperations,
    totalOperations,
    isSyncing,
    lastSyncError,
    syncPendingOperations,
  } = useOffline();

  if (isOnline && pendingOperations === 0 && failedOperations === 0 && !isSyncing) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <Banner visible={true} icon="wifi-off" style={styles.offlineBanner}>
          Voce esta offline.{' '}
          {totalOperations > 0
            ? `${totalOperations} entrega(s) estao salvas neste aparelho.`
            : 'As entregas serao salvas neste aparelho.'}
        </Banner>
      )}

      {isOnline && isSyncing && (
        <Banner visible={true} icon="sync" style={styles.syncBanner}>
          Sincronizando entregas pendentes...
        </Banner>
      )}

      {isOnline && !isSyncing && pendingOperations > 0 && (
        <Banner
          visible={true}
          icon="sync"
          style={styles.syncBanner}
          actions={[
            {
              label: 'Sincronizar Agora',
              onPress: syncPendingOperations,
            },
          ]}
        >
          {pendingOperations} entrega(s) aguardando sincronizacao
          {lastSyncError ? `\nUltimo erro: ${lastSyncError}` : ''}
        </Banner>
      )}

      {isOnline && !isSyncing && pendingOperations === 0 && failedOperations > 0 && (
        <Banner visible={true} icon="alert-circle" style={styles.errorBanner}>
          {failedOperations} entrega(s) precisam de acao antes de sincronizar.
          {lastSyncError ? `\nErro: ${lastSyncError}` : ''}
        </Banner>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
  },
  syncBanner: {
    backgroundColor: '#dbeafe',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
  },
});
