import { useEffect } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';

export default function DesktopDownloadNotifications() {
  useEffect(() => {
    const desktopShell = window.desktopShell;
    if (!desktopShell?.isDesktop) return undefined;

    const unsubscribeComplete = desktopShell.onDownloadComplete?.(({ fileName, filePath }) => {
      toast.success(
        <Stack spacing={0.75}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Arquivo salvo: {fileName}
          </Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all', opacity: 0.85 }}>
            {filePath}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              desktopShell.showItemInFolder?.(filePath);
            }}
            sx={{ alignSelf: 'flex-start', mt: 0.25 }}
          >
            Abrir pasta
          </Button>
        </Stack>,
        { autoClose: 9000 },
      );
    });

    const unsubscribeCancelled = desktopShell.onDownloadCancelled?.(({ fileName }) => {
      toast.info(`Download cancelado: ${fileName}`, { autoClose: 3500 });
    });

    const unsubscribeFailed = desktopShell.onDownloadFailed?.(({ fileName }) => {
      toast.error(`Nao foi possivel salvar: ${fileName}`);
    });

    return () => {
      unsubscribeComplete?.();
      unsubscribeCancelled?.();
      unsubscribeFailed?.();
    };
  }, []);

  return null;
}
