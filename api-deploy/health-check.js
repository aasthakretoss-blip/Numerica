const https = require('https');

const API_ENDPOINT = 'https://numerica-2.onrender.com';

exports.handler = async (event) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Health check iniciado para mantener API activa`);
    
    try {
        // Hacer ping al endpoint principal
        const response = await makeRequest(`${API_ENDPOINT}/api/payroll/stats`);
        
        console.log(`[${timestamp}] ✅ API responde correctamente:`, {
            statusCode: response.statusCode,
            timestamp: timestamp,
            endpoint: `${API_ENDPOINT}/api/payroll/stats`
        });
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Health check exitoso',
                timestamp: timestamp,
                apiStatus: 'online',
                responseCode: response.statusCode
            })
        };
    } catch (error) {
        console.error(`[${timestamp}] ❌ Error en health check:`, error.message);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Health check falló',
                timestamp: timestamp,
                error: error.message,
                apiStatus: 'offline'
            })
        };
    }
};

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            timeout: 10000, // 10 segundos timeout
        }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve({
                    statusCode: response.statusCode,
                    data: data,
                    headers: response.headers
                });
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}
