// URL de API - FORZAR uso de Render (numerica-2.onrender.com)
// NO usar AWS endpoints antiguos
const RENDER_API_URL = 'https://numerica-2.onrender.com';

// CONFIGURACIÓN PARA DESARROLLO Y PRODUCCIÓN
const API_CONFIG = {
  development: {
    // Usar api-server local en desarrollo, sino Render
    BASE_URL: process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : RENDER_API_URL,
    PAYROLL_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : RENDER_API_URL) + '/api/payroll',
    EMPLOYEES_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : RENDER_API_URL) + '/api/employees',
    DEMOGRAPHICS_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : RENDER_API_URL) + '/api/demographics',
    PROFILE_API: (process.env.REACT_APP_USE_LOCAL === 'true' ? 'http://localhost:3001' : RENDER_API_URL) + '/api/profile',
  },
  production: {
    // SIEMPRE usar Render en producción
    BASE_URL: RENDER_API_URL,
    PAYROLL_API: RENDER_API_URL + '/api/payroll',
    EMPLOYEES_API: RENDER_API_URL + '/api/employees',
    DEMOGRAPHICS_API: RENDER_API_URL + '/api/demographics',
    PROFILE_API: RENDER_API_URL + '/api/profile',
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
    // Check for localhost first (most common in development)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return 'development';
    }
    // Production domains
    if (hostname.includes('cloudfront.net') || 
        hostname.includes('amazonaws.com') ||
        hostname.includes('onrender.com') ||
        hostname.includes('numerica.global') ||
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
  return API_CONFIG[env];
};

export const apiConfig = getApiConfig();
export const isProduction = getCurrentEnv() === 'production';

// API URL will be:
// - http://localhost:3001 if REACT_APP_USE_LOCAL=true in development
// - https://numerica-2.onrender.com in production or if REACT_APP_USE_LOCAL is not set

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

export default apiConfig;
