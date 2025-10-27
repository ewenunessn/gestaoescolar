import AppRouter from "./routes/AppRouter";
import { NotificationProvider } from "./context/NotificationContext";
import { ConfigProvider } from "./context/ConfigContext";
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <ConfigProvider>
          <AppRouter routerConfig={routerConfig} />
          <ToastContainer />
        </ConfigProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
