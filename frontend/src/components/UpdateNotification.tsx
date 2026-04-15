import { useEffect, useState } from 'react';
import { Snackbar, Alert, LinearProgress, Box, Typography } from '@mui/material';

export default function UpdateNotification() {
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Verificar se está rodando no Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const electronAPI = (window as any).electronAPI;

      // Obter versão do app
      electronAPI.getAppVersion().then((version: string) => {
        setAppVersion(version);
      });

      // Listener para download de atualização
      electronAPI.onUpdateDownloading(() => {
        setUpdateDownloading(true);
      });

      // Listener para progresso do download
      electronAPI.onUpdateProgress((percent: number) => {
        setDownloadProgress(percent);
      });

      // Cleanup
      return () => {
        electronAPI.removeAllListeners('update-downloading');
        electronAPI.removeAllListeners('update-progress');
      };
    }
  }, []);

  if (!updateDownloading) return null;

  return (
    <Snackbar
      open={updateDownloading}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert severity="info" sx={{ width: '100%', minWidth: 300 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Baixando atualização...
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={downloadProgress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'right' }}>
            {Math.round(downloadProgress)}%
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
}
