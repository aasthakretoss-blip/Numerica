const {
  CognitoIdentityProviderClient,
  AdminConfirmSignUpCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { nominasPool } = require("../config/database");

// Cliente de Cognito
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY,
  },
});

class AuthService {
  /**
   * Validar email contra numerica_users
   */
  async validateEmail(email) {
    const client = await nominasPool.connect();
    try {
      const result = await client.query(
        "SELECT email, status FROM numerica_users WHERE email = $1",
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error(
          "Email no autorizado. Contacta al administrador para obtener acceso."
        );
      }

      const user = result.rows[0];

      if (user.status === "active") {
        throw new Error(
          "Este email ya está registrado. Por favor inicia sesión."
        );
      }

      if (user.status === "blocked") {
        throw new Error(
          "Esta cuenta ha sido bloqueada. Contacta al administrador."
        );
      }

      return {
        valid: true,
        email: user.email,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Confirmar usuario manualmente con código fijo
   */
  async confirmUserWithCode(username, code) {
    // Validar código fijo
    const CODIGO_VERIFICACION = "1489999";

    if (code !== CODIGO_VERIFICACION) {
      throw new Error("Código de verificación incorrecto");
    }

    // Confirmar usuario en Cognito usando adminConfirmSignUp
    try {
      console.log(process.env.COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID");
      console.log(username, "username to confirm");
      const command = new AdminConfirmSignUpCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: username,
      });

      await cognitoClient.send(command);

      console.log(`✅ Usuario ${username} confirmado manualmente en Cognito`);

      return {
        success: true,
        message: "Usuario verificado exitosamente",
      };
    } catch (error) {
      console.error("❌ Error confirmando usuario en Cognito:", error);
      throw new Error(`Error al confirmar usuario: ${error.message}`);
    }
  }

  /**
   * Activar usuario en base de datos
   */
  async activateUser(email) {
    const client = await nominasPool.connect();
    try {
      const result = await client.query(
        "UPDATE numerica_users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *",
        ["active", email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error("Usuario no encontrado en base de datos");
      }

      console.log(`✅ Usuario ${email} activado en base de datos`);

      return {
        success: true,
        user: result.rows[0],
      };
    } finally {
      client.release();
    }
  }

  /**
   * Confirmar registro en backend (después del registro en Cognito)
   */
  // async confirmRegistration(email, firstName, lastName, phoneNumber) {
  //   const client = await nominasPool.connect();
  //   try {
  //     const result = await client.query(
  //       'UPDATE numerica_users SET first_name = $1, last_name = $2, phone_number = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE email = $5 RETURNING *',
  //       [firstName, lastName, phoneNumber, 'pending_verification', email.toLowerCase()]
  //     );

  //     if (result.rows.length === 0) {
  //       throw new Error('Usuario no encontrado en base de datos');
  //     }

  //     console.log(`✅ Registro confirmado en backend para ${email}`);

  //     return {
  //       success: true,
  //       user: result.rows[0]
  //     };
  //   } finally {
  //     client.release();
  //   }
  // }
  async confirmRegistration(email, firstName, lastName, phoneNumber) {
    const client = await nominasPool.connect();
    try {
      const lowerEmail = email.toLowerCase();

      // 1️⃣ Verificar si ya existe
      const check = await client.query(
        "SELECT id FROM numerica_users WHERE email = $1",
        [lowerEmail]
      );

      if (check.rows.length > 0) {
        throw new Error("Este email ya existe en la base de datos");
      }

      // 2️⃣ Insertar usuario nuevo
      const result = await client.query(
        `INSERT INTO numerica_users 
        (email, first_name, last_name, phone_number, status, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
        [lowerEmail, firstName, lastName, phoneNumber, "pending_setup"]
      );

      console.log(`✅ Usuario insertado en backend: ${email}`);

      return {
        success: true,
        user: result.rows[0],
      };
    } finally {
      client.release();
    }
  }
}

module.exports = new AuthService();
