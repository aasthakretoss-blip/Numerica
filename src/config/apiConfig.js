// URL de API - Usar variable de entorno de .env files
// REACT_APP_API_URL se configura en .env.production o .env.development
const PRODUCTION_API_URL = process.env.REACT_APP_API_URL || 'https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com';

// CONFIGURACIÓN PARA DESARROLLO Y PRODUCCIÓN
const API_CONFIG = {
  development: {
    // Usar api-server local en desarrollo o API desde .env
    BASE_URL: process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : (process.env.REACT_APP_API_URL || 'https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com'),
    PAYROLL_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : (process.env.REACT_APP_API_URL || 'https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com')) + '/api/payroll',
    EMPLOYEES_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : (process.env.REACT_APP_API_URL || 'https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com')) + '/api/employees',
    DEMOGRAPHICS_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : (process.env.REACT_APP_API_URL || 'https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com')) + '/api/demographics',
    PROFILE_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : (process.env.REACT_APP_API_URL || 'https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com')) + '/api/profile',
  },
  production: {
    // SIEMPRE usar REACT_APP_API_URL de .env.production en builds de producción
    BASE_URL: PRODUCTION_API_URL,
    PAYROLL_API: PRODUCTION_API_URL + '/api/payroll',
    EMPLOYEES_API: PRODUCTION_API_URL + '/api/employees',
    DEMOGRAPHICS_API: PRODUCTION_API_URL + '/api/demographics',
    PROFILE_API: PRODUCTION_API_URL + '/api/profile',
  }
};

// Detectar el entorno actual
const getCurrentEnv = () => {
  // Priority 1: Explicit environment variable (most reliable)
  if (process.env.REACT_APP_ENV === 'production') {
    return 'production';
  }
  if (process.env.REACT_APP_ENV === 'development') {
    return 'development';
  }
  
  // Priority 2: NODE_ENV (set during build)
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // Priority 3: Hostname check (only if window is available)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    // Production domains
    if (hostname.includes('cloudfront.net') || 
        hostname.includes('amazonaws.com') ||
        (hostname !== 'localhost' && window.location.protocol === 'https:')) {
      return 'production';
    }
  }
  
  // Default to development for safety
  return 'development';
};

// Obtener la configuración actual
const getApiConfig = () => {
  const env = getCurrentEnv();
  console.log(`🌍 Usando configuración de API para entorno: ${env}`);
  return API_CONFIG[env];
};

export const apiConfig = getApiConfig();
export const isProduction = getCurrentEnv() === 'production';

// URLs específicas para compatibilidad con el código existente
export const API_BASE_URL = apiConfig.BASE_URL;
export const PAYROLL_API_URL = apiConfig.PAYROLL_API;
export const EMPLOYEES_API_URL = apiConfig.EMPLOYEES_API;
export const DEMOGRAPHICS_API_URL = apiConfig.DEMOGRAPHICS_API;
export const PROFILE_API_URL = apiConfig.PROFILE_API;

// Función helper para construir URLs de API
export const buildApiUrl = (endpoint) => {
  // Validar que el endpoint no sea undefined o null
  if (!endpoint || typeof endpoint !== 'string') {
    console.error('❌ buildApiUrl: endpoint es undefined, null o no es string:', endpoint);
    throw new Error('buildApiUrl requiere un endpoint válido (string)');
  }
  
  // Si el endpoint ya es una URL completa, usarla tal como está
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // Si el endpoint comienza con /api, usar la base URL
  if (endpoint.startsWith('/api')) {
    return apiConfig.BASE_URL + endpoint;
  }
  
  // Para otros casos, asumir que necesita /api como prefijo
  return apiConfig.BASE_URL + '/api/' + endpoint.replace(/^\//, '');
};

// Log de configuración para debug
console.log('🔧 API Configuration:', {
  environment: getCurrentEnv(),
  isProduction,
  baseUrl: API_BASE_URL,
  payrollApi: PAYROLL_API_URL,
  reactAppApiUrl: process.env.REACT_APP_API_URL,
  nodeEnv: process.env.NODE_ENV,
  reactAppEnv: process.env.REACT_APP_ENV
});

export default apiConfig;
