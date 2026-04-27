import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Text } from 'react-native-paper';
import QRScanner from '../components/QRScanner';

interface Filtro {
  escopoRotas?: string;
  rotaIds?: number[] | string;
  rotaNome?: string;
  rotaNomes?: string[];
  dataInicio: string;
  dataFim: string;
}

interface ModuleCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function ModuleCard({ icon, title, subtitle, onPress }: ModuleCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.modCard} activeOpacity={0.82}>
      <Text style={styles.modIcon}>{icon}</Text>
      <Text variant="titleSmall" style={styles.modTitle}>{title}</Text>
      <Text variant="bodySmall" style={styles.modSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const [showScanner, setShowScanner] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<Filtro | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState('');

  useEffect(() => {
    carregarDados();

    const unsubscribe = navigation.addListener('focus', () => {
      carregarDados();
    });

    return unsubscribe;
  }, [navigation]);

  const carregarDados = async () => {
    try {
      const filtro = await AsyncStorage.getItem('filtro_qrcode');

      if (filtro) {
        setFiltroAtivo(JSON.parse(filtro));
      } else {
        setFiltroAtivo(null);
      }

      const token = await AsyncStorage.getItem('token');
      if (token) {
        const parsed = JSON.parse(token);
        setNomeUsuario(parsed.nome || 'Usuario');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const handleQRScan = (data: Filtro) => {
    setFiltroAtivo(data);
    setShowScanner(false);
    navigation.navigate('OpcoesFiltro', { filtro: data });
  };

  const formatarPeriodo = (inicio: string, fim: string): string => {
    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');
    return `${fmt(inicio)} - ${fmt(fim)}`;
  };

  const formatarRotas = (filtro: Filtro): string => {
    if (filtro.escopoRotas === 'todas' || filtro.rotaIds === 'todas') {
      return 'Todas as Rotas';
    }

    if (filtro.rotaNomes && filtro.rotaNomes.length > 1) {
      return `Rotas: ${filtro.rotaNomes.join(', ')}`;
    }

    return `Rota: ${filtro.rotaNome ?? filtro.rotaNomes?.[0] ?? 'N/A'}`;
  };

  const usuario = nomeUsuario || 'Usuario';
  const modules = [
    {
      icon: '\uD83D\uDCE6',
      title: 'Estoque central',
      subtitle: 'Entradas e saidas',
      route: 'EstoqueCentral' as const,
    },
    {
      icon: '\uD83D\uDCE5',
      title: 'Recebimentos',
      subtitle: 'Registrar pedidos',
      route: 'Recebimentos' as const,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <View>
          <Text variant="bodySmall" style={styles.topbarGreeting}>
            Bom dia
          </Text>
          <Text variant="titleMedium" style={styles.topbarName}>
            {usuario}
          </Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {usuario.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filtroAtivo ? (
          <Card style={styles.filtroCard}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.filtroLabel}>Filtro ativo</Text>
              <Text variant="titleMedium" style={styles.filtroTitle}>
                {formatarRotas(filtroAtivo)}
              </Text>
              <Text variant="bodySmall" style={styles.filtroPeriodo}>
                {formatarPeriodo(filtroAtivo.dataInicio, filtroAtivo.dataFim)}
              </Text>
              <Button
                mode="contained"
                icon="eye"
                onPress={() => navigation.navigate('OpcoesFiltro', { filtro: filtroAtivo })}
                style={styles.filtroBtn}
                buttonColor="#27500A"
                textColor="#EAF3DE"
              >
                Ver entregas
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.noFiltroCard}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.noFiltroLabel}>Nenhum filtro ativo</Text>
              <Text variant="titleMedium" style={styles.noFiltroTitle}>
                Escaneie um QR Code
              </Text>
              <Text variant="bodySmall" style={styles.noFiltroText}>
                O filtro sera aplicado automaticamente
              </Text>
              <Button
                mode="contained"
                icon="qrcode-scan"
                onPress={() => setShowScanner(true)}
                style={styles.noFiltroBtn}
                buttonColor="#633806"
                textColor="#FAEEDA"
              >
                Escanear QR Code
              </Button>
            </Card.Content>
          </Card>
        )}

        <Text variant="labelSmall" style={styles.sectionLabel}>Modulos</Text>

        <View style={styles.modulesGrid}>
          {modules.map((mod) => (
            <ModuleCard
              key={mod.route}
              icon={mod.icon}
              title={mod.title}
              subtitle={mod.subtitle}
              onPress={() => navigation.navigate(mod.route)}
            />
          ))}
        </View>

        <Card style={styles.instructionCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.instructionTitle}>
              Como comecar
            </Text>
            <Text variant="bodySmall" style={styles.instructionText}>
              Escaneie o QR Code, o filtro sera aplicado automaticamente e voce vera as entregas do periodo.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <QRScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topbar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topbarGreeting: {
    color: '#666',
  },
  topbarName: {
    fontWeight: '500',
    color: '#111',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#B5D4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0C447C',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  filtroCard: {
    marginBottom: 10,
    backgroundColor: '#EAF3DE',
    borderWidth: 0.5,
    borderColor: '#C0DD97',
    borderRadius: 14,
    elevation: 0,
  },
  filtroLabel: {
    color: '#3B6D11',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  filtroTitle: {
    fontWeight: '500',
    color: '#27500A',
    marginBottom: 2,
  },
  filtroPeriodo: {
    color: '#3B6D11',
    marginBottom: 12,
  },
  filtroBtn: {
    marginTop: 4,
    borderRadius: 8,
  },
  noFiltroCard: {
    marginBottom: 10,
    backgroundColor: '#FAEEDA',
    borderWidth: 0.5,
    borderColor: '#FAC775',
    borderRadius: 14,
    elevation: 0,
  },
  noFiltroLabel: {
    color: '#854F0B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noFiltroTitle: {
    fontWeight: '500',
    color: '#633806',
    marginBottom: 2,
  },
  noFiltroText: {
    color: '#854F0B',
    marginBottom: 12,
  },
  noFiltroBtn: {
    marginTop: 4,
    borderRadius: 8,
  },
  sectionLabel: {
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  modCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 12,
    gap: 4,
  },
  modIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  modTitle: {
    fontWeight: '500',
    color: '#111',
  },
  modSubtitle: {
    color: '#666',
  },
  instructionCard: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 0,
    elevation: 0,
  },
  instructionTitle: {
    fontWeight: '500',
    color: '#444',
    marginBottom: 6,
  },
  instructionText: {
    color: '#666',
    lineHeight: 20,
  },
});
