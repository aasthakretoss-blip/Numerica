
const AWS = require('aws-sdk');

// AWS Secrets Manager Helper
class SecretsManager {
  constructor() {
    this.secretsClient = new AWS.SecretsManager({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this._cache = new Map();
    this._cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }
  
  async getSecret(secretName) {
    // Verificar cache
    const cached = this._cache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      return cached.value;
    }
    
    try {
      const result = await this.secretsClient.getSecretValue({
        SecretId: secretName
      }).promise();
      
      const secret = JSON.parse(result.SecretString);
      
      // Cache por 5 minutos
      this._cache.set(secretName, {
        value: secret,
        timestamp: Date.now()
      });
      
      return secret;
    } catch (error) {
      console.error('Error retrieving secret:', error);
      throw error;
    }
  }
  
  async getDBCredentials() {
    return this.getSecret(process.env.AWS_SECRET_NAME || 'numerica/db/credentials');
  }
}

module.exports = new SecretsManager();
