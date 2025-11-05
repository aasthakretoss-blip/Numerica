import json
import psycopg2
import os
from psycopg2.extras import RealDictCursor

def handler(event, context):
    """Database verification handler to check schema and tables"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    try:
        path = event.get('rawPath', event.get('path', '/'))
        
        if path == '/api/db-verify':
            return verify_database_schema(headers)
        elif path == '/api/db-create-employee-table':
            return create_employee_table(headers)
        elif path == '/api/db-test-employees':
            return test_employee_operations(headers)
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Not found', 
                    'available_endpoints': ['/api/db-verify', '/api/db-create-employee-table', '/api/db-test-employees']
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'status': 'error',
                'message': str(e),
                'type': 'handler_error'
            })
        }

def get_db_connection():
    """Get database connection with proper error handling"""
    return psycopg2.connect(
        host=os.getenv('PGHOST'),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=int(os.getenv('PGPORT', '5432')),
        connect_timeout=10
    )

def verify_database_schema(headers):
    """Verify database connection and check existing schema"""
    try:
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get all tables
            cur.execute("""
                SELECT table_name, table_schema 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = cur.fetchall()
            
            # Check if employees table exists
            employee_table_exists = any(table['table_name'] == 'employees' for table in tables)
            
            result = {
                'status': 'success',
                'message': '💰 Database connection successful!',
                'database_info': {
                    'host': os.getenv('PGHOST'),
                    'database': os.getenv('PGDATABASE'),
                    'total_tables': len(tables)
                },
                'tables': [dict(table) for table in tables],
                'employee_table_exists': employee_table_exists
            }
            
            # If employees table exists, get its structure
            if employee_table_exists:
                cur.execute("""
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'employees' 
                    AND table_schema = 'public'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                result['employee_table_structure'] = [dict(col) for col in columns]
                
                # Get row count
                cur.execute("SELECT COUNT(*) as count FROM employees")
                count = cur.fetchone()
                result['employee_count'] = count['count']
            
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Database verification failed: {str(e)}',
                'type': 'database_error'
            })
        }

def create_employee_table(headers):
    """Create the employees table if it doesn't exist"""
    try:
        conn = get_db_connection()
        
        with conn.cursor() as cur:
            # Create employees table with the schema from schema.sql
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS employees (
              id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              first_name  TEXT NOT NULL,
              last_name   TEXT NOT NULL,
              email       TEXT UNIQUE NOT NULL,
              phone       TEXT,
              department  TEXT NOT NULL,
              role        TEXT NOT NULL,
              location    TEXT,
              status      TEXT NOT NULL CHECK (status IN ('Active','Leave','Inactive')),
              hire_date   TIMESTAMPTZ,
              tags        TEXT[],
              avatar_url  TEXT,
              created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            cur.execute(create_table_sql)
            
            # Create indexes
            indexes_sql = [
                "CREATE INDEX IF NOT EXISTS idx_employees_fullname ON employees ((lower(first_name || ' ' || last_name)))",
                "CREATE INDEX IF NOT EXISTS idx_employees_email ON employees (lower(email))",
                "CREATE INDEX IF NOT EXISTS idx_employees_filters ON employees (department, role, status, location)"
            ]
            
            for index_sql in indexes_sql:
                cur.execute(index_sql)
            
            conn.commit()
            
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'status': 'success',
                'message': '✅ Employee table created successfully!',
                'table_created': True,
                'indexes_created': len(indexes_sql)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Table creation failed: {str(e)}',
                'type': 'table_creation_error'
            })
        }

def test_employee_operations(headers):
    """Test basic employee CRUD operations"""
    try:
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Insert a test employee
            test_employee = {
                'first_name': 'Test',
                'last_name': 'Employee',
                'email': f'test.employee.{int(context.aws_request_id[-8:], 16)}@numerica.com',
                'department': 'IT',
                'role': 'Developer',
                'status': 'Active'
            }
            
            cur.execute("""
                INSERT INTO employees (first_name, last_name, email, department, role, status)
                VALUES (%(first_name)s, %(last_name)s, %(email)s, %(department)s, %(role)s, %(status)s)
                RETURNING id, first_name, last_name, email
            """, test_employee)
            
            inserted_employee = cur.fetchone()
            
            # Query the employee back
            cur.execute("SELECT COUNT(*) as total FROM employees")
            total_count = cur.fetchone()
            
            # Clean up test data
            cur.execute("DELETE FROM employees WHERE email = %s", (test_employee['email'],))
            
            conn.commit()
            
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'status': 'success',
                'message': '🚀 Employee operations test successful!',
                'test_results': {
                    'insert_successful': True,
                    'inserted_employee': dict(inserted_employee),
                    'total_employees_before_cleanup': total_count['total'],
                    'cleanup_successful': True
                }
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Employee operations test failed: {str(e)}',
                'type': 'operations_test_error'
            })
        }
