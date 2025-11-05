import json
import os

def handler(event, context):
    """Ultra simple test handler"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'status': '🚀 SUCCESS!',
            'message': 'SHOW ME THE MONEY! 💰 API IS WORKING!',
            'service': 'Numerica Payroll API',
            'lambda_info': {
                'runtime': 'Python 3.11',
                'event': event.get('requestContext', {}),
                'path': event.get('rawPath', 'unknown'),
                'method': event.get('requestContext', {}).get('http', {}).get('method')
            },
            'environment': {
                'PGHOST': os.getenv('PGHOST'),
                'PGDATABASE': os.getenv('PGDATABASE'),
                'AWS_REGION': os.getenv('AWS_REGION')
            }
        })
    }
