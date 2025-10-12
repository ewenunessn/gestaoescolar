import AppRouter from "./routes/AppRouter";
import { NotificationProvider } from "./context/NotificationContext";
import ToastContainer from "./components/Toast";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from './theme/theme';
import { CustomThemeProvider, useTheme } from './contexts/ThemeContext';

interface AppProps {
  routerConfig?: {
    future: {
      v7_startTransition: boolean;
      v7_relativeSplatPath: boolean;
    };
  };
}

function AppContent({ routerConfig }: AppProps) {
  const { mode } = useTheme();
  const currentTheme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <NotificationProvider>
        <AppRouter routerConfig={routerConfig} />
        <ToastContainer />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default function App({ routerConfig }: AppProps) {
  return (
    <CustomThemeProvider>
      <AppContent routerConfig={routerConfig} />
    </CustomThemeProvider>
  );
}
