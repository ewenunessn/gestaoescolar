import AppRouter from "./routes/AppRouter";
import { ConfigProvider } from "./contexts/ConfigContext";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryProvider } from "./providers/QueryProvider";
import { RealtimeProvider } from "./providers/RealtimeProvider";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './theme/theme';
import { ToastContainer as ReactToastifyContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UpdateNotification from './components/UpdateNotification';
import DesktopDownloadNotifications from './components/DesktopDownloadNotifications';
import ErrorBoundary from './components/ErrorBoundary';
import { CustomThemeProvider, useThemePreference } from './contexts/ThemeContext';

interface AppProps {
  routerConfig?: {
    future: {
      v7_startTransition: boolean;
      v7_relativeSplatPath: boolean;
    };
  };
}

export default function App({ routerConfig }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryProvider>
          <RealtimeProvider>
            <CustomThemeProvider>
              <AppWithTheme routerConfig={routerConfig} />
            </CustomThemeProvider>
          </RealtimeProvider>
        </QueryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppWithTheme({ routerConfig }: AppProps) {
  const { mode } = useThemePreference();
  const theme = createAppTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PageTitleProvider>
        <ConfigProvider>
          <AppRouter routerConfig={routerConfig} />
          <UpdateNotification />
          <DesktopDownloadNotifications />
          <ReactToastifyContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={mode}
            style={{ zIndex: 9999 }}
          />
        </ConfigProvider>
      </PageTitleProvider>
    </ThemeProvider>
  );
}
