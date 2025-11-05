# 🛡️ CHECKLIST CRÍTICO DE SEGURIDAD PRE-PRODUCCIÓN

## ❌ ACCIÓN INMEDIATA REQUERIDA

### 1. 🚨 DESACTIVAR BYPASS DE DESARROLLO
- [ ] **CRÍTICO**: Eliminar o comentar líneas 26-46 en `api-server/middleware/auth.js`
- [ ] **CRÍTICO**: Agregar `NODE_ENV=production` en variables de ambiente
- [ ] **CRÍTICO**: Verificar que `COGNITO_USER_POOL_ID` y `COGNITO_CLIENT_ID` estén configurados

### 2. 🔐 PROTEGER CREDENCIALES DE BASE DE DATOS
- [ ] **CRÍTICO**: Mover `DB_PASSWORD` a AWS Secrets Manager o AWS Systems Manager Parameter Store
- [ ] **CRÍTICO**: Eliminar contraseña de archivos `.env`
- [ ] **CRÍTICO**: Agregar `.env` a `.gitignore` si no está
- [ ] **CRÍTICO**: Rotar contraseña de PostgreSQL inmediatamente

### 3. 👤 VERIFICAR TU USUARIO ADMINISTRADOR
- [ ] Configurar AWS CLI: `aws configure`
- [ ] Verificar usuario existe: `aws cognito-idp admin-get-user --user-pool-id us-east-1_JwP9gBEvr --username alberto.ochoaf@gmail.com`
- [ ] Verificar permisos en DynamoDB: `aws dynamodb scan --table-name user_permissions`
- [ ] Cambiar contraseña si es temporal
- [ ] **RECOMENDADO**: Habilitar MFA para cuenta admin

### 4. 🚪 IMPLEMENTAR RATE LIMITING
- [ ] Instalar: `npm install express-rate-limit helmet`
- [ ] Implementar rate limiting en endpoints críticos
- [ ] Limitar intentos de login (5 por 15 minutos)
- [ ] Limitar uploads (10 por hora)

### 5. 🌐 CONFIGURAR CORS RESTRICTIVO
- [ ] Reemplazar `localhost` con dominio de producción
- [ ] Implementar whitelist de dominios permitidos
- [ ] Verificar que `credentials: true` sea necesario

### 6. 📊 IMPLEMENTAR LOGGING DE SEGURIDAD
- [ ] Configurar logs de autenticación
- [ ] Configurar logs de permisos denegados
- [ ] Configurar alertas para intentos sospechosos
- [ ] Implementar rotación de logs

## ⚠️ VULNERABILIDADES IDENTIFICADAS

### CRÍTICAS (Arreglar ANTES de producción):
1. **Bypass de autenticación en desarrollo** - Permite acceso admin sin credenciales
2. **Credenciales hardcodeadas** - Contraseña de BD expuesta
3. **Sin rate limiting** - Vulnerable a ataques de fuerza bruta
4. **Usuario de prueba con contraseña predecible** - admin@numerica.com / TempPassw0rd!

### ALTAS (Arreglar INMEDIATAMENTE después):
1. **Sin logging de seguridad** - No detecta ataques
2. **CORS muy permisivo** - Permite ataques cross-origin
3. **Sin validación de input** - Vulnerable a XSS/SQL injection
4. **Sin monitoreo de anomalías** - No detecta comportamiento sospechoso

### MEDIAS (Arreglar en próximas semanas):
1. **Sin HTTPS enforcement** - Tráfico no encriptado
2. **Sin headers de seguridad** - Faltan protecciones CSP
3. **Sin backup de configuración** - Riesgo de pérdida de configuración

## 🧪 PRUEBAS DE SEGURIDAD RECOMENDADAS

### Pruebas Básicas (Hacer TÚ MISMO):
- [ ] **Prueba de bypass**: Intentar acceder sin token válido
- [ ] **Prueba de fuerza bruta**: Múltiples intentos de login
- [ ] **Prueba de permisos**: Acceder con usuario no-admin
- [ ] **Prueba de CORS**: Request desde dominio no permitido

### Pruebas Avanzadas (Contratar especialista):
- [ ] **Penetration testing** de API endpoints
- [ ] **Vulnerability assessment** completo
- [ ] **Code review** de seguridad
- [ ] **AWS security assessment**

## 📞 CONTACTO DE EMERGENCIA

Si detectas actividad sospechosa:
1. **Inmediatamente**: Desactivar User Pool en AWS Console
2. **Inmediatamente**: Cambiar contraseñas de BD
3. **Dentro de 1 hora**: Revisar logs de CloudTrail
4. **Dentro de 4 horas**: Reportar a equipo de seguridad

## 🎯 MÉTRICAS DE SEGURIDAD

### KPIs a monitorear:
- **Intentos de login fallidos**: < 1% del total
- **Tiempo de respuesta API**: < 500ms (detecta ataques DoS)
- **Requests rechazados por CORS**: Log y analizar
- **Tokens JWT expirados**: Monitorear frecuencia

### Alertas configurar:
- **+5 intentos login fallidos en 5 min**: Email inmediato
- **Request desde IP no conocida**: Log para revisión
- **Upload de archivo >50MB**: Verificación manual
- **Request con patrones SQL**: Bloqueo automático

---

## ✅ CUANDO ESTÉ LISTO PARA PRODUCCIÓN

Tu usuario `alberto.ochoaf@gmail.com` será seguro cuando:

1. ✅ Esté configurado en AWS Cognito con contraseña fuerte
2. ✅ Tenga MFA habilitado  
3. ✅ Sus permisos estén correctamente en DynamoDB
4. ✅ El bypass de desarrollo esté desactivado
5. ✅ Todas las vulnerabilidades críticas estén resueltas

**TIEMPO ESTIMADO PARA PRODUCCIÓN SEGURA: 2-3 días de trabajo intenso**

---

## 📋 VERIFICACIÓN FINAL

Antes de ir a producción, ejecutar:
```bash
# Verificar configuración
npm run security:check

# Prueba de penetración básica  
npm run security:test

# Verificar logs de seguridad
npm run security:logs
```

**RESPONSABLE**: Alberto Ochoa (alberto.ochoaf@gmail.com)  
**FECHA LÍMITE**: [DEFINIR]  
**PRIORIDAD**: 🚨 CRÍTICA
