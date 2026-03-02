import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Banner, Button } from 'react-native-paper';
import { useOffline } from '../contexts/OfflineContext';

export default function OfflineIndicator() {
  const { isOnline, pendingOperations, syncPendingOperations } = useOffline();

  if (isOnline && pendingOperations === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <Banner
          visible={true}
          icon="wifi-off"
          style={styles.offlineBanner}
        >
          Você está offline. As entregas serão sincronizadas quando voltar online.
        </Banner>
      )}
      
      {isOnline && pendingOperations > 0 && (
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
          {pendingOperations} entrega(s) aguardando sincronização
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
});
