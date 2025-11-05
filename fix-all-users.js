const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

const USER_POOL_ID = 'us-east-1_JwP9gBEvr';

// Lista de todos los usuarios con sus contraseñas permanentes
const USERS = [
  {
    email: 'alberto.ochoaf@gmail.com',
    password: 'Alberto123!' // Ya arreglado
  },
  {
    email: 'rroman@vencom.com.mx', 
    password: 'Roman123!'
  },
  {
    email: 'arangel@vencom.com.mx',
    password: 'Angel123!'
  },
  {
    email: 'epirez@vencom.com.mx',
    password: 'Eduardo123!'
  },
  {
    email: 'aibarrola.mateos@vencom.com.mx',
    password: 'IbarrolaM123!'
  },
  {
    email: 'pibarrola@vencom.com.mx',
    password: 'IbarrolaP123!'
  },
  {
    email: 'aibarrola@vencom.com.mx',
    password: 'IbarrolaA123!'
  }
];

async function fixUser(user) {
  try {
    console.log(`\n🔧 Procesando: ${user.email}`);
    console.log('-'.repeat(40));
    
    // 1. Verificar estado actual
    const currentUser = await cognito.adminGetUser({
      UserPoolId: USER_POOL_ID,
      Username: user.email
    }).promise();
    
    console.log(`   Estado actual: ${currentUser.UserStatus}`);
    
    if (currentUser.UserStatus === 'FORCE_CHANGE_PASSWORD') {
      // 2. Establecer contraseña permanente
      console.log('   🔑 Estableciendo contraseña permanente...');
      
      await cognito.adminSetUserPassword({
        UserPoolId: USER_POOL_ID,
        Username: user.email,
        Password: user.password,
        Permanent: true
      }).promise();
      
      console.log('   ✅ Contraseña permanente establecida');
      
      // 3. Confirmar usuario si es necesario
      try {
        await cognito.adminConfirmSignUp({
          UserPoolId: USER_POOL_ID,
          Username: user.email
        }).promise();
        console.log('   ✅ Usuario confirmado');
      } catch (confirmError) {
        if (confirmError.code === 'NotAuthorizedException') {
          console.log('   ℹ️ Usuario ya confirmado');
        }
      }
      
      // 4. Verificar nuevo estado
      const updatedUser = await cognito.adminGetUser({
        UserPoolId: USER_POOL_ID,
        Username: user.email
      }).promise();
      
      console.log(`   📊 Nuevo estado: ${updatedUser.UserStatus}`);
      
      if (updatedUser.UserStatus === 'CONFIRMED') {
        console.log(`   🎉 ¡ÉXITO! ${user.email} arreglado`);
        return { success: true, email: user.email, password: user.password };
      } else {
        console.log(`   ⚠️ Estado inesperado: ${updatedUser.UserStatus}`);
        return { success: false, email: user.email, error: 'Estado inesperado' };
      }
      
    } else if (currentUser.UserStatus === 'CONFIRMED') {
      console.log('   ✅ Usuario ya está en estado CONFIRMED');
      return { success: true, email: user.email, password: user.password, skipped: true };
      
    } else {
      console.log(`   ⚠️ Estado no manejado: ${currentUser.UserStatus}`);
      return { success: false, email: user.email, error: `Estado: ${currentUser.UserStatus}` };
    }
    
  } catch (error) {
    console.error(`   ❌ Error procesando ${user.email}:`, error.message);
    return { success: false, email: user.email, error: error.message };
  }
}

async function fixAllUsers() {
  console.log('🚀 ARREGLANDO TODOS LOS USUARIOS');
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const user of USERS) {
    const result = await fixUser(user);
    results.push(result);
    
    // Pequeña pausa para evitar rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumen final
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMEN FINAL');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const skipped = results.filter(r => r.skipped);
  
  console.log(`✅ Exitosos: ${successful.length}`);
  console.log(`⏭️ Ya estaban listos: ${skipped.length}`);
  console.log(`❌ Fallidos: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ USUARIOS CON ERRORES:');
    failed.forEach(f => {
      console.log(`   - ${f.email}: ${f.error}`);
    });
  }
  
  console.log('\n🔑 CREDENCIALES PARA TODOS LOS USUARIOS:');
  console.log('='.repeat(50));
  
  successful.forEach(user => {
    if (!user.skipped) {
      console.log(`📧 ${user.email}`);
      console.log(`🔐 ${user.password}`);
      console.log('');
    }
  });
  
  console.log('💡 INSTRUCCIONES:');
  console.log('1. Todos los usuarios pueden hacer login inmediatamente');
  console.log('2. No necesitan cambiar contraseñas - son permanentes');
  console.log('3. Si algún usuario prefiere otra contraseña, puede cambiarla desde el sistema');
  
  console.log('\n🎉 ¡PROCESO COMPLETADO!');
}

fixAllUsers().catch(error => {
  console.error('❌ Error general:', error);
});
