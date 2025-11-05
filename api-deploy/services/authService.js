const { CognitoIdentityProviderClient, AdminConfirmSignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { Pool } = require('pg');

// Cliente de Cognito
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

// Pool de conexión a Historic (DB_NOMINAS)
const getUsersPool = () => {
  return new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NOMINAS || 'Historic',
    ssl: {
      rejectUnauthorized: false
    }
  });
};

class AuthService {
  /**
   * Validar email contra numerica_users
   */
  async validateEmail(email) {
    const pool = getUsersPool();
    try {
      const result = await pool.query(
        'SELECT email, status FROM numerica_users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error('Email no autorizado. Contacta al administrador para obtener acceso.');
      }

      const user = result.rows[0];

      if (user.status === 'active') {
        throw new Error('Este email ya está registrado. Por favor inicia sesión.');
      }

      if (user.status === 'blocked') {
        throw new Error('Esta cuenta ha sido bloqueada. Contacta al administrador.');
      }

      return {
        valid: true,
        email: user.email
      };
    } finally {
      await pool.end();
    }
  }

  /**
   * Confirmar usuario manualmente con código fijo
   */
  async confirmUserWithCode(username, code) {
    // Validar código fijo
    const CODIGO_VERIFICACION = '1489999';
    
    if (code !== CODIGO_VERIFICACION) {
      throw new Error('Código de verificación incorrecto');
    }

    // Confirmar usuario en Cognito usando adminConfirmSignUp
    try {
      const command = new AdminConfirmSignUpCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: username
      });

      await cognitoClient.send(command);

      console.log(`✅ Usuario ${username} confirmado manualmente en Cognito`);

      return {
        success: true,
        message: 'Usuario verificado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error confirmando usuario en Cognito:', error);
      throw new Error(`Error al confirmar usuario: ${error.message}`);
    }
  }

  /**
   * Activar usuario en base de datos
   */
  async activateUser(email) {
    const pool = getUsersPool();
    try {
      const result = await pool.query(
        'UPDATE numerica_users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *',
        ['active', email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error('Usuario no encontrado en base de datos');
      }

      console.log(`✅ Usuario ${email} activado en base de datos`);

      return {
        success: true,
        user: result.rows[0]
      };
    } finally {
      await pool.end();
    }
  }

  /**
   * Confirmar registro en backend (después del registro en Cognito)
   */
  async confirmRegistration(email, firstName, lastName, phoneNumber) {
    const pool = getUsersPool();
    try {
      const result = await pool.query(
        'UPDATE numerica_users SET first_name = $1, last_name = $2, phone_number = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE email = $5 RETURNING *',
        [firstName, lastName, phoneNumber, 'pending_verification', email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error('Usuario no encontrado en base de datos');
      }

      console.log(`✅ Registro confirmado en backend para ${email}`);

      return {
        success: true,
        user: result.rows[0]
      };
    } finally {
      await pool.end();
    }
  }
}

module.exports = new AuthService();

