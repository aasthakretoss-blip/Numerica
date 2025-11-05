#!/usr/bin/env python3
"""
Script específico para mapear los campos del dashboard perfil empleado
que aparecen en $0.00 y generar las consultas exactas
"""

import psycopg2
import json

def connect_historic():
    """Conectar a Historic (base correcta con datos reales)"""
    try:
        connection = psycopg2.connect(
            host="dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="Historic",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        return connection
    except Exception as e:
        print(f"❌ Error conectando a Historic: {e}")
        return None

def get_dashboard_fields_mapping():
    """Mapear específicamente los campos que aparecen en el dashboard"""
    
    # Campos exactos que aparecen en tu captura del dashboard
    dashboard_fields = [
        "VALES DESPENSA NETO",
        "VALES DESPENSA PENSIÓN ALIMENTICIA", 
        "BONO",
        "DÍA FESTIVO TRABAJADO",
        "SUELDO X DÍAS ACUMULADOS VACACIONES",
        "PRIMA VACACIONAL",
        "AGUINALDO",
        "GRATIFICACIÓN",
        "COMPENSACIÓN", 
        "PRIMA DOMINICAL",
        "PRIMA DE ANTIGÜEDAD",
        "PAGO POR SEPARACIÓN",
        "VACACIONES PENDIENTES",
        "VACACIONES FINIQUITO",
        "SUBSIDIO POR INCAPACIDAD",
        "SUBSIDIO AL EMPLEO",
        "HORAS EXTRA DOBLE",
        "HORAS EXTRA DOBLE3",
        "HORAS EXTRA TRIPLE",
        "SÉPTIMO DÍA"
    ]
    
    # Mapeo exacto de dashboard -> base de datos
    field_mapping = {
        "VALES DESPENSA NETO": " VALES DESPENSA NETO ",
        "VALES DESPENSA PENSIÓN ALIMENTICIA": " VALES DESPENSA PENSION ALIMENT ",
        "BONO": " BONO ",
        "DÍA FESTIVO TRABAJADO": " DIA FESTIVO TRABAJADO ",
        "SUELDO X DÍAS ACUMULADOS VACACIONES": " SUELDO X DIAS AC VACACIONES ",
        "PRIMA VACACIONAL": " PRIMA VACACIONAL ",
        "AGUINALDO": " AGUINALDO ",
        "GRATIFICACIÓN": " GRATIFICACION ",
        "COMPENSACIÓN": " COMPENSACION ",
        "PRIMA DOMINICAL": " PRIMA DOMINICAL ",
        "PRIMA DE ANTIGÜEDAD": " PRIMA DE ANTIGÜEDAD ",
        "PAGO POR SEPARACIÓN": " PAGO POR SEPARACION ",
        "VACACIONES PENDIENTES": " VACACIONES PENDIENTES ",
        "VACACIONES FINIQUITO": " VACACIONES FINIQUITO ",
        "SUBSIDIO POR INCAPACIDAD": " SUBSIDIO POR INCAPACIDAD ",
        "SUBSIDIO AL EMPLEO": " SUBSIDIO AL EMPLEO ",
        "HORAS EXTRA DOBLE": " HORAS EXTRA DOBLE ",
        "HORAS EXTRA DOBLE3": " HORAS EXTRA DOBLE3 ",
        "HORAS EXTRA TRIPLE": " HORAS EXTRA TRIPLE ",
        "SÉPTIMO DÍA": " SEPTIMO DIA "
    }
    
    return field_mapping

def analyze_dashboard_fields():
    """Analizar cada campo específico del dashboard"""
    conn = connect_historic()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        
        print("🎯 ANÁLISIS ESPECÍFICO CAMPOS DEL DASHBOARD")
        print("=" * 60)
        
        field_mapping = get_dashboard_fields_mapping()
        results = {}
        
        for dashboard_field, db_field in field_mapping.items():
            print(f"\n📊 Analizando: {dashboard_field}")
            print(f"    Campo DB: '{db_field}'")
            
            try:
                # Verificar si el campo existe
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'historico_nominas_gsau' 
                    AND column_name = '{db_field}'
                """)
                
                field_exists = cursor.fetchone()
                
                if not field_exists:
                    print(f"    ❌ CAMPO NO EXISTE")
                    results[dashboard_field] = {
                        'exists': False,
                        'db_field': db_field,
                        'error': 'Campo no encontrado'
                    }
                    continue
                
                # Contar registros totales
                cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau')
                total_records = cursor.fetchone()[0]
                
                # Contar registros no nulos
                cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{db_field}" IS NOT NULL')
                not_null_count = cursor.fetchone()[0]
                
                # Contar registros con valor > 0
                cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{db_field}" > 0')
                positive_count = cursor.fetchone()[0]
                
                # Obtener estadísticas si hay datos
                if positive_count > 0:
                    cursor.execute(f"""
                        SELECT 
                            MIN("{db_field}") as min_val,
                            MAX("{db_field}") as max_val,
                            AVG("{db_field}") as avg_val
                        FROM historico_nominas_gsau 
                        WHERE "{db_field}" > 0
                    """)
                    stats = cursor.fetchone()
                    
                    # Obtener muestra de datos
                    cursor.execute(f'SELECT "{db_field}" FROM historico_nominas_gsau WHERE "{db_field}" > 0 LIMIT 5')
                    samples = cursor.fetchall()
                    sample_values = [float(r[0]) for r in samples]
                    
                    print(f"    ✅ DATOS ENCONTRADOS:")
                    print(f"       📊 Registros con datos: {positive_count:,}")
                    print(f"       💰 Rango: ${stats[0]:,.2f} - ${stats[1]:,.2f}")
                    print(f"       📈 Promedio: ${stats[2]:,.2f}")
                    print(f"       🎯 Muestra: {[f'${v:,.2f}' for v in sample_values]}")
                    
                    results[dashboard_field] = {
                        'exists': True,
                        'db_field': db_field,
                        'has_data': True,
                        'positive_count': positive_count,
                        'min_value': float(stats[0]),
                        'max_value': float(stats[1]),
                        'avg_value': float(stats[2]),
                        'sample_values': sample_values
                    }
                else:
                    print(f"    ⚠️  CAMPO EXISTE PERO SIN DATOS")
                    results[dashboard_field] = {
                        'exists': True,
                        'db_field': db_field,
                        'has_data': False,
                        'positive_count': 0
                    }
                
            except Exception as e:
                print(f"    ❌ ERROR: {e}")
                results[dashboard_field] = {
                    'exists': False,
                    'db_field': db_field,
                    'error': str(e)
                }
        
        return results
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        return {}
    finally:
        conn.close()

def generate_employee_specific_queries(results, test_rfc="ROJR9005202R6"):
    """Generar queries específicas para un empleado de prueba"""
    print(f"\n🔧 GENERANDO QUERIES PARA EMPLEADO ESPECÍFICO")
    print("=" * 50)
    print(f"📋 Empleado de prueba: {test_rfc}")
    
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Verificar que el empleado existe
        cursor.execute('SELECT "Nombre completo", "Mes" FROM historico_nominas_gsau WHERE "RFC" = %s LIMIT 3', [test_rfc])
        employee_records = cursor.fetchall()
        
        if not employee_records:
            print(f"❌ Empleado {test_rfc} no encontrado")
            return
        
        print(f"✅ Empleado encontrado: {employee_records[0][0]}")
        print(f"📅 Períodos disponibles: {[r[1] for r in employee_records]}")
        
        # Generar query específica para los campos del dashboard
        dashboard_fields_with_data = []
        for field_name, field_info in results.items():
            if field_info.get('has_data', False):
                db_field = field_info['db_field']
                dashboard_fields_with_data.append(f'"{db_field}" as "{field_name}"')
        
        if dashboard_fields_with_data:
            query = f"""
-- QUERY ESPECÍFICA PARA CAMPOS DEL DASHBOARD
SELECT 
    "RFC" as rfc,
    "Nombre completo" as nombreCompleto,
    "Mes" as mes,
    {(',    ' + chr(10)).join(dashboard_fields_with_data)}
FROM historico_nominas_gsau
WHERE "RFC" = '{test_rfc}'
    AND "Mes" = 'JULIO'  -- Usar mes específico
ORDER BY "Mes";
"""
            
            print(f"\n📝 QUERY GENERADA:")
            print(query)
            
            # Probar la query
            print(f"\n🧪 PROBANDO QUERY:")
            cursor.execute(query.replace("'JULIO'", "%s"), ['JULIO'])
            test_results = cursor.fetchall()
            
            if test_results:
                col_names = [desc[0] for desc in cursor.description]
                record = test_results[0]
                
                print(f"✅ Query exitosa - {len(test_results)} registros")
                print(f"\n📊 RESULTADOS PARA {test_rfc}:")
                
                for i, col_name in enumerate(col_names):
                    value = record[i]
                    if isinstance(value, (int, float)) and value > 0:
                        print(f"  💰 {col_name}: ${value:,.2f}")
                    elif col_name in ['rfc', 'nombreCompleto', 'mes']:
                        print(f"  📋 {col_name}: {value}")
            else:
                print(f"❌ No hay resultados para {test_rfc}")
        
    except Exception as e:
        print(f"❌ Error generando queries: {e}")
    finally:
        conn.close()

def create_dashboard_api_response(results):
    """Crear estructura de respuesta para la API del dashboard"""
    print(f"\n📦 CREANDO ESTRUCTURA PARA API")
    print("=" * 40)
    
    api_response = {}
    
    for dashboard_field, field_info in results.items():
        field_key = dashboard_field.lower().replace(' ', '_').replace('ñ', 'n').replace('í', 'i').replace('ó', 'o')
        
        if field_info.get('has_data', False):
            api_response[field_key] = {
                'database_field': field_info['db_field'],
                'has_data': True,
                'sample_query': f'SELECT "{field_info["db_field"]}" FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes',
                'data_available': True
            }
            print(f"✅ {field_key:<35} -> '{field_info['db_field']}'")
        else:
            api_response[field_key] = {
                'database_field': field_info.get('db_field', 'N/A'),
                'has_data': False,
                'data_available': False
            }
            print(f"❌ {field_key:<35} -> Sin datos")
    
    return api_response

def save_dashboard_mapping(results, api_response):
    """Guardar el mapeo del dashboard en archivos"""
    
    # Guardar análisis completo
    analysis_file = "C:\\Users\\alber\\Autonumerica\\Numerica\\DASHBOARD_FIELDS_ANALYSIS.json"
    with open(analysis_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)
    
    # Guardar mapeo para API
    api_file = "C:\\Users\\alber\\Autonumerica\\Numerica\\DASHBOARD_API_MAPPING.json"
    with open(api_file, 'w', encoding='utf-8') as f:
        json.dump(api_response, f, indent=2, ensure_ascii=False)
    
    # Crear archivo SQL con queries específicas
    sql_file = "C:\\Users\\alber\\Autonumerica\\Numerica\\DASHBOARD_QUERIES.sql"
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- QUERIES ESPECÍFICAS PARA DASHBOARD PERFIL EMPLEADO\n")
        f.write("-- Base: Historic.historico_nominas_gsau\n\n")
        
        # Query para obtener todos los campos del dashboard
        available_fields = [f'"{info["db_field"]}" as {field.lower().replace(" ", "_")}' 
                          for field, info in results.items() if info.get('has_data', False)]
        
        if available_fields:
            f.write("-- QUERY COMPLETA PARA DASHBOARD\n")
            f.write("SELECT \n")
            f.write("    \"RFC\" as rfc,\n")
            f.write("    \"Nombre completo\" as nombre_completo,\n")
            f.write("    \"Mes\" as mes,\n")
            f.write("    " + ",\n    ".join(available_fields))
            f.write("\nFROM historico_nominas_gsau\n")
            f.write("WHERE \"RFC\" = :rfc AND \"Mes\" = :mes;\n\n")
        
        # Queries individuales
        for field, info in results.items():
            if info.get('has_data', False):
                f.write(f"-- {field}\n")
                f.write(f'SELECT "{info["db_field"]}" FROM historico_nominas_gsau ')
                f.write('WHERE "RFC" = :rfc AND "Mes" = :mes;\n\n')
    
    print(f"\n✅ Archivos guardados:")
    print(f"  📊 Análisis: {analysis_file}")
    print(f"  🔧 API Mapping: {api_file}")
    print(f"  📝 Queries SQL: {sql_file}")

def main():
    print("🎯 MAPEO ESPECÍFICO CAMPOS DASHBOARD PERFIL EMPLEADO")
    print("=" * 65)
    print("💡 Analizando campos que aparecen en $0.00 en el dashboard")
    
    # 1. Analizar campos específicos del dashboard
    results = analyze_dashboard_fields()
    
    if not results:
        print("❌ No se pudo completar el análisis")
        return
    
    # 2. Generar queries específicas
    generate_employee_specific_queries(results)
    
    # 3. Crear estructura para API
    api_response = create_dashboard_api_response(results)
    
    # 4. Guardar archivos
    save_dashboard_mapping(results, api_response)
    
    # 5. Resumen final
    fields_with_data = sum(1 for info in results.values() if info.get('has_data', False))
    fields_without_data = len(results) - fields_with_data
    
    print(f"\n🎉 ANÁLISIS COMPLETADO")
    print("=" * 30)
    print(f"📊 Total campos analizados: {len(results)}")
    print(f"✅ Campos con datos: {fields_with_data}")
    print(f"❌ Campos sin datos: {fields_without_data}")
    
    if fields_with_data > 0:
        print(f"\n💡 SOLUCIÓN:")
        print("  - Usar las queries generadas en DASHBOARD_QUERIES.sql")
        print("  - Implementar el mapeo de DASHBOARD_API_MAPPING.json")
        print("  - Los valores ya no aparecerán en $0.00")
    else:
        print(f"\n⚠️  INVESTIGACIÓN ADICIONAL NECESARIA")

if __name__ == "__main__":
    main()
