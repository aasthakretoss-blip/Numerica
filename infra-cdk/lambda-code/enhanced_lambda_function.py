import json
import os
import socket
import re
from urllib.parse import parse_qs

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
    Handler principal de Lambda para la aplicación React de nóminas.
    """
    
    # Headers CORS
    origin = event.get('headers', {}).get('origin', event.get('headers', {}).get('Origin', '*'))
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*').split(',')
    
    cors_origin = '*'
    if origin in allowed_origins:
        cors_origin = origin
    elif allowed_origins[0] != '*':
        cors_origin = allowed_origins[0]
    
    cors_headers = {
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
        'Content-Type': 'application/json'
    }
    
    try:
        # Extraer información de la solicitud - compatible con API Gateway v1 y v2
        http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'GET'))
        path = event.get('path', event.get('rawPath', ''))
        print(f"DEBUG: http_method={http_method}, path='{path}'")
        
        # Manejar preflight CORS
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'message': 'CORS preflight successful'})
            }
        
        # Router para endpoints de React
        if path.endswith('/api/payroll/stats'):
            return handle_payroll_stats(event, context, cors_headers)
        elif path.endswith('/api/payroll/filters') or path.endswith('/api/payroll/filter-options'):
            return handle_payroll_filters(event, context, cors_headers)
        elif path.endswith('/api/payroll/categorias-puestos'):
            return handle_categorias_puestos(event, context, cors_headers)
        elif path.endswith('/api/payroll/periodos'):
            return handle_payroll_periodos(event, context, cors_headers)
        elif path.endswith('/api/payroll/table-info'):
            return handle_table_info(event, context, cors_headers)
        elif '/api/payroll' in path and not any(path.endswith(x) for x in ['/stats', '/filters', '/categorias-puestos', '/periodos', '/table-info']):
            return handle_payroll_data(event, context, cors_headers)
        else:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Not Found',
                    'message': f'Path {path} not found',
                    'available_endpoints': [
                        '/api/payroll/stats',
                        '/api/payroll/filters',
                        '/api/payroll/categorias-puestos',
                        '/api/payroll/periodos',
                        '/api/payroll/table-info',
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

def parse_query_params(event):
    """
    Extrae parámetros de query de la solicitud API Gateway.
    """
    params = {}
    
    # API Gateway v1
    if 'queryStringParameters' in event and event['queryStringParameters']:
        params.update(event['queryStringParameters'])
    
    # API Gateway v2
    if 'rawQueryString' in event and event['rawQueryString']:
        parsed = parse_qs(event['rawQueryString'])
        for key, values in parsed.items():
            params[key] = values[0] if len(values) == 1 else values
    
    return params

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

def handle_payroll_stats(event, context, cors_headers):
    """
    Endpoint: /api/payroll/stats
    Devuelve estadísticas generales de la nómina.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            # Datos simulados
            stats = {
                'totalRecords': 500,
                'uniqueEmployees': 497,
                'uniquePeriods': 12,
                'averageRecordsPerEmployee': 1,
                'statusDistribution': [
                    {'status': 'A', 'statusName': 'Activo', 'count': 296, 'percentage': 59.2},
                    {'status': 'B', 'statusName': 'Baja', 'count': 204, 'percentage': 40.8}
                ]
            }
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'stats': stats,
                    'simulation_mode': True
                })
            }
        
        # Consultar datos reales
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Total de registros
                cur.execute("SELECT COUNT(*) as total FROM historico_nominas_gsau;")
                total_records = cur.fetchone()['total']
                
                # CURPs únicas
                cur.execute('SELECT COUNT(DISTINCT "CURP") as unique_employees FROM historico_nominas_gsau WHERE "CURP" IS NOT NULL;')
                unique_employees = cur.fetchone()['unique_employees']
                
                # Períodos únicos
                cur.execute('SELECT COUNT(DISTINCT "Mes") as unique_periods FROM historico_nominas_gsau WHERE "Mes" IS NOT NULL;')
                unique_periods = cur.fetchone()['unique_periods']
                
                # Último período cargado
                cur.execute('SELECT MAX(cveper) as latest_period FROM historico_nominas_gsau WHERE cveper IS NOT NULL;')
                latest_period_result = cur.fetchone()
                latest_period = str(latest_period_result['latest_period']) if latest_period_result and latest_period_result['latest_period'] else None
                
                # Total de registros en historico_fondos_gsau
                total_fondos_records = 0
                try:
                    cur.execute("SELECT COUNT(*) as total FROM historico_fondos_gsau;")
                    total_fondos_records = cur.fetchone()['total']
                except Exception as e:
                    print(f"⚠️ Tabla historico_fondos_gsau no encontrada: {str(e)}")
                    total_fondos_records = 0
                
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
                    'latestPeriod': latest_period,
                    'totalFondosRecords': total_fondos_records,
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
            })
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

def handle_payroll_filters(event, context, cors_headers):
    """
    Endpoint: /api/payroll/filters
    Devuelve opciones de filtros con conteos.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            # Datos simulados
            filter_data = {
                'sucursales': [
                    {'value': 'Oficina Central', 'count': 150},
                    {'value': 'Sucursal Norte', 'count': 120},
                    {'value': 'Sucursal Sur', 'count': 100}
                ],
                'puestos': [
                    {'value': 'Gerente', 'count': 25},
                    {'value': 'Analista', 'count': 80},
                    {'value': 'Asistente', 'count': 60},
                    {'value': 'Coordinador', 'count': 40}
                ],
                'estados': [
                    {'value': 'A', 'count': 320},
                    {'value': 'B', 'count': 50}
                ]
            }
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'data': filter_data,
                    'simulation_mode': True
                })
            }
        
        # Obtener parámetros de filtro activos
        params = parse_query_params(event)
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                base_where = "WHERE 1=1"
                filter_params = []
                
                # Aplicar filtros si existen
                if 'sucursal' in params:
                    base_where += " AND \"Sucursal\" = %s"
                    filter_params.append(params['sucursal'])
                if 'status' in params:
                    base_where += " AND \"Status\" = %s"
                    filter_params.append(params['status'])
                
                # Obtener sucursales disponibles
                cur.execute(f"""
                    SELECT "Sucursal" as value, COUNT(*) as count
                    FROM historico_nominas_gsau 
                    {base_where} AND "Sucursal" IS NOT NULL
                    GROUP BY "Sucursal"
                    ORDER BY count DESC;
                """, filter_params)
                sucursales = [dict(row) for row in cur.fetchall()]
                
                # Obtener puestos disponibles
                cur.execute(f"""
                    SELECT "Puesto" as value, COUNT(*) as count
                    FROM historico_nominas_gsau 
                    {base_where} AND "Puesto" IS NOT NULL
                    GROUP BY "Puesto"
                    ORDER BY count DESC;
                """, filter_params)
                puestos = [dict(row) for row in cur.fetchall()]
                
                # Obtener estados disponibles
                cur.execute(f"""
                    SELECT "Status" as value, COUNT(*) as count
                    FROM historico_nominas_gsau 
                    {base_where} AND "Status" IS NOT NULL
                    GROUP BY "Status"
                    ORDER BY count DESC;
                """, filter_params)
                estados = [dict(row) for row in cur.fetchall()]
                
                filter_data = {
                    'sucursales': sucursales,
                    'puestos': puestos,
                    'estados': estados
                }
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': filter_data,
                'simulation_mode': False
            })
        }
        
    except Exception as e:
        print(f"Error en handle_payroll_filters: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting filter options: {str(e)}'
            })
        }

def handle_categorias_puestos(event, context, cors_headers):
    """
    Endpoint: /api/payroll/categorias-puestos
    Devuelve categorías de puestos.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            # Datos simulados
            categorias = [
                {'value': 'Administrativo', 'count': 120},
                {'value': 'Operativo', 'count': 150},
                {'value': 'Gerencial', 'count': 45},
                {'value': 'Técnico', 'count': 85}
            ]
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'data': categorias,
                    'simulation_mode': True
                })
            }
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Asumir que tenemos una columna categoria_puesto o mapear desde puestos
                cur.execute("""
                    SELECT 
                        CASE 
                            WHEN "Puesto" ILIKE '%gerente%' OR "Puesto" ILIKE '%director%' THEN 'Gerencial'
                            WHEN "Puesto" ILIKE '%analista%' OR "Puesto" ILIKE '%coordinador%' THEN 'Administrativo'
                            WHEN "Puesto" ILIKE '%técnico%' OR "Puesto" ILIKE '%especialista%' THEN 'Técnico'
                            ELSE 'Operativo'
                        END as value,
                        COUNT(*) as count
                    FROM historico_nominas_gsau 
                    WHERE "Puesto" IS NOT NULL
                    GROUP BY value
                    ORDER BY count DESC;
                """)
                
                categorias = [dict(row) for row in cur.fetchall()]
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': categorias,
                'simulation_mode': False
            })
        }
        
    except Exception as e:
        print(f"Error en handle_categorias_puestos: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting job categories: {str(e)}'
            })
        }

def handle_payroll_periodos(event, context, cors_headers):
    """
    Endpoint: /api/payroll/periodos
    Devuelve los períodos disponibles.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            # Datos simulados
            periodos = [
                {'value': '2024-11', 'count': 500},
                {'value': '2024-10', 'count': 495},
                {'value': '2024-09', 'count': 488}
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
                cur.execute("""
                    SELECT 
                        TO_CHAR(DATE_TRUNC('month', cveper), 'YYYY-MM') as value,
                        COUNT(*) as count,
                        COUNT(DISTINCT "CURP") as employee_count,
                        MIN(cveper) as period_start,
                        MAX(cveper) as period_end
                    FROM historico_nominas_gsau
                    WHERE cveper IS NOT NULL
                    GROUP BY DATE_TRUNC('month', cveper)
                    ORDER BY DATE_TRUNC('month', cveper) DESC
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

def handle_table_info(event, context, cors_headers):
    """
    Endpoint: /api/payroll/table-info
    Devuelve información sobre la estructura de la tabla.
    """
    try:
        if not PSYCOPG2_AVAILABLE:
            return {
                'statusCode': 503,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'Database operations not available - psycopg2 not installed',
                    'simulation_mode': True
                })
            }
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Obtener información de columnas
                cur.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'historico_nominas_gsau'
                    ORDER BY ordinal_position;
                """)
                columns = [dict(row) for row in cur.fetchall()]
                
                # Obtener una muestra de datos
                cur.execute("SELECT * FROM historico_nominas_gsau LIMIT 3;")
                sample_data = [dict(row) for row in cur.fetchall()]
                
                # Contar registros
                cur.execute("SELECT COUNT(*) as count FROM historico_nominas_gsau;")
                total_count = cur.fetchone()['count']
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'table_name': 'historico_nominas_gsau',
                'columns': columns,
                'sample_data': sample_data,
                'total_count': total_count,
                'simulation_mode': False
            }, default=str)
        }
        
    except Exception as e:
        print(f"Error en handle_table_info: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': f'Error getting table info: {str(e)}'
            })
        }

def handle_payroll_data(event, context, cors_headers):
    """
    Endpoint: /api/payroll
    Devuelve datos de empleados con paginación y filtros.
    """
    try:
        # Extraer parámetros de query
        params = parse_query_params(event)
        
        # Parámetros de paginación
        page = int(params.get('page', 1))
        page_size = min(int(params.get('pageSize', params.get('limit', 100))), 1000)
        offset = (page - 1) * page_size
        
        # Filtros
        sort_by = params.get('sortBy', 'id')
        sort_dir = params.get('sortDir', 'asc').upper()
        if sort_dir not in ['ASC', 'DESC']:
            sort_dir = 'ASC'
        
        if not PSYCOPG2_AVAILABLE:
            # Generar datos simulados
            import random
            
            total_sim = 500
            records = []
            
            for i in range(min(page_size, total_sim - offset)):
                record = {
                    'id': offset + i + 1,
                    'nombre': f'Empleado {offset + i + 1}',
                    'rfc': f'RFC{(offset + i):04d}',
                    'mes': f'2024-{random.randint(1, 12):02d}',
                    'estado': random.choice(['A', 'A', 'A', 'B']),  # 75% activos
                    'sucursal': random.choice(['Oficina Central', 'Sucursal Norte', 'Sucursal Sur']),
                    'puesto': random.choice(['Gerente', 'Analista', 'Asistente', 'Coordinador']),
                    'sueldo': round(random.uniform(15000, 85000), 2),
                    'comisiones': round(random.uniform(1000, 5000), 2),
                    'totalPercepciones': round(random.uniform(16000, 90000), 2)
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
                        'pageSize': page_size,
                        'total': total_sim,
                        'totalPages': (total_sim + page_size - 1) // page_size
                    },
                    'simulation_mode': True
                })
            }
        
        # Construir query con filtros
        base_query = """
            SELECT "CURP" as id, "Nombre completo" as nombre, "RFC" as rfc, "Mes" as mes,
                   "Status" as estado, "Sucursal" as sucursal, "Puesto" as puesto,
                   " SUELDO " as sueldo, " COMISIONES CLIENTE " as comisiones, 
                   " TOTAL DE PERCEPCIONES " as totalPercepciones
            FROM historico_nominas_gsau
            WHERE 1=1
        """
        
        count_query = "SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1"
        
        params_list = []
        param_index = 1
        
        # Agregar filtros
        for filter_key in ['sucursal', 'puesto', 'estado']:
            if filter_key in params:
                column_name = {
                    'sucursal': '"Sucursal"',
                    'puesto': '"Puesto"', 
                    'estado': '"Status"'
                }[filter_key]
                
                base_query += f" AND {column_name} = %s"
                count_query += f" AND {column_name} = %s"
                params_list.append(params[filter_key])
                param_index += 1
        
        # Mapear nombres de columnas para ordenamiento
        sort_column_map = {
            'nombre': '"Nombre completo"',
            'id': '"CURP"',
            'mes': '"Mes"',
            'estado': '"Status"',
            'sueldo': '" SUELDO "'
        }
        
        sort_column = sort_column_map.get(sort_by, '"CURP"')
        
        # Agregar ordenamiento y paginación
        base_query += f" ORDER BY {sort_column} {sort_dir} LIMIT %s OFFSET %s"
        params_list.extend([page_size, offset])
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Obtener el total de registros
                cur.execute(count_query, params_list[:-2])  # Sin limit y offset para el count
                total = cur.fetchone()['total']
                
                # Obtener los registros paginados
                cur.execute(base_query, params_list)
                records = [dict(row) for row in cur.fetchall()]
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': records,
                'pagination': {
                    'page': page,
                    'pageSize': page_size,
                    'total': total,
                    'totalPages': total_pages
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
