interface ApiConfig {
  baseURL: string;
  healthURL: string;
  timeout: number;
  retries: number;
  isDevelopment: boolean;
  isProduction: boolean;
  isDesktop: boolean;
  debug: boolean;
}

type Environment = 'desktop' | 'development' | 'production';

interface ApiEnvOverrides {
  VITE_API_URL?: string;
  VITE_HEALTH_URL?: string;
  VITE_DEBUG?: string;
}

const getDesktopShell = () => {
  if (typeof window === 'undefined') return undefined;
  return window.desktopShell;
};

const getEnvironment = (): Environment => {
  if (getDesktopShell()?.isDesktop) {
    return 'desktop';
  }

  if (import.meta.env.VITE_VERCEL === 'true' || window.location.hostname.includes('vercel.app')) {
    return 'production';
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'development';
  }

  if (import.meta.env.MODE === 'desktop') return 'desktop';
  if (import.meta.env.MODE === 'production') return 'production';
  return 'development';
};

export const createApiConfigForEnvironment = (
  environment: Environment,
  env: ApiEnvOverrides = import.meta.env,
  desktopShell = getDesktopShell(),
): ApiConfig => {
  const isDesktop = environment === 'desktop';
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  let baseURL: string;
  let healthURL: string;

  if (isDesktop) {
    baseURL = desktopShell?.apiBaseURL || env.VITE_API_URL || 'http://127.0.0.1:3131/bff/web';
    healthURL = desktopShell?.healthURL || env.VITE_HEALTH_URL || 'http://127.0.0.1:3131/health';
  } else if (isDevelopment) {
    baseURL = env.VITE_API_URL || 'http://localhost:3000/bff/web';
    healthURL = env.VITE_HEALTH_URL || 'http://localhost:3000/health';
  } else {
    baseURL = env.VITE_API_URL || 'https://gestaoescolar-backend.vercel.app/bff/web';
    healthURL = env.VITE_HEALTH_URL || 'https://gestaoescolar-backend.vercel.app/health';
  }

  return {
    baseURL,
    healthURL,
    timeout: isDevelopment || isDesktop ? 30000 : 60000,
    retries: isDevelopment || isDesktop ? 2 : 3,
    isDevelopment,
    isProduction,
    isDesktop,
    debug: env.VITE_DEBUG === 'true' || isDevelopment,
  };
};

const createApiConfig = (): ApiConfig => createApiConfigForEnvironment(getEnvironment());

export const apiConfig = createApiConfig();

export const apiLog = (...args: any[]) => {
  if (apiConfig.debug) {
    console.log('[API]', ...args);
  }
};

export const apiError = (...args: any[]) => {
  if (apiConfig.debug) {
    console.error('[API ERROR]', ...args);
  }
};

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(apiConfig.healthURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      apiLog('API Health Check:', data);
      return data.status === 'ok';
    }

    return false;
  } catch (error) {
    apiError('Health check failed:', error);
    return false;
  }
};

export const environmentInfo = {
  mode: getEnvironment(),
  isDevelopment: apiConfig.isDevelopment,
  isProduction: apiConfig.isProduction,
  isDesktop: apiConfig.isDesktop,
  baseURL: apiConfig.baseURL,
  healthURL: apiConfig.healthURL,
  debug: apiConfig.debug,
  hostname: window.location.hostname,
  userAgent: navigator.userAgent,
};
