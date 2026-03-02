import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Portal, Modal } from 'react-native-paper';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: any) => void;
}

export default function QRScanner({ visible, onClose, onScan }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    
    try {
      const qrData = JSON.parse(data);
      
      // Aceitar QR Code com rotaId (formato do frontend)
      if (qrData.rotaId && qrData.dataInicio && qrData.dataFim) {
        await AsyncStorage.setItem('filtro_qrcode', data);
        Alert.alert(
          'Filtro Aplicado',
          `Rota: ${qrData.rotaNome}\nPeríodo: ${new Date(qrData.dataInicio).toLocaleDateString('pt-BR')} até ${new Date(qrData.dataFim).toLocaleDateString('pt-BR')}`,
          [{ text: 'OK', onPress: () => {
            onScan(qrData);
            onClose();
          }}]
        );
      } else {
        Alert.alert('QR Code Inválido', 'Este QR Code não contém informações válidas de rota e período.');
        setScanned(false);
      }
    } catch (err) {
      Alert.alert('Erro', 'QR Code inválido ou mal formatado.');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
          <Text>Solicitando permissão da câmera...</Text>
        </Modal>
      </Portal>
    );
  }

  if (hasPermission === false) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
          <Text style={styles.errorText}>Sem acesso à câmera</Text>
          <Text style={styles.helpText}>
            Vá em Configurações → Expo Go → Permissões e ative a câmera
          </Text>
          <Button mode="contained" onPress={onClose} style={styles.button}>
            Fechar
          </Button>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.fullModal}>
        <View style={styles.container}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          
          <View style={styles.overlay}>
            <Text style={styles.title}>Escaneie o QR Code</Text>
            <Text style={styles.subtitle}>Posicione o QR Code dentro da área</Text>
            
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
          
          <View style={styles.footer}>
            {scanned && (
              <Button 
                mode="outlined" 
                onPress={() => setScanned(false)}
                style={styles.button}
                textColor="#fff"
              >
                Escanear Novamente
              </Button>
            )}
            <Button 
              mode="contained" 
              onPress={onClose}
              style={styles.button}
            >
              Cancelar
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  fullModal: {
    flex: 1,
    margin: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4caf50',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 12,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
});
