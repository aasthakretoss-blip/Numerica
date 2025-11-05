const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

const USER_POOL_ID = 'us-east-1_JwP9gBEvr';
const USERNAME = 'alberto.ochoaf@gmail.com';
const NEW_PASSWORD = 'Alberto123!'; // Nueva contraseña permanente

async function fixAlbertoUser() {
  try {
    console.log('🔧 Arreglando usuario alberto.ochoaf@gmail.com...');
    console.log('='.repeat(50));
    
    // 1. Obtener estado actual
    console.log('1. 📊 Estado actual del usuario...');
    const currentUser = await cognito.adminGetUser({
      UserPoolId: USER_POOL_ID,
      Username: USERNAME
    }).promise();
    
    console.log(`   Estado actual: ${currentUser.UserStatus}`);
    console.log(`   Habilitado: ${currentUser.Enabled}`);
    
    if (currentUser.UserStatus === 'FORCE_CHANGE_PASSWORD') {
      console.log('   ⚠️ Usuario requiere cambio de contraseña');
      
      // 2. Establecer contraseña permanente directamente
      console.log('\n2. 🔑 Estableciendo contraseña permanente...');
      await cognito.adminSetUserPassword({
        UserPoolId: USER_POOL_ID,
        Username: USERNAME,
        Password: NEW_PASSWORD,
        Permanent: true // ← IMPORTANTE: Hacer la contraseña permanente
      }).promise();
      
      console.log('   ✅ Contraseña permanente establecida');
      
      // 3. Confirmar el usuario si es necesario
      console.log('\n3. ✅ Confirmando usuario...');
      try {
        await cognito.adminConfirmSignUp({
          UserPoolId: USER_POOL_ID,
          Username: USERNAME
        }).promise();
        console.log('   ✅ Usuario confirmado');
      } catch (confirmError) {
        if (confirmError.code === 'NotAuthorizedException') {
          console.log('   ℹ️ Usuario ya estaba confirmado');
        } else {
          console.log('   ⚠️ Error confirmando:', confirmError.message);
        }
      }
      
      // 4. Verificar el nuevo estado
      console.log('\n4. 🔍 Verificando nuevo estado...');
      const updatedUser = await cognito.adminGetUser({
        UserPoolId: USER_POOL_ID,
        Username: USERNAME
      }).promise();
      
      console.log(`   Nuevo estado: ${updatedUser.UserStatus}`);
      console.log(`   Habilitado: ${updatedUser.Enabled}`);
      
      if (updatedUser.UserStatus === 'CONFIRMED') {
        console.log('\n🎉 ¡ÉXITO! Usuario arreglado correctamente');
        console.log('\n📋 NUEVAS CREDENCIALES:');
        console.log(`   Email: ${USERNAME}`);
        console.log(`   Contraseña: ${NEW_PASSWORD}`);
        console.log('\n💡 Ahora puedes hacer login normalmente con estas credenciales');
        
      } else {
        console.log(`\n⚠️ Estado inesperado: ${updatedUser.UserStatus}`);
      }
      
    } else {
      console.log('\n✅ El usuario ya está en un estado válido');
      console.log('💡 Si sigues teniendo problemas, puede ser un tema de configuración de frontend');
    }
    
    // 5. Actualizar también la tabla PostgreSQL
    console.log('\n5. 🗄️ Actualizando tabla Numerica_Users...');
    const { Client } = require('pg');
    
    const dbClient = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    
    await dbClient.connect();
    
    // Actualizar estado en PostgreSQL
    await dbClient.query(`
      UPDATE numerica_users 
      SET 
        password_changed = TRUE,
        status = 'active',
        updated_at = NOW()
      WHERE email = $1
    `, [USERNAME]);
    
    console.log('   ✅ Tabla PostgreSQL actualizada');
    
    await dbClient.end();
    
  } catch (error) {
    console.error('❌ Error arreglando usuario:', error.message);
    
    if (error.code === 'InvalidPasswordException') {
      console.error('💡 La contraseña no cumple con los requisitos. Debe tener:');
      console.error('   • Al menos 8 caracteres');
      console.error('   • Al menos una mayúscula');
      console.error('   • Al menos una minúscula'); 
      console.error('   • Al menos un número');
      console.error('   • Al menos un símbolo');
    }
  }
}

fixAlbertoUser();
