import AppRouter from "./routes/AppRouter";
import { NotificationProvider } from "./context/NotificationContext";
import { ConfigProvider } from "./context/ConfigContext";
import { TenantProvider } from "./context/TenantContext";
import { QueryProvider } from "./providers/QueryProvider";
import ToastContainer from "./components/Toast";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';

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
    <QueryProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <ConfigProvider>
            <TenantProvider>
              <AppRouter routerConfig={routerConfig} />
              <ToastContainer />
            </TenantProvider>
          </ConfigProvider>
        </NotificationProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
