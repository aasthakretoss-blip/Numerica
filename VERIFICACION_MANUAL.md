# Flujo de Verificación Manual - Numerica

## Resumen

Se ha implementado un sistema de verificación manual de usuarios que **NO requiere configurar Amazon SES** para el envío de emails. Los usuarios se verifican ingresando un código fijo que se les proporciona personalmente.

## Código de Verificación

**Código fijo:** `1489999`

Este código se debe compartir con los usuarios de forma personal/segura cuando se registren en el sistema.

## Flujo Implementado

### 1. Registro del Usuario (Frontend)
- El usuario completa el formulario de registro en `/signup`
- Se valida que el email exista en la tabla `numerica_users` 
- Se crea el usuario en AWS Cognito (sin verificación de email)
- Se actualiza el registro en la base de datos a `pending_verification`

### 2. Pantalla de Verificación (Frontend)
- Después del registro exitoso, se muestra una pantalla donde el usuario debe ingresar el código
- El mensaje indica: *"Para verificar tu cuenta, ingresa el código proporcionado personalmente: 1489999"*
- El usuario ingresa el código de 7 dígitos

### 3. Verificación Manual (Backend)
- El usuario envía el código al endpoint `/api/auth/verify-code`
- El backend valida que el código sea exactamente `1489999`
- Si es correcto, se llama a `adminConfirmSignUp` de AWS Cognito
- El usuario queda verificado en Cognito automáticamente
- Se actualiza el estado del usuario a `active` en la base de datos

### 4. Acceso al Sistema
- Una vez verificado, el usuario puede iniciar sesión normalmente
- Ya no necesita verificar su email

## Archivos Modificados/Creados

### Backend (api-deploy)

#### 1. `services/authService.js` (NUEVO)
Servicio que maneja la lógica de autenticación:
- `validateEmail()`: Valida que el email exista en `numerica_users`
- `confirmUserWithCode()`: Verifica el código fijo y confirma al usuario en Cognito
- `activateUser()`: Activa el usuario en la base de datos
- `confirmRegistration()`: Actualiza datos del usuario después del registro

#### 2. `handler.js` (MODIFICADO)
Se agregaron las siguientes rutas públicas:

```javascript
POST /api/auth/validate-email
POST /api/auth/confirm-registration
POST /api/auth/verify-code
POST /api/auth/activate-user
```

### Frontend (src)

#### 1. `src/pages/SignUp.jsx` (MODIFICADO)
- Modificado el mensaje de éxito para indicar el código manual
- Cambiado `maxLength` de input de código de 6 a 7 dígitos
- Reemplazada la llamada a `confirmSignUp` de Cognito por la llamada al endpoint `/api/auth/verify-code`
- Modificado el botón "Reenviar Código" a "Mostrar Código" que muestra el código fijo
- Actualizado el placeholder del input a `1489999`

## Ventajas de esta Implementación

1. **No requiere SES**: No necesitas configurar Amazon SES ni verificar dominios
2. **Sin emails**: No hay dependencia de servicios de correo electrónico
3. **Control total**: Tú decides quién obtiene el código
4. **Funciona inmediatamente**: No hay delay por emails que no llegan
5. **Más simple**: Menos servicios de AWS que configurar y mantener

## Limitaciones

1. **No es automático**: Tienes que compartir el código manualmente con cada usuario
2. **Código compartido**: Todos los usuarios usan el mismo código (1489999)
3. **Sin recuperación de contraseña por email**: Para recuperar contraseña necesitarías:
   - Configurar SES más adelante, O
   - Implementar un flujo administrativo donde tú reseteas las contraseñas, O
   - Usar SMS en lugar de email (más simple que SES)

## Seguridad

El código fijo `1489999` solo funciona **DESPUÉS** de que el usuario se registre correctamente:
- El email debe existir en `numerica_users` (validación previa)
- El usuario debe completar el registro en Cognito
- El código solo confirma cuentas que ya están en estado `UNCONFIRMED` en Cognito

**Esto significa que un atacante no puede simplemente usar el código sin tener acceso a un email autorizado en tu sistema.**

## Recuperación de Contraseña

### Opciones sin SES:

#### Opción 1: Reset Manual por Admin
Crea un script o interfaz admin para resetear contraseñas:
```javascript
// Ejemplo con AWS SDK
const { AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

await cognitoClient.send(new AdminSetUserPasswordCommand({
  UserPoolId: 'tu-user-pool-id',
  Username: 'email@usuario.com',
  Password: 'NuevaContraseña!123',
  Permanent: true
}));
```

#### Opción 2: SMS (Más simple que SES)
- Configurar SNS para SMS (más fácil que SES)
- Usar atributo `phone_number` verificado
- Cognito enviará códigos por SMS automáticamente

#### Opción 3: Configurar SES más adelante
Cuando necesites recuperación automática, configurar SES:
1. Verificar tu dominio en SES
2. Salir del sandbox de SES
3. Activar verificación de email en Cognito
4. Mantener el código manual como opción alternativa

## Cómo Usar

### Para un nuevo usuario:

1. **Crear entrada en numerica_users** (si no existe):
```sql
INSERT INTO numerica_users (email, status, created_at, updated_at)
VALUES ('nuevo@usuario.com', 'invited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

2. **Compartir el código**: Dile al usuario que el código es `1489999`

3. **Usuario se registra**: Va a `/signup` y completa el formulario

4. **Usuario verifica**: Ingresa el código `1489999`

5. **Listo**: El usuario puede hacer login normalmente

## Testing

Para probar el flujo completo:

1. Asegúrate de tener un email en `numerica_users` con status `invited`
2. Ve a la página de registro
3. Completa el formulario con ese email
4. En la pantalla de verificación, ingresa: `1489999`
5. Deberías ser redirigido al login
6. Inicia sesión con el email y contraseña que creaste

## Variables de Entorno Requeridas

El servicio de autenticación requiere estas variables en `.env`:

```bash
# Cognito
COGNITO_USER_POOL_ID=us-east-1_JwP9gBEvr
COGNITO_CLIENT_ID=18l43dor2k5fja5pu0caf64u2f

# Base de datos
DB_HOST=tu-db-host
DB_PORT=5432
DB_USER=tu-usuario
DB_PASSWORD=tu-password

# AWS
AWS_REGION=us-east-1
```

## Migración Futura a SES

Si decides más adelante migrar a verificación automática por email:

1. Configura SES en AWS
2. Actualiza la configuración de Cognito para usar SES
3. Modifica `SignUp.jsx` para usar el flujo original con `confirmSignUp`
4. Mantén el endpoint `/api/auth/verify-code` como opción de respaldo
5. Puedes tener ambos sistemas funcionando en paralelo

## Preguntas Frecuentes

**P: ¿Por qué 1489999 específicamente?**  
R: Puedes cambiarlo a cualquier código en `authService.js` línea 63. Asegúrate de actualizar también el frontend.

**P: ¿Puedo tener diferentes códigos para diferentes usuarios?**  
R: Sí, modifica `confirmUserWithCode()` para validar contra una tabla de códigos por usuario en lugar de un código fijo.

**P: ¿Qué pasa si un usuario pierde su contraseña?**  
R: Por ahora, tendrías que resetearla manualmente usando `adminSetUserPassword`. O configura SES/SMS para recuperación automática.

**P: ¿Es seguro este approach?**  
R: Sí, porque el código solo funciona para emails pre-autorizados en `numerica_users` y solo confirma cuentas existentes en Cognito. No expone tu sistema a registros no autorizados.

---

## Próximos Pasos Recomendados

1. **Documenta el código** para tu equipo
2. **Crea un proceso** para agregar nuevos usuarios a `numerica_users`
3. **Decide la estrategia** de recuperación de contraseña
4. **Considera migrar a SES** cuando tengas más usuarios activos
5. **Implementa logging** de intentos de verificación para detectar abusos


