#!/usr/bin/env node

/**
 * SCRIPT PARA APLICAR ACTUALIZACIONES DE SEGURIDAD
 * Aplica las mejoras del Día 1 al servidor principal
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 APLICANDO ACTUALIZACIONES DE SEGURIDAD');
console.log('==========================================');

// Encontrar el archivo principal del servidor
const possibleServerFiles = [
  'api-server/server.js',
  'api-server/index.js',
  'api-server/app.js',
  'server.js',
  'index.js'
];

let mainServerFile = null;

for (const file of possibleServerFiles) {
  if (fs.existsSync(file)) {
    mainServerFile = file;
    console.log(`📍 Servidor principal encontrado: ${file}`);
    break;
  }
}

if (!mainServerFile) {
  console.error('❌ No se encontró el archivo principal del servidor');
  console.log('Archivos disponibles:');
  try {
    const files = fs.readdirSync('api-server');
    files.filter(f => f.endsWith('.js')).forEach(f => console.log(`  - api-server/${f}`));
  } catch (e) {
    console.log('  - No se pudo leer el directorio api-server');
  }
  process.exit(1);
}

// Hacer backup del servidor actual
const backupFile = `${mainServerFile}.backup-security.${Date.now()}`;
fs.copyFileSync(mainServerFile, backupFile);
console.log(`✅ Backup creado: ${backupFile}`);

// Leer el contenido actual
let serverContent = fs.readFileSync(mainServerFile, 'utf8');
console.log('📖 Leyendo servidor actual...');

// Verificar si ya tiene las mejoras aplicadas
if (serverContent.includes('SECURITY_UPDATED_DAY1')) {
  console.log('✅ El servidor ya tiene las actualizaciones de seguridad aplicadas');
  process.exit(0);
}

// Buscar importaciones existentes
const hasRateLimit = serverContent.includes('express-rate-limit');
const hasHelmet = serverContent.includes('helmet');
const hasValidator = serverContent.includes('express-validator');

console.log('\n🔍 VERIFICANDO DEPENDENCIAS:');
console.log(`  Rate Limit: ${hasRateLimit ? '✅' : '❌'}`);
console.log(`  Helmet: ${hasHelmet ? '✅' : '❌'}`);
console.log(`  Validator: ${hasValidator ? '✅' : '❌'}`);

// Agregar imports de seguridad si no existen
let securityImports = '';
if (!hasRateLimit) {
  securityImports += "const rateLimit = require('express-rate-limit');\n";
}
if (!hasHelmet) {
  securityImports += "const helmet = require('helmet');\n";
}
if (!hasValidator) {
  securityImports += "const { body, validationResult } = require('express-validator');\n";
}

// Buscar donde insertar los imports (después del último require)
const requireRegex = /const\s+.*?=\s+require\(['"].*?['"];?/g;
const matches = [...serverContent.matchAll(requireRegex)];
if (matches.length > 0) {
  const lastRequire = matches[matches.length - 1];
  const insertPoint = lastRequire.index + lastRequire[0].length;
  serverContent = 
    serverContent.slice(0, insertPoint) + 
    '\n\n// SECURITY IMPORTS - Added by Day 1 Security Update\n' +
    securityImports +
    serverContent.slice(insertPoint);
  console.log('✅ Imports de seguridad agregados');
} else {
  console.warn('⚠️ No se encontraron imports existentes, agregando al inicio');
  serverContent = securityImports + '\n' + serverContent;
}

// Configuración de seguridad básica
const securityConfig = `
// ================================
// CONFIGURACIÓN DE SEGURIDAD - Day 1 Updates
// ================================

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  message: {
    error: 'Demasiadas requests, intenta más tarde',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limiting (más restrictivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 5, // max 5 auth attempts per window
  message: {
    error: 'Demasiados intentos de autenticación',
    retryAfter: 900
  }
});

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cognito-idp.us-east-1.amazonaws.com"]
    }
  }
});

// Security logging
const securityLogger = (req, res, next) => {
  // Log security-relevant requests
  if (req.path.includes('/admin') || req.path.includes('/auth') || req.path.includes('/login')) {
    console.log(\`🔐 SECURITY: \${req.method} \${req.path} from \${req.ip}\`);
  }
  next();
};

// SECURITY_UPDATED_DAY1 - Marker for security updates
`;

// Buscar donde aplicar la configuración (antes de las rutas)
const appCreateRegex = /(const\s+app\s*=\s*express\(\);?\s*)/;
const appMatch = serverContent.match(appCreateRegex);

if (appMatch) {
  const insertPoint = appMatch.index + appMatch[0].length;
  serverContent = 
    serverContent.slice(0, insertPoint) + 
    '\n' + securityConfig + '\n' +
    serverContent.slice(insertPoint);
  console.log('✅ Configuración de seguridad agregada');
} else {
  console.warn('⚠️ No se encontró app = express(), agregando configuración al final');
  serverContent = serverContent + securityConfig;
}

// Aplicar middleware de seguridad
const securityMiddleware = `
// Apply security middleware
if (process.env.NODE_ENV === 'production') {
  app.use(securityHeaders);
  app.use(limiter);
}
app.use(securityLogger);

`;

// Buscar donde aplicar middleware (después de app.use básicos pero antes de rutas)
const middlewareRegex = /(app\.use\(express\..*?\);?\s*)/g;
const middlewareMatches = [...serverContent.matchAll(middlewareRegex)];

if (middlewareMatches.length > 0) {
  const lastMiddleware = middlewareMatches[middlewareMatches.length - 1];
  const insertPoint = lastMiddleware.index + lastMiddleware[0].length;
  serverContent = 
    serverContent.slice(0, insertPoint) + 
    '\n' + securityMiddleware + '\n' +
    serverContent.slice(insertPoint);
  console.log('✅ Middleware de seguridad aplicado');
} else {
  console.warn('⚠️ No se encontró middleware básico, buscar manualmente donde aplicar');
}

// Escribir el archivo actualizado
fs.writeFileSync(mainServerFile, serverContent);

console.log('\n🎉 ACTUALIZACIONES APLICADAS:');
console.log('===============================');
console.log('✅ Imports de seguridad agregados');
console.log('✅ Rate limiting configurado');
console.log('✅ Security headers (helmet) configurado');
console.log('✅ Logging de seguridad habilitado');
console.log('✅ Configuración específica para producción');

console.log(`\n📋 ARCHIVO ACTUALIZADO: ${mainServerFile}`);
console.log(`📋 BACKUP DISPONIBLE: ${backupFile}`);

console.log('\n🚀 PRÓXIMOS PASOS:');
console.log('1. Probar el servidor: npm start');
console.log('2. Verificar endpoints de seguridad');
console.log('3. Configurar AWS CLI cuando tengas credenciales');

console.log('\n✅ SERVIDOR ACTUALIZADO CON SEGURIDAD BÁSICA');

// Crear reporte de cambios
const report = {
  timestamp: new Date().toISOString(),
  serverFile: mainServerFile,
  backupFile: backupFile,
  changes: [
    'Rate limiting agregado',
    'Security headers con Helmet',
    'Security logging implementado',
    'Configuración específica para producción',
    'Middleware de seguridad aplicado'
  ],
  nextSteps: [
    'Configurar AWS CLI con credenciales correctas',
    'Ejecutar node scripts/security-helper.js day1-aws',
    'Completar protección de credenciales de BD',
    'Probar todos los endpoints'
  ]
};

fs.writeFileSync('./security-update-report.json', JSON.stringify(report, null, 2));
console.log('\n📋 Reporte guardado en: security-update-report.json');
