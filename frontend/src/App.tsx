import AppRouter from "./routes/AppRouter";
import { CarrinhoProvider } from "./context/CarrinhoContext";
import { NotificationProvider } from "./context/NotificationContext";
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
        <CarrinhoProvider>
          <AppRouter routerConfig={routerConfig} />
          <ToastContainer />
        </CarrinhoProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
