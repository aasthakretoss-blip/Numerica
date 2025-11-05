const { CognitoJwtVerifier } = require('aws-jwt-verify');
require('dotenv').config();

// Establecer NODE_ENV por defecto a production por seguridad
if (!process.env.NODE_ENV) {
  console.warn('⚠️ NODE_ENV no configurado, estableciendo a "production" por seguridad');
  process.env.NODE_ENV = 'production';
}

// Verificar si las variables de entorno están disponibles
let verifier = null;
try {
  if (process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'id',
      clientId: process.env.COGNITO_CLIENT_ID
    });
    console.log('✅ AWS Cognito verificador inicializado');
  } else {
    console.warn('⚠️ Configuración de AWS Cognito no encontrada, autenticación deshabilitada para desarrollo');
  }
} catch (error) {
  console.warn('⚠️ Error inicializando AWS Cognito:', error.message);
  console.warn('⚠️ Continuando sin autenticación para desarrollo');
}

// Middleware de autenticación
const authenticate = async (req, res, next) => {
  try {
    // VALIDACIÓN ESTRICTA PARA PRODUCCIÓN - Agregado por Plan Seguridad Día 1
    if (process.env.NODE_ENV === 'production') {
      if (!verifier) {
        console.error('🚨 CRITICAL: Auth not configured in production');
        return res.status(500).json({
          error: 'Sistema no configurado para producción',
          code: 'PRODUCTION_AUTH_ERROR'
        });
      }
    }
    
    // Si no hay verifier configurado y estamos en development explícito
    if (!verifier && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ ═══════════════════════════════════════');
      console.warn('⚠️ AUTENTICACIÓN DESHABILITADA - DEVELOPMENT MODE');
      console.warn('⚠️ NUNCA usar en producción sin configurar COGNITO');
      console.warn('⚠️ ═══════════════════════════════════════');
      req.user = {
        email: 'dev@example.com',
        permissions: {
          role: 'admin',
          canUpload: true,
          canViewFunds: true,
          permissionsLoaded: true
        }
      };
      return next();
    }
    
    // Si llegamos aquí sin verifier, es un error de configuración
    if (!verifier) {
      console.error('🚨 CRITICAL: Auth verifier not configured');
      return res.status(500).json({
        error: 'Sistema no configurado correctamente',
        code: 'AUTH_NOT_CONFIGURED'
      });
    }
    
    /* BYPASS ELIMINADO POR SEGURIDAD - PLAN DÍA 1
    // El siguiente código permitía acceso admin sin autenticación
    if (!verifier) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Saltando autenticación (modo desarrollo sin Cognito)');
        req.user = {
          email: 'dev@example.com',
          permissions: { role: 'admin', canUpload: true, canViewFunds: true, permissionsLoaded: true }
        };
        return next();
      } else {
        return res.status(500).json({
          error: 'Autenticación no configurada',
          code: 'AUTH_NOT_CONFIGURED'
        });
      }
    }
    */
    
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Token de autorización requerido',
        code: 'NO_TOKEN'
      });
    }

    // Extraer token (formato: "Bearer <token>")
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Formato de token inválido. Use: Bearer <token>',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verificar y decodificar el token
    const payload = await verifier.verify(token);
    
    // Agregar información del usuario a la request
    req.user = payload;
    req.user.permissions = {
      role: payload['custom:role'] || 'user',
      canUpload: payload['custom:can_upload'] === 'true',
      canViewFunds: payload['custom:can_view_funds'] === 'true',
      permissionsLoaded: payload['custom:permissions_loaded'] === 'true'
    };

    console.log(`🔐 Usuario autenticado: ${req.user.email} (${req.user.permissions.role})`);
    next();
    
  } catch (error) {
    console.error('❌ Error de autenticación:', error.message);
    
    // Manejar diferentes tipos de errores
    if (error.name === 'JwtExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(401).json({
      error: 'Error de autenticación',
      code: 'AUTH_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware para verificar permisos específicos
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Verificar permisos específicos
    switch (permission) {
      case 'upload':
        if (!req.user.permissions.canUpload) {
          return res.status(403).json({
            error: 'No tienes permisos para subir archivos',
            code: 'PERMISSION_DENIED'
          });
        }
        break;
        
      case 'view_funds':
        if (!req.user.permissions.canViewFunds) {
          return res.status(403).json({
            error: 'No tienes permisos para ver información de fondos',
            code: 'PERMISSION_DENIED'
          });
        }
        break;
        
      case 'admin':
        if (req.user.permissions.role !== 'admin') {
          return res.status(403).json({
            error: 'Se requieren permisos de administrador',
            code: 'ADMIN_REQUIRED'
          });
        }
        break;
        
      default:
        return res.status(500).json({
          error: 'Permiso no reconocido',
          code: 'UNKNOWN_PERMISSION'
        });
    }

    console.log(`✅ Permiso verificado: ${permission} para ${req.user.email}`);
    next();
  };
};

// Middleware para logging de requests autenticados
const logAuthenticatedRequest = (req, res, next) => {
  if (req.user) {
    console.log(`📝 ${req.method} ${req.path} - Usuario: ${req.user.email} (${req.user.permissions.role})`);
  }
  next();
};

module.exports = {
  authenticate,
  requirePermission,
  logAuthenticatedRequest
};
