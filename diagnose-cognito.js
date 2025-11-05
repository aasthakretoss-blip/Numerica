const AWS = require('aws-sdk');
require('dotenv').config();

// Configurar AWS
AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

const USER_POOL_ID = 'us-east-1_JwP9gBEvr';
const CLIENT_ID = '18l43dor2k5fja5pu0caf64u2f';

async function diagnoseCognitoIssues() {
  console.log('🔍 DIAGNÓSTICO DE COGNITO\n' + '='.repeat(50));
  
  try {
    // 1. Verificar User Pool
    console.log('1. 📊 Verificando User Pool...');
    const userPool = await cognito.describeUserPool({
      UserPoolId: USER_POOL_ID
    }).promise();
    
    console.log('✅ User Pool encontrado:', userPool.UserPool.Name);
    console.log('   ID:', userPool.UserPool.Id);
    console.log('   Status:', userPool.UserPool.Status);
    
    // 2. Verificar Client
    console.log('\n2. 📱 Verificando User Pool Client...');
    const client = await cognito.describeUserPoolClient({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID
    }).promise();
    
    console.log('✅ Client encontrado:', client.UserPoolClient.ClientName);
    console.log('   ID:', client.UserPoolClient.ClientId);
    console.log('   Auth Flows:', client.UserPoolClient.ExplicitAuthFlows);
    
    // 3. Listar usuarios
    console.log('\n3. 👥 Listando usuarios...');
    const users = await cognito.listUsers({
      UserPoolId: USER_POOL_ID,
      Limit: 10
    }).promise();
    
    console.log(`✅ Total usuarios encontrados: ${users.Users.length}`);
    
    users.Users.forEach(user => {
      console.log(`   📧 ${user.Username}`);
      console.log(`      Estado: ${user.UserStatus}`);
      console.log(`      Habilitado: ${user.Enabled}`);
      console.log(`      Creado: ${user.UserCreateDate}`);
      
      // Mostrar atributos relevantes
      const emailAttr = user.Attributes.find(attr => attr.Name === 'email');
      const emailVerified = user.Attributes.find(attr => attr.Name === 'email_verified');
      
      if (emailAttr) console.log(`      Email: ${emailAttr.Value}`);
      if (emailVerified) console.log(`      Email verificado: ${emailVerified.Value}`);
      console.log('');
    });
    
    // 4. Verificar configuración de Amplify en el código
    console.log('4. 🔧 Verificando archivos de configuración...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Buscar archivos de configuración de Amplify
    const configFiles = [
      'src/aws-exports.js',
      'amplifyconfiguration.json',
      'amplify/backend/auth/auth.json'
    ];
    
    configFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ Encontrado: ${file}`);
      } else {
        console.log(`   ❌ Faltante: ${file}`);
      }
    });
    
    // 5. Sugerencias basadas en los errores 400
    console.log('\n5. 💡 ANÁLISIS DE ERRORES 400:');
    console.log('Los errores 400 en Cognito suelen indicar:');
    console.log('   • Configuración incorrecta de Auth Flows');
    console.log('   • ClientId incorrecto en la configuración');
    console.log('   • Región incorrecta');
    console.log('   • Parámetros faltantes en las requests');
    
    // 6. Verificar configuración actual del cliente
    console.log('\n6. ⚙️ CONFIGURACIÓN ACTUAL DEL CLIENTE:');
    console.log('Auth Flows habilitados:');
    client.UserPoolClient.ExplicitAuthFlows.forEach(flow => {
      console.log(`   ✅ ${flow}`);
    });
    
    // Verificar si tiene los flows necesarios
    const requiredFlows = [
      'ALLOW_ADMIN_USER_PASSWORD_AUTH',
      'ALLOW_USER_PASSWORD_AUTH', 
      'ALLOW_REFRESH_TOKEN_AUTH',
      'ALLOW_USER_SRP_AUTH'
    ];
    
    console.log('\n   Flows requeridos:');
    requiredFlows.forEach(flow => {
      const hasFlow = client.UserPoolClient.ExplicitAuthFlows.includes(flow);
      console.log(`   ${hasFlow ? '✅' : '❌'} ${flow}`);
    });
    
  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error.message);
    
    if (error.code === 'ResourceNotFoundException') {
      console.error('💡 El User Pool o Client no existe o el ID es incorrecto');
    } else if (error.code === 'AccessDeniedException') {
      console.error('💡 Problemas de permisos AWS - verifica las credenciales');
    } else {
      console.error('💡 Error inesperado:', error.code);
    }
  }
  
  console.log('\n🔧 PRÓXIMOS PASOS SUGERIDOS:');
  console.log('1. Verificar que los IDs de User Pool y Client sean correctos');
  console.log('2. Asegurar que los Auth Flows necesarios estén habilitados');
  console.log('3. Verificar la configuración de Amplify en el frontend');
  console.log('4. Revisar los logs del navegador para errores específicos');
}

// Función adicional para verificar un usuario específico
async function checkSpecificUser(username) {
  try {
    console.log(`\n🔍 Verificando usuario específico: ${username}`);
    
    const user = await cognito.adminGetUser({
      UserPoolId: USER_POOL_ID,
      Username: username
    }).promise();
    
    console.log(`✅ Usuario encontrado: ${user.Username}`);
    console.log(`   Estado: ${user.UserStatus}`);
    console.log(`   Habilitado: ${user.Enabled}`);
    
    // Intentar obtener grupos del usuario
    try {
      const groups = await cognito.adminListGroupsForUser({
        UserPoolId: USER_POOL_ID,
        Username: username
      }).promise();
      
      console.log(`   Grupos: ${groups.Groups.length > 0 ? groups.Groups.map(g => g.GroupName).join(', ') : 'Ninguno'}`);
    } catch (groupError) {
      console.log('   Grupos: No se pudieron obtener');
    }
    
  } catch (error) {
    console.error(`❌ Error verificando usuario ${username}:`, error.message);
  }
}

diagnoseCognitoIssues().then(() => {
  // Verificar tu usuario específico
  return checkSpecificUser('alberto.ochoaf@gmail.com');
}).catch(error => {
  console.error('❌ Error general:', error);
});
