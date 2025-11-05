# 🚀 PLAN DE IMPLEMENTACIÓN - AUTENTICACIÓN 2FA

## 📋 FASES DEL PROYECTO

### **FASE 1: PREPARACIÓN DE BASE DE DATOS** ⏱️ 2-3 horas
```sql
-- 1. Ejecutar schema de tablas de usuarios
psql -h dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com -U postgres -d Historic -f database-schema-users.sql

-- 2. Verificar creación de tablas
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'user%' OR table_name LIKE 'sms%';
```

**Entregables:**
- ✅ Tablas `user_profiles`, `sms_verification_codes`, `pending_logins` creadas
- ✅ Índices y triggers funcionando
- ✅ Función de cleanup configurada

---

### **FASE 2: CONFIGURACIÓN AWS SNS** ⏱️ 1 hora
```bash
# 1. Verificar permisos SNS
aws sns list-topics --region us-east-1

# 2. Crear policy para Lambda (si necesario)
aws iam attach-role-policy --role-name numerica-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess
```

**Entregables:**
- ✅ SNS configurado para envío de SMS
- ✅ Permisos configurados
- ✅ Test de envío de SMS exitoso

---

### **FASE 3: BACKEND - API ENDPOINTS** ⏱️ 8-12 horas

#### **3.1 Crear endpoints de autenticación**
```bash
# Crear nuevos archivos
mkdir -p api/auth
touch api/auth/auth-routes.js
touch api/auth/sms-service.js  
touch api/auth/user-service.js
```

#### **3.2 Implementar servicios**
**Archivos a crear:**
- `api/auth/auth-routes.js` - Rutas de autenticación
- `api/auth/sms-service.js` - Servicio de SMS con SNS
- `api/auth/user-service.js` - Lógica de usuarios
- `api/auth/validation.js` - Validaciones

**Endpoints a implementar:**
- `POST /auth/complete-profile` - Completar datos de usuario
- `POST /auth/send-sms-code` - Enviar código SMS  
- `POST /auth/verify-sms-code` - Verificar código SMS
- `POST /auth/verify-phone` - Verificar teléfono
- `GET /auth/user-status` - Estado del perfil de usuario

---

### **FASE 4: FRONTEND - COMPONENTES REACT** ⏱️ 12-16 horas

#### **4.1 Crear componentes de autenticación**
```bash
mkdir -p src/components/auth
touch src/components/auth/LoginForm.jsx
touch src/components/auth/CompleteProfile.jsx
touch src/components/auth/SMSVerification.jsx
touch src/components/auth/PhoneVerification.jsx
```

#### **4.2 Componentes a desarrollar:**
- **LoginForm.jsx** - Login principal con 2FA
- **CompleteProfile.jsx** - Formulario de datos personales
- **SMSVerification.jsx** - Verificación de códigos SMS
- **PhoneVerification.jsx** - Verificación de teléfono
- **UserStatus.jsx** - Estado del usuario y perfil

---

### **FASE 5: INTEGRACIÓN COGNITO + 2FA** ⏱️ 6-8 horas

#### **5.1 Modificar Lambda Pre-Token**
- Actualizar función Lambda existente para validar 2FA
- Integrar con base de datos PostgreSQL
- Validar estado del usuario antes de emitir token

#### **5.2 Configurar Custom Auth Challenge**  
- Configurar Cognito para usar custom challenges
- Implementar challenge de SMS en Lambda
- Testing de flujo completo

---

### **FASE 6: TESTING Y REFINAMIENTO** ⏱️ 4-6 horas

#### **6.1 Testing Manual**
- Crear usuario de prueba
- Probar flujo completo: registro → perfil → 2FA → login
- Validar casos de error y edge cases

#### **6.2 Optimizaciones**
- Ajustar UX/UI según feedback
- Configurar logs y monitoreo  
- Documentar proceso para admin

---

## 🔧 **COMANDOS ESPECÍFICOS PARA IMPLEMENTAR**

### **PASO 1: Crear Base de Datos**
```bash
# Conectar y ejecutar schema
psql -h dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com -U postgres -d Historic -f database-schema-users.sql

# Verificar tablas creadas  
psql -h dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com -U postgres -d Historic -c "\dt user*"
```

### **PASO 2: Resetear tu usuario actual**
```bash
# Resetear en Cognito  
aws cognito-idp admin-reset-user-password \
  --user-pool-id us-east-1_JwP9gBEvr \
  --username tu-email@empresa.com \
  --region us-east-1

# Limpiar datos en PostgreSQL (si existen)
psql -h dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com -U postgres -d Historic -c \
  "DELETE FROM user_profiles WHERE email = 'tu-email@empresa.com';"
```

### **PASO 3: Crear usuarios de tu equipo**
```bash
# Script para crear múltiples usuarios
for email in "user1@empresa.com" "user2@empresa.com" "user3@empresa.com"; do
  aws cognito-idp admin-create-user \
    --user-pool-id us-east-1_JwP9gBEvr \
    --username "$email" \
    --user-attributes Name=email,Value="$email" \
    --temporary-password "TempPass123!" \
    --message-action RESEND \
    --region us-east-1
done
```

---

## ⏰ **CRONOGRAMA SUGERIDO**

| Semana | Fase | Horas | Entregable |
|--------|------|-------|------------|
| Semana 1 | Fases 1-2 | 4h | Base de datos + SNS |
| Semana 2 | Fase 3 | 12h | Backend API completo |  
| Semana 3 | Fase 4 | 16h | Frontend componentes |
| Semana 4 | Fases 5-6 | 12h | Integración + Testing |

**Total estimado: 44-48 horas de desarrollo**

---

## 💰 **COSTOS OPERATIVOS**

### **Mensual (15 usuarios):**
- **SMS (SNS)**: ~$6.75 USD/mes (~$135 MXN/mes)
- **Base de datos**: Ya existente (sin costo adicional)
- **Lambda**: ~$0.20 USD/mes (minimal usage)
- **Cognito**: Gratis hasta 50,000 MAU

**Total: ~$140 MXN/mes**

---

## 🎯 **SIGUIENTE PASO RECOMENDADO**

**¿Quieres que empecemos con la implementación?**

Podemos comenzar con:

1. **🗄️ OPCIÓN 1**: Crear las tablas en PostgreSQL (5 minutos)
2. **👥 OPCIÓN 2**: Resetear tu usuario y crear usuarios de tu equipo (10 minutos) 
3. **🔧 OPCIÓN 3**: Configurar AWS SNS para SMS (15 minutos)
4. **💻 OPCIÓN 4**: Empezar con el desarrollo del backend API (2-3 horas)

**¿Por cuál prefieres empezar?**
