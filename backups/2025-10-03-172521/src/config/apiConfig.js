// Configuración de API basada en el entorno
const API_CONFIG = {
  development: {
    BASE_URL: 'http://numericaapi.kretosstechnology.com',
    PAYROLL_API: 'http://numericaapi.kretosstechnology.com/api/payroll',
    EMPLOYEES_API: 'http://numericaapi.kretosstechnology.com/api/employees',
    DEMOGRAPHICS_API: 'http://numericaapi.kretosstechnology.com/api/demographics',
    PROFILE_API: 'http://numericaapi.kretosstechnology.com/api/profile',
  },
  production: {
    BASE_URL: process.env.REACT_APP_API_URL || 'http://numericaapi.kretosstechnology.com',
    PAYROLL_API: (process.env.REACT_APP_API_URL || 'http://numericaapi.kretosstechnology.com') + '/api',
    EMPLOYEES_API: (process.env.REACT_APP_API_URL || 'http://numericaapi.kretosstechnology.com') + '/api',
    DEMOGRAPHICS_API: (process.env.REACT_APP_API_URL || 'http://numericaapi.kretosstechnology.com') + '/api',
    PROFILE_API: (process.env.REACT_APP_API_URL || 'http://numericaapi.kretosstechnology.com') + '/api',
  }
};

// Detectar el entorno actual
const getCurrentEnv = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  if (process.env.REACT_APP_ENV === 'production') {
    return 'production';
  }
  
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
