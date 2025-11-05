const AWS = require('aws-sdk');
require('dotenv').config();

// Configurar AWS
AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

const USER_POOL_ID = 'us-east-1_JwP9gBEvr';

// Lista de usuarios con contraseñas temporales (cumpliendo política: 8+ chars, mayúscula, minúscula, número, símbolo)
const USERS = [
  {
    email: 'alberto.ochoaf@gmail.com',
    tempPassword: 'Brocoli7!',
    action: 'reset' // Este usuario ya existe, lo resetearemos
  },
  {
    email: 'rroman@vencom.com.mx',
    tempPassword: 'VHKPa1KSA@2024',
    action: 'create'
  },
  {
    email: 'arangel@vencom.com.mx',
    tempPassword: 'TsQnzhLK#2024',
    action: 'create'
  },
  {
    email: 'epirez@vencom.com.mx',
    tempPassword: 'Q9ca8DBT$2024',
    action: 'create'
  },
  {
    email: 'aibarrola.mateos@vencom.com.mx',
    tempPassword: 'N80CDlM0%2024',
    action: 'create'
  },
  {
    email: 'pibarrola@vencom.com.mx',
    tempPassword: 'd85iBfFv&2024',
    action: 'create'
  },
  {
    email: 'aibarrola@vencom.com.mx',
    tempPassword: 'ZcBwt5hK*2024',
    action: 'create'
  }
];

async function createOrResetUser(user) {
  try {
    if (user.action === 'reset') {
      console.log(`🔄 Reseteando usuario existente: ${user.email}...`);
      
      // Resetear contraseña del usuario existente
      await cognito.adminResetUserPassword({
        UserPoolId: USER_POOL_ID,
        Username: user.email
      }).promise();
      
      // Establecer contraseña temporal
      await cognito.adminSetUserPassword({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        Password: user.tempPassword,
        Permanent: false
      }).promise();
      
      // Confirmar el usuario si está pendiente
      try {
        await cognito.adminConfirmSignUp({
          UserPoolId: USER_POOL_ID,
          Username: user.email
        }).promise();
      } catch (confirmError) {
        // Ignorar si el usuario ya está confirmado
        if (confirmError.code !== 'NotAuthorizedException') {
          console.log(`   ⚠️ Aviso al confirmar: ${confirmError.message}`);
        }
      }
      
      console.log(`   ✅ Usuario ${user.email} reseteado exitosamente`);
      
    } else {
      console.log(`👤 Creando nuevo usuario: ${user.email}...`);
      
      const params = {
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        UserAttributes: [
          {
            Name: 'email',
            Value: user.email
          },
          {
            Name: 'email_verified',
            Value: 'true'
          }
        ],
        TemporaryPassword: user.tempPassword,
        MessageAction: 'SUPPRESS', // No enviar email automático
        ForceAliasCreation: false
      };
      
      await cognito.adminCreateUser(params).promise();
      console.log(`   ✅ Usuario ${user.email} creado exitosamente`);
    }
    
    return { success: true, email: user.email };
    
  } catch (error) {
    if (error.code === 'UsernameExistsException') {
      console.log(`   ⚠️ Usuario ${user.email} ya existe - saltando creación`);
      return { success: true, email: user.email, skipped: true };
    } else {
      console.error(`   ❌ Error con ${user.email}:`, error.message);
      return { success: false, email: user.email, error: error.message };
    }
  }
}

async function createAllUsers() {
  console.log('🚀 Iniciando creación/reset de usuarios en Cognito...');
  console.log(`📊 Total usuarios a procesar: ${USERS.length}`);
  console.log(`🔧 User Pool ID: ${USER_POOL_ID}`);
  
  const results = [];
  
  for (const user of USERS) {
    const result = await createOrResetUser(user);
    results.push(result);
    
    // Pequeña pausa entre creaciones para evitar rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumen final
  console.log('\n📋 RESUMEN DE RESULTADOS:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const skipped = results.filter(r => r.skipped);
  
  console.log(`✅ Exitosos: ${successful.length}`);
  console.log(`❌ Fallidos: ${failed.length}`);
  console.log(`⏭️ Saltados (ya existían): ${skipped.length}`);
  
  if (failed.length > 0) {
    console.log('\\n❌ Usuarios con errores:');
    failed.forEach(f => {
      console.log(`   - ${f.email}: ${f.error}`);
    });
  }
  
  console.log('\\n🎉 Proceso completado!');
  console.log('\\n📧 CREDENCIALES TEMPORALES:');
  console.log('='.repeat(50));
  USERS.forEach(user => {
    console.log(`📧 ${user.email}`);
    console.log(`🔐 ${user.tempPassword}`);
    console.log('');
  });
  
  console.log('📝 PRÓXIMOS PASOS:');
  console.log('1. Enviar credenciales a cada usuario por canal seguro');
  console.log('2. Instrucciones: "Hacer login, verificar email, cambiar contraseña"');
  console.log('3. Completar perfil: nombre, apellidos, teléfono');
  console.log('4. Verificar teléfono con código SMS');
  console.log('5. ¡Sistema listo para usar con 2FA!');
}

// Verificar configuración antes de ejecutar
if (!process.env.AWS_REGION && !AWS.config.region) {
  console.error('❌ Error: AWS_REGION no configurado');
  process.exit(1);
}

createAllUsers().catch(error => {
  console.error('❌ Error general:', error);
  process.exit(1);
});
