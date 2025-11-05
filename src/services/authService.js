import { CognitoUserPool, AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';

// Configuración del User Pool de Cognito
const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'us-east-1_JwP9gBEvr',
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '18l43dor2k5fja5pu0caf64u2f'
};

const userPool = new CognitoUserPool(poolData);

class AuthService {
  /**
   * Iniciar sesión con email y contraseña
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} - Información del usuario y tokens
   */
  async login(email, password) {
    return new Promise((resolve, reject) => {
      const authenticationData = {
        Username: email,
        Password: password,
      };

      const authenticationDetails = new AuthenticationDetails(authenticationData);

      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const idToken = result.getIdToken().getJwtToken();
          const accessToken = result.getAccessToken().getJwtToken();
          const refreshToken = result.getRefreshToken().getToken();

          // Guardar tokens en localStorage
          localStorage.setItem('idToken', idToken);
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('userEmail', email);

          // Decodificar payload del idToken para obtener información del usuario
          const payload = this.decodeToken(idToken);

          resolve({
            idToken,
            accessToken,
            refreshToken,
            user: {
              email,
              name: payload.name,
              sub: payload.sub,
              permissions: {
                role: payload['custom:role'] || 'user',
                canUpload: payload['custom:can_upload'] === 'true',
                canViewFunds: payload['custom:can_view_funds'] === 'true',
                permissionsLoaded: payload['custom:permissions_loaded'] === 'true'
              }
            }
          });
        },
        onFailure: (err) => {
          console.error('Error de autenticación:', err);
          reject(this.formatError(err));
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // El usuario necesita cambiar su contraseña
          reject({
            code: 'NEW_PASSWORD_REQUIRED',
            message: 'Se requiere cambiar la contraseña',
            userAttributes,
            requiredAttributes,
            cognitoUser
          });
        }
      });
    });
  }

  /**
   * Cerrar sesión del usuario
   */
  logout() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    
    // Limpiar localStorage
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
  }

  /**
   * Verificar si el usuario está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) return false;

    try {
      const payload = this.decodeToken(idToken);
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener el token ID actual
   * @returns {string|null}
   */
  getIdToken() {
    return localStorage.getItem('idToken');
  }

  /**
   * Obtener el token de acceso actual
   * @returns {string|null}
   */
  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  /**
   * Obtener información del usuario actual
   * @returns {Object|null}
   */
  getCurrentUser() {
    const idToken = this.getIdToken();
    if (!idToken) return null;

    try {
      const payload = this.decodeToken(idToken);
      return {
        email: payload.email,
        name: payload.name,
        sub: payload.sub,
        permissions: {
          role: payload['custom:role'] || 'user',
          canUpload: payload['custom:can_upload'] === 'true',
          canViewFunds: payload['custom:can_view_funds'] === 'true',
          permissionsLoaded: payload['custom:permissions_loaded'] === 'true'
        }
      };
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Refrescar el token de sesión
   * @returns {Promise<string>} - Nuevo idToken
   */
  async refreshSession() {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        reject(new Error('No hay usuario autenticado'));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        if (!session.isValid()) {
          reject(new Error('Sesión inválida'));
          return;
        }

        const idToken = session.getIdToken().getJwtToken();
        localStorage.setItem('idToken', idToken);
        resolve(idToken);
      });
    });
  }

  /**
   * Cambiar contraseña del usuario
   * @param {string} oldPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise}
   */
  async changePassword(oldPassword, newPassword) {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        reject(new Error('No hay usuario autenticado'));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result);
        });
      });
    });
  }

  /**
   * Iniciar proceso de recuperación de contraseña
   * @param {string} email - Email del usuario
   * @returns {Promise}
   */
  async forgotPassword(email) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.forgotPassword({
        onSuccess: (result) => {
          resolve(result);
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * Confirmar nueva contraseña con código de verificación
   * @param {string} email - Email del usuario
   * @param {string} verificationCode - Código recibido por email
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise}
   */
  async confirmPassword(email, verificationCode, newPassword) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmPassword(verificationCode, newPassword, {
        onSuccess: () => {
          resolve('Contraseña cambiada exitosamente');
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * Decodificar un JWT token (solo payload, sin validar firma)
   * @param {string} token - JWT token
   * @returns {Object} - Payload decodificado
   */
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  /**
   * Formatear errores de Cognito para mostrar al usuario
   * @param {Object} error - Error de Cognito
   * @returns {Object} - Error formateado
   */
  formatError(error) {
    const errorMessages = {
      'UserNotFoundException': 'Usuario no encontrado',
      'NotAuthorizedException': 'Email o contraseña incorrectos',
      'UserNotConfirmedException': 'Usuario no confirmado. Por favor verifica tu email',
      'PasswordResetRequiredException': 'Se requiere restablecer la contraseña',
      'InvalidParameterException': 'Parámetros inválidos',
      'TooManyRequestsException': 'Demasiados intentos. Por favor espera un momento',
      'InvalidPasswordException': 'La contraseña no cumple con los requisitos de seguridad',
      'UsernameExistsException': 'Este email ya está registrado',
      'NetworkError': 'Error de conexión. Por favor verifica tu internet'
    };

    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: errorMessages[error.code] || error.message || 'Error desconocido'
    };
  }
}

// Exportar una instancia única del servicio
const authService = new AuthService();
export default authService;

