const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
    // Store rate limit data in memory by default
    // For production with multiple instances, use Redis
  });
};

// Security configurations
const SECURITY_CONFIG = {
  // Rate limits
  GENERAL_RATE_LIMIT: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    1000, // max 1000 requests per window
    'Demasiadas requests, intenta más tarde'
  ),
  
  AUTH_RATE_LIMIT: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // max 5 login attempts per window
    'Demasiados intentos de login, espera 15 minutos'
  ),
  
  UPLOAD_RATE_LIMIT: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // max 10 uploads per hour
    'Límite de uploads alcanzado, espera una hora'
  ),

  // CORS configuration for production
  CORS_CONFIG: {
    origin: function (origin, callback) {
      // Lista de dominios permitidos en producción
      const allowedOrigins = [
        'https://your-production-domain.com',
        'https://numerica-production.s3-website.amazonaws.com'
      ];
      
      // Durante desarrollo, permitir localhost
      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
      }
      
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Security headers
  HELMET_CONFIG: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://cognito-idp.us-east-1.amazonaws.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};

// Production security middleware
const enforceProduction = (req, res, next) => {
  // CRITICAL: Disable development bypass in production
  if (process.env.NODE_ENV === 'production') {
    // Ensure auth is properly configured
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
      console.error('🚨 CRITICAL: AWS Cognito not configured in production!');
      return res.status(500).json({
        error: 'Sistema no configurado correctamente',
        code: 'PRODUCTION_CONFIG_ERROR'
      });
    }
  }
  next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant requests
  const securityEvents = ['/auth/', '/login', '/admin/', '/upload'];
  const isSecurityEvent = securityEvents.some(event => req.path.includes(event));
  
  if (isSecurityEvent) {
    console.log(`🔐 SECURITY LOG: ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      user: req.user?.email || 'anonymous'
    });
  }
  
  // Monitor response times for potential attacks
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Requests taking more than 5 seconds
      console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms`, {
        ip: req.ip,
        user: req.user?.email || 'anonymous'
      });
    }
  });
  
  next();
};

// IP blocking middleware (basic implementation)
const ipBlockingMiddleware = (req, res, next) => {
  const blockedIPs = [
    // Add IPs to block here
  ];
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (blockedIPs.includes(clientIP)) {
    console.error(`🚨 BLOCKED IP ATTEMPT: ${clientIP}`);
    return res.status(403).json({
      error: 'Acceso denegado',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /('|(\\')|(;)|(\\;)|(--)|(\s)|(\||\\|)|(\*|\\\*))/gi, // SQL injection patterns
    /(union|select|insert|delete|update|drop|create|alter|exec)/gi // SQL keywords
  ];
  
  const requestBody = JSON.stringify(req.body);
  const queryString = JSON.stringify(req.query);
  
  for (let pattern of suspiciousPatterns) {
    if (pattern.test(requestBody) || pattern.test(queryString)) {
      console.error(`🚨 SUSPICIOUS REQUEST BLOCKED:`, {
        ip: req.ip,
        path: req.path,
        pattern: pattern.toString(),
        user: req.user?.email || 'anonymous'
      });
      
      return res.status(400).json({
        error: 'Request inválido',
        code: 'MALICIOUS_REQUEST'
      });
    }
  }
  
  next();
};

// Environment-specific configuration
const getSecurityConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      cors: SECURITY_CONFIG.CORS_CONFIG,
      rateLimiting: true,
      securityHeaders: true,
      requestValidation: true,
      securityLogging: true
    };
  } else {
    return {
      cors: {
        origin: true,
        credentials: true
      },
      rateLimiting: false,
      securityHeaders: false,
      requestValidation: false,
      securityLogging: true
    };
  }
};

module.exports = {
  SECURITY_CONFIG,
  enforceProduction,
  securityLogger,
  ipBlockingMiddleware,
  validateRequest,
  getSecurityConfig,
  rateLimiters: {
    general: SECURITY_CONFIG.GENERAL_RATE_LIMIT,
    auth: SECURITY_CONFIG.AUTH_RATE_LIMIT,
    upload: SECURITY_CONFIG.UPLOAD_RATE_LIMIT
  },
  helmetConfig: SECURITY_CONFIG.HELMET_CONFIG
};
