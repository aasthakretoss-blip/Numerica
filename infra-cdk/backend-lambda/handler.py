import json
import os
import socket
import urllib.request
import urllib.parse
from urllib.error import URLError, HTTPError

def lambda_handler(event, context):
    """
    Handler principal de Lambda para verificación de base de datos.
    Versión simplificada que no requiere psycopg2.
    """
    
    # Headers CORS
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }
    
    try:
        # Extraer información de la solicitud
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        # Manejar preflight CORS
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'message': 'CORS preflight successful'})
            }
        
        # Router básico
        if path.endswith('/verify-db'):
            return handle_verify_db(event, context, cors_headers)
        elif path.endswith('/test-connection'):
            return handle_test_connection(event, context, cors_headers)
        else:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Not Found',
                    'message': f'Path {path} not found',
                    'available_endpoints': [
                        '/api/verify-db',
                        '/api/test-connection'
                    ]
                })
            }
    
    except Exception as e:
        print(f"Error general en lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        }

def handle_verify_db(event, context, cors_headers):
    """
    Verifica la configuración de la base de datos y variables de entorno.
    """
    try:
        # Verificar variables de entorno requeridas
        required_env_vars = [
            'DB_HOST',
            'DB_PORT', 
            'DB_NAME',
            'DB_USER',
            'DB_PASSWORD'
        ]
        
        env_status = {}
        missing_vars = []
        
        for var in required_env_vars:
            value = os.environ.get(var)
            if value:
                # Ocultar password para seguridad
                if 'PASSWORD' in var:
                    env_status[var] = '***CONFIGURED***'
                else:
                    env_status[var] = value
            else:
                env_status[var] = None
                missing_vars.append(var)
        
        # Información del contexto Lambda
        context_info = {
            'function_name': context.function_name,
            'function_version': context.function_version,
            'memory_limit': context.memory_limit_in_mb,
            'remaining_time_ms': context.get_remaining_time_in_millis()
        }
        
        result = {
            'status': 'success',
            'message': 'Database configuration verification completed',
            'environment_variables': env_status,
            'missing_variables': missing_vars,
            'lambda_context': context_info,
            'configuration_complete': len(missing_vars) == 0
        }
        
        status_code = 200 if len(missing_vars) == 0 else 206  # 206 = Partial Content
        
        return {
            'statusCode': status_code,
            'headers': cors_headers,
            'body': json.dumps(result, indent=2)
        }
        
    except Exception as e:
        print(f"Error en handle_verify_db: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Error verifying database configuration: {str(e)}'
            })
        }

def handle_test_connection(event, context, cors_headers):
    """
    Prueba la conectividad de red al host de la base de datos.
    """
    try:
        db_host = os.environ.get('DB_HOST')
        db_port = os.environ.get('DB_PORT', '5432')
        
        if not db_host:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'status': 'error',
                    'message': 'DB_HOST environment variable not configured'
                })
            }
        
        # Test de conectividad de red usando socket
        try:
            port = int(db_port)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)  # 10 segundos timeout
            result = sock.connect_ex((db_host, port))
            sock.close()
            
            if result == 0:
                connection_status = 'success'
                connection_message = f'Network connection to {db_host}:{port} successful'
            else:
                connection_status = 'failed'
                connection_message = f'Cannot connect to {db_host}:{port} (error code: {result})'
        
        except socket.gaierror as e:
            connection_status = 'dns_error'
            connection_message = f'DNS resolution failed for {db_host}: {str(e)}'
        except ValueError as e:
            connection_status = 'config_error'
            connection_message = f'Invalid port number {db_port}: {str(e)}'
        except Exception as e:
            connection_status = 'error'
            connection_message = f'Connection test failed: {str(e)}'
        
        result = {
            'status': connection_status,
            'message': connection_message,
            'target': f'{db_host}:{db_port}',
            'test_type': 'socket_connection'
        }
        
        status_code = 200 if connection_status == 'success' else 503
        
        return {
            'statusCode': status_code,
            'headers': cors_headers,
            'body': json.dumps(result, indent=2)
        }
        
    except Exception as e:
        print(f"Error en handle_test_connection: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Error testing database connection: {str(e)}'
            })
        }

# Información de ayuda para debugging
if __name__ == "__main__":
    print("Database Verification Handler - Updated 2025-10-02")
    print("Available endpoints:")
    print("- GET /api/verify-db: Check environment variables and Lambda configuration")
    print("- GET /api/test-connection: Test network connectivity to database host")
