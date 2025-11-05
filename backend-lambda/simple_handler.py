import json
import psycopg2
import os

def handler(event, context):
    """Simple Lambda handler without complex dependencies"""
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    try:
        # Handle preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Get the path
        path = event.get('rawPath', event.get('path', '/'))
        
        # Test endpoint
        if path == '/api/test':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'status': 'ok',
                    'message': '🚀 SHOW ME THE MONEY! API is working!',
                    'service': 'Numerica Payroll API',
                    'database_config': {
                        'host': os.getenv('PGHOST'),
                        'database': os.getenv('PGDATABASE'),
                        'user': os.getenv('PGUSER')
                    }
                })
            }
        
        # Database test endpoint
        if path == '/api/db-test':
            try:
                conn = psycopg2.connect(
                    host=os.getenv('PGHOST'),
                    database=os.getenv('PGDATABASE'),
                    user=os.getenv('PGUSER'),
                    password=os.getenv('PGPASSWORD'),
                    port=int(os.getenv('PGPORT', '5432')),
                    connect_timeout=10
                )
                
                with conn.cursor() as cur:
                    # First, let's see what tables exist
                    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                    tables = [row[0] for row in cur.fetchall()]
                    
                    # Try to count employees if table exists
                    employee_count = 0
                    if 'employees' in tables:
                        cur.execute('SELECT COUNT(*) FROM employees')
                        employee_count = cur.fetchone()[0]
                    
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'status': 'success',
                        'message': '💰 DATABASE CONNECTED! SHOW ME THE MONEY!',
                        'tables': tables,
                        'employee_count': employee_count,
                        'connection_info': {
                            'host': os.getenv('PGHOST'),
                            'database': os.getenv('PGDATABASE')
                        }
                    })
                }
                
            except Exception as db_error:
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({
                        'status': 'error',
                        'message': f'Database connection failed: {str(db_error)}',
                        'connection_attempt': {
                            'host': os.getenv('PGHOST'),
                            'database': os.getenv('PGDATABASE'),
                            'user': os.getenv('PGUSER')
                        }
                    })
                }
        
        # Default response
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'message': 'Not found', 'available_endpoints': ['/api/test', '/api/db-test']})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'status': 'error',
                'message': str(e),
                'event': event
            })
        }
