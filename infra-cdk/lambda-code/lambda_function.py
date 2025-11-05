import json
import os
import socket

# Intentar importar psycopg2, si no está disponible, usar modo simulación
try:
    import psycopg2
    import psycopg2.extras
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("WARNING: psycopg2 not available, using simulation mode")

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
        # Extraer información de la solicitud - compatible con API Gateway v1 y v2
        http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'GET'))
        path = event.get('path', event.get('rawPath', ''))
        print(f"DEBUG: http_method={http_method}, path='{path}', full_event={json.dumps(event, default=str)}")
        
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
        elif path.endswith('/check-table'):
            return handle_check_table(event, context, cors_headers)
        elif path.endswith('/create-table'):
            return handle_create_table(event, context, cors_headers)
        elif path.endswith('/test-crud'):
            return handle_test_crud(event, context, cors_headers)
        elif path.endswith('/list-databases'):
            return handle_list_databases(event, context, cors_headers)
        # Nuevos endpoints para la aplicación React
        elif path.endswith('/payroll/stats'):
            return handle_payroll_stats(event, context, cors_headers)
        elif path.endswith('/payroll/periodos'):
            return handle_payroll_periodos(event, context, cors_headers)
        elif path.endswith('/payroll/demographic'):
            return handle_payroll_demographic(event, context, cors_headers)
        elif path.endswith('/payroll/demographic/unique-count'):
            return handle_demographic_unique_count(event, context, cors_headers)
        elif '/payroll' in path and not path.endswith('/payroll/stats') and not path.endswith('/payroll/periodos') and not path.endswith('/payroll/demographic'):
            return handle_payroll_data(event, context, cors_headers)
        else:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Not Found',
                    'message': f'Path {path} not found',
                    'available_endpoints': [
                        '/api/verify-db',
                        '/api/test-connection',
                        '/api/check-table',
                        '/api/create-table',
                        '/api/test-crud',
                        '/api/payroll/stats',
                        '/api/payroll/periodos',
                        '/api/payroll/demographic',
                        '/api/payroll/demographic/unique-count',
                        '/api/payroll'
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
            'message': 'Database configuration verification completed - NEW VERSION',
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

def get_db_connection():
    """
    Obtiene una conexión a la base de datos PostgreSQL.
    """
    if not PSYCOPG2_AVAILABLE:
        raise Exception("psycopg2 is not available")
    
    return psycopg2.connect(
        host=os.environ.get('DB_HOST'),
        port=os.environ.get('DB_PORT', '5432'),
        database=os.environ.get('DB_NAME'),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASSWORD'),
        sslmode='require'
    )

def handle_check_table(event, context, cors_headers):
    """
    Verifica si la tabla 'historico_nominas_gsau' existe y muestra su estructura.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            return {
                'statusCode': 503,
                'headers': cors_headers,
                'body': json.dumps({
                    'status': 'unavailable',
                    'message': 'Database operations not available - psycopg2 not installed',
                    'simulation_mode': True
                })
            }
        
        # Conectar a la base de datos
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Primero, listar todas las bases de datos disponibles
                cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
                databases = [row['datname'] for row in cur.fetchall()]
                
                # Listar todas las tablas en el esquema actual
                cur.execute("""
                    SELECT table_schema, table_name 
                    FROM information_schema.tables 
                    WHERE table_type = 'BASE TABLE'
                    ORDER BY table_schema, table_name;
                """)
                all_tables = [dict(row) for row in cur.fetchall()]
                
                # Verificar si la tabla existe en el esquema public
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'historico_nominas_gsau'
                    );
                """)
                table_exists = cur.fetchone()['exists']
                
                result = {
                    'status': 'success',
                    'message': 'Table verification completed',
                    'table_exists': table_exists
                }
                
                if table_exists:
                    # Obtener información de columnas
                    cur.execute("""
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'historico_nominas_gsau'
                        ORDER BY ordinal_position;
                    """)
                    columns = cur.fetchall()
                    
                    # Obtener índices
                    cur.execute("""
                        SELECT indexname, indexdef
                        FROM pg_indexes
                        WHERE tablename = 'historico_nominas_gsau' AND schemaname = 'public';
                    """)
                    indexes = cur.fetchall()
                    
                    # Contar registros
                    cur.execute("SELECT COUNT(*) as count FROM historico_nominas_gsau;")
                    row_count = cur.fetchone()['count']
                    
                    result.update({
                        'columns': [dict(col) for col in columns],
                        'indexes': [dict(idx) for idx in indexes],
                        'row_count': row_count
                    })
                else:
                    result['message'] = 'Table historico_nominas_gsau does not exist'
                    result.update({
                        'available_databases': databases,
                        'available_tables': all_tables,
                        'diagnostic_info': f'Connected to database: {os.environ.get("DB_NAME")}'
                    })
        
        status_code = 200 if table_exists else 404
        
        return {
            'statusCode': status_code,
            'headers': cors_headers,
            'body': json.dumps(result, indent=2, default=str)
        }
        
    except Exception as e:
        print(f"Error en handle_check_table: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Error checking table: {str(e)}'
            })
        }

def handle_create_table(event, context, cors_headers):
    """
    Crea la tabla 'employees' si no existe.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            return {
                'statusCode': 503,
                'headers': cors_headers,
                'body': json.dumps({
                    'status': 'unavailable',
                    'message': 'Database operations not available - psycopg2 not installed',
                    'simulation_mode': True
                })
            }
        
        # SQL para crear la tabla employees
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(20) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE,
            phone VARCHAR(20),
            department VARCHAR(100),
            position VARCHAR(100),
            salary DECIMAL(12,2),
            hire_date DATE,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        # SQL para crear índices
        create_indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);",
            "CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);",
            "CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);",
            "CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);"
        ]
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Crear tabla
                cur.execute(create_table_sql)
                
                # Crear índices
                for index_sql in create_indexes_sql:
                    cur.execute(index_sql)
                
                # Confirmar cambios
                conn.commit()
        
        result = {
            'status': 'success',
            'message': 'Table employees created successfully with indexes',
            'table_created': True
        }
        
        return {
            'statusCode': 201,
            'headers': cors_headers,
            'body': json.dumps(result, indent=2)
        }
        
    except Exception as e:
        print(f"Error en handle_create_table: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Error creating table: {str(e)}'
            })
        }

def handle_test_crud(event, context, cors_headers):
    """
    Realiza pruebas básicas de CRUD en la tabla employees.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            return {
                'statusCode': 503,
                'headers': cors_headers,
                'body': json.dumps({
                    'status': 'unavailable',
                    'message': 'Database operations not available - psycopg2 not installed',
                    'simulation_mode': True
                })
            }
        
        test_results = []
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                
                # Test 1: INSERT
                try:
                    insert_sql = """
                    INSERT INTO employees (employee_id, first_name, last_name, email, department, position, salary, hire_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, employee_id;
                    """
                    
                    test_data = (
                        'TEST001',
                        'Test',
                        'Employee',
                        'test@example.com',
                        'IT',
                        'Developer',
                        50000.00,
                        '2025-01-01'
                    )
                    
                    cur.execute(insert_sql, test_data)
                    inserted_record = cur.fetchone()
                    
                    test_results.append({
                        'operation': 'INSERT',
                        'status': 'success',
                        'message': f'Inserted employee with ID: {inserted_record["id"]}',
                        'data': dict(inserted_record)
                    })
                    
                except Exception as e:
                    test_results.append({
                        'operation': 'INSERT',
                        'status': 'error',
                        'message': str(e)
                    })
                
                # Test 2: SELECT
                try:
                    select_sql = "SELECT * FROM employees WHERE employee_id = %s;"
                    cur.execute(select_sql, ('TEST001',))
                    selected_record = cur.fetchone()
                    
                    if selected_record:
                        test_results.append({
                            'operation': 'SELECT',
                            'status': 'success',
                            'message': 'Successfully retrieved test employee',
                            'data': dict(selected_record)
                        })
                    else:
                        test_results.append({
                            'operation': 'SELECT',
                            'status': 'warning',
                            'message': 'Test employee not found'
                        })
                        
                except Exception as e:
                    test_results.append({
                        'operation': 'SELECT',
                        'status': 'error',
                        'message': str(e)
                    })
                
                # Test 3: UPDATE
                try:
                    update_sql = "UPDATE employees SET salary = %s, updated_at = CURRENT_TIMESTAMP WHERE employee_id = %s RETURNING salary;"
                    cur.execute(update_sql, (55000.00, 'TEST001'))
                    updated_record = cur.fetchone()
                    
                    if updated_record:
                        test_results.append({
                            'operation': 'UPDATE',
                            'status': 'success',
                            'message': f'Updated salary to {updated_record["salary"]}'
                        })
                    else:
                        test_results.append({
                            'operation': 'UPDATE',
                            'status': 'warning',
                            'message': 'No records updated'
                        })
                        
                except Exception as e:
                    test_results.append({
                        'operation': 'UPDATE',
                        'status': 'error',
                        'message': str(e)
                    })
                
                # Test 4: DELETE (cleanup)
                try:
                    delete_sql = "DELETE FROM employees WHERE employee_id = %s RETURNING id;"
                    cur.execute(delete_sql, ('TEST001',))
                    deleted_record = cur.fetchone()
                    
                    if deleted_record:
                        test_results.append({
                            'operation': 'DELETE',
                            'status': 'success',
                            'message': f'Deleted test employee with ID: {deleted_record["id"]}'
                        })
                    else:
                        test_results.append({
                            'operation': 'DELETE',
                            'status': 'warning',
                            'message': 'No records deleted'
                        })
                        
                except Exception as e:
                    test_results.append({
                        'operation': 'DELETE',
                        'status': 'error',
                        'message': str(e)
                    })
                
                # Confirmar cambios
                conn.commit()
        
        # Evaluar el resultado general
        success_count = len([r for r in test_results if r['status'] == 'success'])
        total_tests = len(test_results)
        
        overall_status = 'success' if success_count == total_tests else 'partial_success' if success_count > 0 else 'failed'
        
        result = {
            'status': overall_status,
            'message': f'CRUD tests completed: {success_count}/{total_tests} successful',
            'test_results': test_results,
            'summary': {
                'total_tests': total_tests,
                'successful': success_count,
                'failed': total_tests - success_count
            }
        }
        
        status_code = 200 if overall_status == 'success' else 207  # 207 = Multi-Status
        
        return {
            'statusCode': status_code,
            'headers': cors_headers,
            'body': json.dumps(result, indent=2, default=str)
        }
        
    except Exception as e:
        print(f"Error en handle_test_crud: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Error performing CRUD tests: {str(e)}'
            })
        }

def handle_list_databases(event, context, cors_headers):
    """
    Lista todas las bases de datos disponibles en el servidor PostgreSQL.
    Se conecta a la base de datos por defecto 'postgres' para obtener la lista.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            return {
                'statusCode': 503,
                'headers': cors_headers,
                'body': json.dumps({
                    'status': 'unavailable',
                    'message': 'Database operations not available - psycopg2 not installed',
                    'simulation_mode': True
                })
            }
        
        # Crear una conexión temporal a la base de datos postgres
        temp_connection = psycopg2.connect(
            host=os.environ.get('DB_HOST'),
            port=os.environ.get('DB_PORT', '5432'),
            database='postgres',  # Base de datos por defecto
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            sslmode='require'
        )
        
        with temp_connection:
            with temp_connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Listar todas las bases de datos no template
                cur.execute("""
                    SELECT datname, datistemplate
                    FROM pg_database 
                    WHERE datistemplate = false
                    ORDER BY datname;
                """)
                databases = [dict(row) for row in cur.fetchall()]
                
                # Obtener el usuario actual
                cur.execute("SELECT current_user, current_database();")
                current_info = cur.fetchone()
        
        result = {
            'status': 'success',
            'message': 'Successfully listed databases',
            'current_user': current_info['current_user'],
            'current_database': current_info['current_database'],
            'configured_database': os.environ.get('DB_NAME'),
            'databases': databases,
            'total_databases': len(databases)
        }
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps(result, indent=2, default=str)
        }
        
    except Exception as e:
        print(f"Error en handle_list_databases: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'status': 'error',
                'message': f'Error listing databases: {str(e)}'
            })
        }

# ============================================================================
# NUEVOS ENDPOINTS PARA LA APLICACIÓN REACT
# ============================================================================

def parse_query_params(event):
    """
    Extrae parámetros de query de la solicitud API Gateway.
    """
    params = {}
    
    # API Gateway v1
    if 'queryStringParameters' in event and event['queryStringParameters']:
        params.update(event['queryStringParameters'])
    
    # API Gateway v2
    if 'rawQueryString' in event:
        from urllib.parse import parse_qs
        parsed = parse_qs(event['rawQueryString'])
        for key, values in parsed.items():
            params[key] = values[0] if len(values) == 1 else values
    
    return params

def handle_payroll_stats(event, context, cors_headers):
    """
    Endpoint: /api/payroll/stats
    Devuelve estadísticas generales de la nómina.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            # Datos simulados si no hay psycopg2
            stats = {
                'totalRecords': 156789,
                'uniqueEmployees': 1608,
                'uniquePeriods': 48,
                'averageRecordsPerEmployee': 97,
                'statusDistribution': [
                    {'status': 'A', 'statusName': 'Activo', 'count': 1608, 'percentage': 100.0},
                    {'status': 'B', 'statusName': 'Baja', 'count': 0, 'percentage': 0.0}
                ]
            }
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'stats': stats,
                    'simulation_mode': True
                }, indent=2)
            }
        
        # Consultar datos reales
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Total de registros
                cur.execute("SELECT COUNT(*) as total FROM historico_nominas_gsau;")
                total_records = cur.fetchone()['total']
                
                # Empleados únicos
                cur.execute('SELECT COUNT(DISTINCT "CURP") as unique_employees FROM historico_nominas_gsau WHERE "CURP" IS NOT NULL;')
                unique_employees = cur.fetchone()['unique_employees']
                
                # Períodos únicos
                cur.execute('SELECT COUNT(DISTINCT "Mes") as unique_periods FROM historico_nominas_gsau WHERE "Mes" IS NOT NULL;')
                unique_periods = cur.fetchone()['unique_periods']
                
                # Distribución por status
                cur.execute("""
                    SELECT "Status", COUNT(*) as count,
                           ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                    FROM historico_nominas_gsau
                    WHERE "Status" IS NOT NULL
                    GROUP BY "Status"
                    ORDER BY count DESC;
                """)
                status_distribution = []
                for row in cur.fetchall():
                    status_name = 'Activo' if row['Status'] == 'A' else 'Baja' if row['Status'] == 'B' else 'Desconocido'
                    status_distribution.append({
                        'status': row['Status'],
                        'statusName': status_name,
                        'count': row['count'],
                        'percentage': float(row['percentage'])
                    })
                
                average_records = total_records // unique_employees if unique_employees > 0 else 0
                
                stats = {
                    'totalRecords': total_records,
                    'uniqueEmployees': unique_employees,
                    'uniquePeriods': unique_periods,
                    'averageRecordsPerEmployee': average_records,
                    'statusDistribution': status_distribution
                }
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'stats': stats,
                'simulation_mode': False
            }, indent=2)
        }
        
    except Exception as e:
        print(f"Error en handle_payroll_stats: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting payroll stats: {str(e)}'
            })
        }

def handle_payroll_periodos(event, context, cors_headers):
    """
    Endpoint: /api/payroll/periodos
    Devuelve los períodos disponibles en la base de datos.
    IMPORTANTE: Usa cveper (timestamp) para obtener períodos únicos por fecha.
    El frontend agrupa estas fechas por mes automáticamente.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            # Datos simulados - usar fechas completas YYYY-MM-DD
            periodos = [
                {'value': '2024-11-15', 'count': 1608},
                {'value': '2024-10-15', 'count': 1595},
                {'value': '2024-09-15', 'count': 1580},
                {'value': '2024-08-15', 'count': 1570}
            ]
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'data': periodos,
                    'simulation_mode': True
                })
            }
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # ✅ FIX: Usar cveper (timestamp) en lugar de "Mes" (nombre del mes)
                # Convierte cveper a DATE y agrupa por fecha única
                # El frontend (groupPeriodsByMonth) agrupará estas fechas por mes
                cur.execute("""
                    SELECT 
                        DATE(cveper)::text AS value, 
                        COUNT(*) as count
                    FROM historico_nominas_gsau
                    WHERE cveper IS NOT NULL
                    GROUP BY DATE(cveper)::text
                    ORDER BY DATE(cveper)::text DESC
                    LIMIT 50;
                """)
                
                periodos = [dict(row) for row in cur.fetchall()]
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': periodos,
                'simulation_mode': False
            })
        }
        
    except Exception as e:
        print(f"Error en handle_payroll_periodos: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting periods: {str(e)}'
            })
        }

def handle_payroll_demographic(event, context, cors_headers):
    """
    Endpoint: /api/payroll/demographic
    Devuelve información demográfica paginada de empleados.
    """
    try:
        # Extraer parámetros de query
        params = parse_query_params(event)
        
        # Parámetros de paginación
        page = int(params.get('page', 1))
        limit = int(params.get('limit', 20))
        offset = (page - 1) * limit
        
        # Filtros
        curp = params.get('curp', '').strip()
        nombre = params.get('nombre', '').strip() 
        periodo = params.get('periodo', '').strip()
        
        if not PSYCOPG2_AVAILABLE:
            # Generar datos simulados
            import random
            from datetime import datetime, timedelta
            
            # Lista de nombres ficticios
            nombres = ['Ana García', 'Carlos López', 'María Rodríguez', 'José Martínez', 'Fernanda Pérez']
            curps_base = ['GAAN801201HDG', 'LOPC850315MDF', 'ROMA791205MDF', 'MAJJ880612HDF', 'PEFM920925MDF']
            
            # Generar registros simulados
            records = []
            total_sim = 147 if not curp and not nombre else 5
            
            for i in range(min(limit, total_sim)):
                idx = (offset + i) % len(nombres)
                record = {
                    'id': offset + i + 1,
                    'curp': curps_base[idx] + str(random.randint(100, 999)),
                    'nombre_completo': nombres[idx],
                    'mes': periodo if periodo else '2024-11',
                    'estado': 'A',
                    'centro_costo': f'CC{random.randint(1000, 9999)}',
                    'salario': round(random.uniform(15000, 85000), 2)
                }
                records.append(record)
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'data': records,
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': total_sim,
                        'totalPages': (total_sim + limit - 1) // limit
                    },
                    'simulation_mode': True
                })
            }
        
        # Construir query con filtros
        base_query = """
            SELECT id, curp, nombre_completo, mes, estado, centro_costo, salario
            FROM historico_nominas_gsau
            WHERE 1=1
        """
        
        count_query = "SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1"
        
        params_list = []
        param_index = 1
        
        # Agregar filtros
        if curp:
            base_query += f" AND UPPER(curp) LIKE UPPER($${param_index})" 
            count_query += f" AND UPPER(curp) LIKE UPPER($${param_index})"
            params_list.append(f'%{curp}%')
            param_index += 1
            
        if nombre:
            base_query += f" AND UPPER(nombre_completo) LIKE UPPER($${param_index})"
            count_query += f" AND UPPER(nombre_completo) LIKE UPPER($${param_index})"
            params_list.append(f'%{nombre}%')
            param_index += 1
            
        if periodo:
            base_query += f" AND mes = $${param_index}"
            count_query += f" AND mes = $${param_index}"
            params_list.append(periodo)
            param_index += 1
        
        # Agregar ordenamiento y paginación
        base_query += f" ORDER BY id LIMIT $${param_index} OFFSET $${param_index + 1}"
        params_list.extend([limit, offset])
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Obtener el total de registros
                cur.execute(count_query, params_list[:-2])  # Sin limit y offset para el count
                total = cur.fetchone()['total']
                
                # Obtener los registros paginados
                cur.execute(base_query, params_list)
                records = [dict(row) for row in cur.fetchall()]
        
        total_pages = (total + limit - 1) // limit
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': records,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': total_pages
                },
                'filters': {
                    'curp': curp,
                    'nombre': nombre,
                    'periodo': periodo
                },
                'simulation_mode': False
            }, default=str)
        }
        
    except Exception as e:
        print(f"Error en handle_payroll_demographic: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting demographic data: {str(e)}'
            })
        }

def handle_demographic_unique_count(event, context, cors_headers):
    """
    Endpoint: /api/payroll/demographic/unique-count
    Devuelve el conteo único de empleados (CURPs únicos).
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            # Valor simulado
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'uniqueCount': 1608,
                    'simulation_mode': True
                })
            }
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT COUNT(DISTINCT "CURP") as unique_count
                    FROM historico_nominas_gsau
                    WHERE "CURP" IS NOT NULL AND "CURP" != '';
                """)
                
                result = cur.fetchone()
                unique_count = result['unique_count']
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'uniqueCount': unique_count,
                'simulation_mode': False
            })
        }
        
    except Exception as e:
        print(f"Error en handle_demographic_unique_count: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting unique count: {str(e)}'
            })
        }

def handle_payroll_data(event, context, cors_headers):
    """
    Endpoint genérico: /api/payroll
    Devuelve datos generales de nómina con filtros opcionales.
    """
    try:
        # Extraer parámetros de query
        params = parse_query_params(event)
        
        # Parámetros de paginación
        page = int(params.get('page', 1))
        limit = min(int(params.get('limit', 50)), 1000)  # Máximo 1000 registros por página
        offset = (page - 1) * limit
        
        # Filtros opcionales
        periodo = params.get('periodo', '').strip()
        estado = params.get('estado', '').strip()
        centro_costo = params.get('centro_costo', '').strip()
        
        if not PSYCOPG2_AVAILABLE:
            # Generar datos simulados
            import random
            
            records = []
            total_sim = 500
            
            for i in range(min(limit, total_sim - offset)):
                record = {
                    'id': offset + i + 1,
                    'curp': f'SIMU{random.randint(800101, 991231)}HDG{random.randint(100, 999)}',
                    'nombre_completo': f'Empleado Simulado {offset + i + 1}',
                    'mes': periodo if periodo else f'2024-{random.randint(1, 12):02d}',
                    'estado': estado if estado else random.choice(['A', 'A', 'A', 'B']),  # 75% activos
                    'centro_costo': centro_costo if centro_costo else f'CC{random.randint(1000, 9999)}',
                    'salario': round(random.uniform(15000, 85000), 2),
                    'fecha_ingreso': f'20{random.randint(18, 24)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}'
                }
                records.append(record)
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'data': records,
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': total_sim,
                        'totalPages': (total_sim + limit - 1) // limit
                    },
                    'simulation_mode': True
                })
            }
        
        # Construir query con filtros
        base_query = """
            SELECT id, curp, nombre_completo, mes, estado, centro_costo, 
                   salario, fecha_ingreso, created_at
            FROM historico_nominas_gsau
            WHERE 1=1
        """
        
        count_query = "SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1"
        
        params_list = []
        param_index = 1
        
        # Agregar filtros
        if periodo:
            base_query += f" AND mes = $${param_index}"
            count_query += f" AND mes = $${param_index}"
            params_list.append(periodo)
            param_index += 1
            
        if estado:
            base_query += f" AND estado = $${param_index}"
            count_query += f" AND estado = $${param_index}"
            params_list.append(estado)
            param_index += 1
            
        if centro_costo:
            base_query += f" AND centro_costo = $${param_index}"
            count_query += f" AND centro_costo = $${param_index}"
            params_list.append(centro_costo)
            param_index += 1
        
        # Agregar ordenamiento y paginación
        base_query += f" ORDER BY created_at DESC, id DESC LIMIT $${param_index} OFFSET $${param_index + 1}"
        params_list.extend([limit, offset])
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Obtener el total de registros
                cur.execute(count_query, params_list[:-2])  # Sin limit y offset para el count
                total = cur.fetchone()['total']
                
                # Obtener los registros paginados
                cur.execute(base_query, params_list)
                records = [dict(row) for row in cur.fetchall()]
        
        total_pages = (total + limit - 1) // limit
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': records,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': total_pages
                },
                'filters': {
                    'periodo': periodo,
                    'estado': estado,
                    'centro_costo': centro_costo
                },
                'simulation_mode': False
            }, default=str)
        }
        
    except Exception as e:
        print(f"Error en handle_payroll_data: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting payroll data: {str(e)}'
            })
        }
