import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Modal, Dimensions, StatusBar } from 'react-native';
import { Button, Surface, Text, IconButton } from 'react-native-paper';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';
import * as ScreenOrientation from 'expo-screen-orientation';

interface SignaturePadProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
}

export default function SignaturePad({ visible, onClose, onSave }: SignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const viewRef = useRef<View>(null);
  const currentPathRef = useRef<string>('');

  // Forçar orientação horizontal quando o modal abrir
  useEffect(() => {
    if (visible) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      ScreenOrientation.unlockAsync();
    }
    
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, [visible]);

  const { width, height } = Dimensions.get('window');
  // Em modo paisagem, usar a maior dimensão como largura
  const canvasWidth = Math.max(width, height) - 40; // Margem lateral
  const canvasHeight = Math.min(width, height) - 120; // Espaço para header e botões

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `M${locationX},${locationY}`;
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const updatedPath = `${currentPathRef.current} L${locationX},${locationY}`;
        currentPathRef.current = updatedPath;
        setCurrentPath(updatedPath);
      },
      onPanResponderRelease: () => {
        const pathToSave = currentPathRef.current;
        if (pathToSave) {
          // Adicionar o caminho atual ao array de caminhos
          setPaths(prev => [...prev, pathToSave]);
          currentPathRef.current = '';
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleSave = async () => {
    if (paths.length === 0 && !currentPath) {
      return;
    }

    try {
      if (viewRef.current) {
        const uri = await captureRef(viewRef, {
          format: 'png',
          quality: 1,
        });
        onSave(uri);
        // Limpar após salvar
        setPaths([]);
        setCurrentPath('');
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
    }
  };

  const handleCancel = () => {
    setPaths([]);
    setCurrentPath('');
    if (onClose) {
      onClose();
    }
  };

  const allPaths = React.useMemo(() => {
    return currentPath ? [...paths, currentPath] : paths;
  }, [paths, currentPath]);
  
  const isEmpty = allPaths.length === 0;

  // Debug
  useEffect(() => {
    console.log('Paths:', paths.length, 'CurrentPath:', currentPath ? 'exists' : 'empty', 'AllPaths:', allPaths.length);
  }, [paths, currentPath, allPaths]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            ✍️ Assinatura do Recebedor
          </Text>
        </View>

        <Surface style={[styles.signatureContainer, { width: canvasWidth, height: canvasHeight }]}>
          <View ref={viewRef} style={styles.canvas} {...panResponder.panHandlers}>
            <Svg height={canvasHeight} width={canvasWidth}>
              {allPaths.map((path, index) => (
                <Path
                  key={index}
                  d={path}
                  stroke="#1f2937"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
            {isEmpty && (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>✍️ Assine aqui</Text>
              </View>
            )}
          </View>
        </Surface>

        <View style={styles.buttons}>
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.button}
            textColor="#666"
            compact
          >
            Cancelar
          </Button>
          <Button
            mode="outlined"
            onPress={handleClear}
            style={styles.button}
            textColor="#dc2626"
            disabled={isEmpty}
            compact
          >
            Limpar
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.button}
            buttonColor="#059669"
            disabled={isEmpty}
            compact
          >
            Confirmar
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  signatureContainer: {
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  button: {
    flex: 1,
  },
});
