#!/usr/bin/env python3
"""
Script para generar SQL completo con todos los campos disponibles
"""

import psycopg2

def connect_gsaudb():
    """Conectar a GSAUDB"""
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="GSAUDB",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        return connection
    except Exception as e:
        print(f"❌ Error conectando a GSAUDB: {e}")
        return None

def get_all_columns_detailed():
    """Obtener información detallada de todas las columnas"""
    conn = connect_gsaudb()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                column_name, 
                data_type,
                character_maximum_length,
                is_nullable,
                ordinal_position
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        return columns
        
    except Exception as e:
        print(f"❌ Error obteniendo columnas: {e}")
        return []
    finally:
        conn.close()

def test_column_data(column_name, data_type):
    """Probar si una columna tiene datos y mostrar muestra"""
    conn = connect_gsaudb()
    if not conn:
        return False, []
    
    try:
        cursor = conn.cursor()
        
        # Contar registros no nulos
        count_query = f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{column_name}" IS NOT NULL'
        cursor.execute(count_query)
        count = cursor.fetchone()[0]
        
        if count == 0:
            return False, []
        
        # Obtener muestra de datos
        sample_query = f'SELECT DISTINCT "{column_name}" FROM historico_nominas_gsau WHERE "{column_name}" IS NOT NULL LIMIT 5'
        cursor.execute(sample_query)
        sample_data = cursor.fetchall()
        
        return True, [row[0] for row in sample_data]
        
    except Exception as e:
        print(f"❌ Error probando '{column_name}': {e}")
        return False, []
    finally:
        conn.close()

def create_field_mapping():
    """Crear mapeo completo basado en campos reales"""
    print("🔍 ANÁLISIS COMPLETO DE CAMPOS DISPONIBLES")
    print("=" * 70)
    
    columns = get_all_columns_detailed()
    if not columns:
        print("❌ No se pudieron obtener las columnas")
        return {}
    
    print(f"📋 Analizando {len(columns)} columnas...")
    
    # Mapeo completo con campos postgres -> gsaudb
    field_mapping = {}
    available_fields = {}
    empty_fields = {}
    
    for col_name, data_type, max_length, nullable, position in columns:
        print(f"\n🔍 Analizando: '{col_name}' ({data_type})")
        
        # Probar si tiene datos
        has_data, sample = test_column_data(col_name, data_type)
        
        if has_data:
            available_fields[col_name] = {
                'data_type': data_type,
                'sample': sample,
                'position': position,
                'max_length': max_length,
                'nullable': nullable
            }
            print(f"  ✅ DISPONIBLE - {len(sample)} valores únicos")
            if sample:
                print(f"  📊 Muestra: {sample[:3]}")
        else:
            empty_fields[col_name] = {
                'data_type': data_type,
                'position': position
            }
            print(f"  ⚠️  SIN DATOS - Columna vacía")
    
    return available_fields, empty_fields

def generate_postgres_mapping(available_fields):
    """Generar mapeo específico para compatibilidad con postgres"""
    print("\n📋 MAPEO POSTGRES -> GSAUDB")
    print("=" * 50)
    
    # Mapeo conocido de postgres a gsaudb
    postgres_to_gsaudb = {
        # Campos básicos
        'rfc': 'RFC',
        'mes': 'Mes', 
        'nombreCompleto': 'Nombre completo',
        'empresa': 'Compañía',
        'puesto': 'Puesto',
        'curp': 'CURP',
        'status': 'Status',
        
        # Campos con espacios especiales
        'sd': ' SD ',
        'sdi': ' SDI ',
        'sueldoCliente': ' SUELDO CLIENTE ',
        'comisionesCliente': ' COMISIONES CLIENTE ',
        'totalPercepciones': ' TOTAL DE PERCEPCIONES ',
        'totalDeducciones': ' TOTAL DEDUCCIONES ',
        'netoAntesVales': ' NETO ANTES DE VALES ',
        'netoDespuesVales': ' NETO A PAGAR ',
        'ptu': 'PTU',
        
        # Campos adicionales
        'fechaAntiguedad': 'Fecha antigüedad',
        'fechaBaja': 'Fecha baja',
        'periodicidad': 'Periodicidad',
        'claveTrabajador': 'Clave trabajador',
        
        # Campos que podrían existir como equivalentes
        'cargaSocial': ' COSTO DE NOMINA ',  # Posible equivalente
        'sueldo': ' SUELDO ',  # Campo directo
        'costoNomina': ' COSTO DE NOMINA ',  # Campo directo
        'totalFacturar': ' TOTAL A FACTURAR ',  # Campo directo
    }
    
    valid_mapping = {}
    missing_fields = []
    
    for postgres_field, gsaudb_field in postgres_to_gsaudb.items():
        if gsaudb_field in available_fields:
            valid_mapping[postgres_field] = gsaudb_field
            print(f"✅ {postgres_field:<20} -> '{gsaudb_field}'")
        else:
            missing_fields.append((postgres_field, gsaudb_field))
            print(f"❌ {postgres_field:<20} -> '{gsaudb_field}' (NO EXISTE)")
    
    return valid_mapping, missing_fields

def generate_complete_sql():
    """Generar SQL completo con todos los campos disponibles"""
    available_fields, empty_fields = create_field_mapping()
    valid_mapping, missing_fields = generate_postgres_mapping(available_fields)
    
    print(f"\n🚀 GENERANDO SQL COMPLETO")
    print("=" * 50)
    
    # Construir SELECT con todos los campos válidos
    select_fields = []
    for postgres_field, gsaudb_field in valid_mapping.items():
        select_fields.append(f'"{gsaudb_field}" as {postgres_field}')
    
    # Agregar campos adicionales disponibles
    additional_fields = []
    for gsaudb_field in available_fields:
        if gsaudb_field not in valid_mapping.values():
            # Crear nombre de campo limpio
            clean_name = gsaudb_field.strip().lower().replace(' ', '_')
            additional_fields.append(f'"{gsaudb_field}" as {clean_name}')
    
    complete_sql = f"""
-- SQL COMPLETO PARA historico_nominas_gsau
-- Generado automáticamente con todos los campos disponibles

SELECT 
    -- Campos mapeados de postgres
    {(',    ' + chr(10)).join(select_fields)}
    
    -- Campos adicionales disponibles
    {(',    ' + chr(10)).join(additional_fields) if additional_fields else '-- (Sin campos adicionales)'}
    
FROM historico_nominas_gsau
WHERE "RFC" IS NOT NULL
    AND "Mes" IS NOT NULL
ORDER BY "Mes", "RFC"
LIMIT 10;
"""
    
    print("📝 SQL Generado:")
    print(complete_sql)
    
    # Guardar SQL en archivo
    sql_file = "C:\\Users\\alber\\Autonumerica\\Numerica\\query_completa_gsaudb.sql"
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(complete_sql)
    
    print(f"✅ SQL guardado en: {sql_file}")
    
    return complete_sql, valid_mapping, missing_fields

def test_generated_sql(sql_query):
    """Probar el SQL generado"""
    print(f"\n🧪 PROBANDO SQL GENERADO")
    print("=" * 30)
    
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        cursor.execute(sql_query)
        results = cursor.fetchall()
        
        # Obtener nombres de columnas
        col_names = [desc[0] for desc in cursor.description]
        
        print(f"✅ Query ejecutada exitosamente")
        print(f"📊 {len(results)} registros obtenidos")
        print(f"📋 {len(col_names)} columnas seleccionadas")
        
        if results:
            print(f"\n📋 COLUMNAS DISPONIBLES:")
            for i, col_name in enumerate(col_names, 1):
                print(f"{i:2d}. {col_name}")
            
            print(f"\n📊 MUESTRA DE DATOS (primer registro):")
            for i, value in enumerate(results[0]):
                print(f"  {col_names[i]}: {value}")
        
    except Exception as e:
        print(f"❌ Error ejecutando SQL: {e}")
    finally:
        conn.close()

def main():
    print("🔧 GENERADOR DE SQL COMPLETO PARA GSAUDB")
    print("=" * 60)
    
    try:
        # Generar mapeo y SQL
        sql_query, valid_mapping, missing_fields = generate_complete_sql()
        
        # Probar SQL
        test_generated_sql(sql_query)
        
        # Resumen final
        print(f"\n🎯 RESUMEN FINAL")
        print("=" * 30)
        print(f"✅ Campos disponibles mapeados: {len(valid_mapping)}")
        print(f"❌ Campos faltantes: {len(missing_fields)}")
        
        if missing_fields:
            print(f"\n❌ CAMPOS FALTANTES:")
            for postgres_field, gsaudb_field in missing_fields:
                print(f"  - {postgres_field} (buscaba: '{gsaudb_field}')")
        
        print(f"\n💡 RECOMENDACIÓN:")
        print("  - Usar el SQL generado para consultas completas")
        print("  - Considerar postgres para campos faltantes")
        print("  - El campo ' COSTO DE NOMINA ' puede usarse como cargaSocial")
        
    except Exception as e:
        print(f"❌ Error general: {e}")

if __name__ == "__main__":
    main()
