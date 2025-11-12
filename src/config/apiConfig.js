// ✅ UPDATED: Use Render API URL for all environments
const LOCAL_API_URL = 'http://numericaapi.kretosstechnology.com:3001';
const RENDER_API_URL = 'http://numericaapi.kretosstechnology.com:3001';

// ✅ UPDATED: Always use Render API (no localhost option)
// All environments now use http://numericaapi.kretosstechnology.com:3001
const USE_RENDER = true; // Always use Render

// CONFIGURACIÓN PARA DESARROLLO Y PRODUCCIÓN
// ✅ UPDATED: Both development and production now use http://numericaapi.kretosstechnology.com:3001
const API_CONFIG = {
  development: {
    // ✅ UPDATED: Always use Render API
    BASE_URL: RENDER_API_URL,
    PAYROLL_API: `${RENDER_API_URL}/api/payroll`,
    EMPLOYEES_API: `${RENDER_API_URL}/api/employees`,
    DEMOGRAPHICS_API: `${RENDER_API_URL}/api/demographics`,
    PROFILE_API: `${RENDER_API_URL}/api/profile`,
  },
  production: {
    // ✅ UPDATED: Always use Render API
    BASE_URL: RENDER_API_URL,
    PAYROLL_API: `${RENDER_API_URL}/api/payroll`,
    EMPLOYEES_API: `${RENDER_API_URL}/api/employees`,
    DEMOGRAPHICS_API: `${RENDER_API_URL}/api/demographics`,
    PROFILE_API: `${RENDER_API_URL}/api/profile`,
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
    const protocol = window.location.protocol;
    
    // Check for localhost first (most common in development)
    // Use development mode when on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return 'development';
    }
    
    // Production domains - check for known production hosts
    if (hostname.includes('vercel.app') ||
        hostname.includes('cloudfront.net') || 
        hostname.includes('amazonaws.com') ||
        hostname.includes('onrender.com') ||
        hostname.includes('numerica.global') ||
        hostname.includes('netlify.app') ||
        hostname.includes('github.io') ||
        // If using HTTPS and not localhost, assume production
        (protocol === 'https:' && hostname !== 'localhost')) {
      return 'production';
    }
  }
  
  // Default to production if NODE_ENV is production (for build-time)
  // Otherwise default to development (but development config also uses Render by default)
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
};

// Obtener la configuración actual
const getApiConfig = () => {
  const env = getCurrentEnv();
  
  // ✅ DEBUG: Log environment detection (only in browser)
  if (typeof window !== 'undefined') {
    console.log('🔍 [API Config] Environment Detection:', {
      detectedEnv: env,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      nodeEnv: process.env.NODE_ENV,
      reactAppEnv: process.env.REACT_APP_ENV,
      baseUrl: API_CONFIG[env].BASE_URL
    });
  }
  
  return API_CONFIG[env];
};

export const apiConfig = getApiConfig();
export const isProduction = getCurrentEnv() === 'production';

// ✅ UPDATED: Both development and production use http://numericaapi.kretosstechnology.com:3001

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
  
  // Construir la URL completa
  let fullUrl;
  if (endpoint.startsWith('/api')) {
    fullUrl = apiConfig.BASE_URL + endpoint;
  } else {
    // Para otros casos, asumir que necesita /api como prefijo
    fullUrl = apiConfig.BASE_URL + '/api/' + endpoint.replace(/^\//, '');
  }
  
  // ✅ DEBUG: Log URL construction (only in development or if explicitly enabled)
  if (typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' || 
    window.location.hostname.includes('localhost') ||
    localStorage.getItem('DEBUG_API_URLS') === 'true'
  )) {
    console.log('🔗 [buildApiUrl] URL Construction:', {
      endpoint,
      baseUrl: apiConfig.BASE_URL,
      fullUrl,
      environment: getCurrentEnv()
    });
  }
  
  return fullUrl;
};

export default apiConfig;
