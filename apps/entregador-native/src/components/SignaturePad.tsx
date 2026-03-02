import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear?: () => void;
}

export default function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const viewRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths([...paths, currentPath]);
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    onClear?.();
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
      }
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
    }
  };

  const allPaths = currentPath ? [...paths, currentPath] : paths;
  const isEmpty = allPaths.length === 0;

  return (
    <View style={styles.container}>
      <Surface style={styles.signatureContainer}>
        <View ref={viewRef} style={styles.canvas} {...panResponder.panHandlers}>
          <Svg height="200" width="100%">
            {allPaths.map((path, index) => (
              <Path
                key={index}
                d={path}
                stroke="#1f2937"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
          {isEmpty && (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>✍️ Assine aqui com o dedo</Text>
            </View>
          )}
        </View>
      </Surface>
      <View style={styles.buttons}>
        <Button
          mode="outlined"
          onPress={handleClear}
          style={styles.clearButton}
          textColor="#dc2626"
          disabled={isEmpty}
        >
          🗑️ Limpar
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.confirmButton}
          buttonColor="#059669"
          disabled={isEmpty}
        >
          ✓ Confirmar Assinatura
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  signatureContainer: {
    height: 200,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
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
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    flex: 1,
    borderColor: '#dc2626',
  },
  confirmButton: {
    flex: 2,
  },
});
