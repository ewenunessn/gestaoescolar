import AppRouter from "./routes/AppRouter";
import { NotificationProvider } from "./context/NotificationContext";
import { ConfigProvider } from "./context/ConfigContext";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import { QueryProvider } from "./providers/QueryProvider";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import { ToastContainer as ReactToastifyContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
        <PageTitleProvider>
          <NotificationProvider>
            <ConfigProvider>
              <AppRouter routerConfig={routerConfig} />
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
                theme="light"
                style={{ zIndex: 9999 }}
              />
            </ConfigProvider>
          </NotificationProvider>
        </PageTitleProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
