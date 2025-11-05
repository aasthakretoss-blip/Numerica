#!/usr/bin/env python3
"""
Script para verificar estructura completa de GSAUDB y buscar datos en tablas relacionadas
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

def get_all_tables_with_counts():
    """Obtener todas las tablas con conteo de registros"""
    conn = connect_gsaudb()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        table_info = []
        
        for table in tables:
            table_name = table[0]
            try:
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                count = cursor.fetchone()[0]
                table_info.append((table_name, count))
            except Exception as e:
                table_info.append((table_name, f"Error: {e}"))
        
        return table_info
        
    except Exception as e:
        print(f"❌ Error obteniendo tablas: {e}")
        return []
    finally:
        conn.close()

def analyze_related_tables():
    """Analizar tablas que podrían tener percepciones/deducciones detalladas"""
    print("🔍 ANÁLISIS COMPLETO DE TODAS LAS TABLAS")
    print("=" * 60)
    
    tables_info = get_all_tables_with_counts()
    
    if not tables_info:
        print("❌ No se pudieron obtener las tablas")
        return
    
    print("📋 TODAS LAS TABLAS EN GSAUDB:")
    for table_name, count in tables_info:
        print(f"  📄 {table_name}: {count} registros")
    
    # Buscar tablas relacionadas con percepciones/deducciones
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n🔍 ANÁLISIS DETALLADO DE TABLAS RELEVANTES:")
        
        for table_name, count in tables_info:
            if isinstance(count, int) and count > 0:
                print(f"\n📋 TABLA: {table_name} ({count} registros)")
                
                # Obtener estructura de la tabla
                cursor.execute(f"""
                    SELECT column_name, data_type
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}'
                    ORDER BY ordinal_position
                    LIMIT 20;
                """)
                
                columns = cursor.fetchall()
                print(f"  📝 Columnas ({len(columns)} total):")
                for col_name, data_type in columns[:10]:  # Mostrar solo primeras 10
                    print(f"    • {col_name} ({data_type})")
                
                if len(columns) > 10:
                    print(f"    ... y {len(columns) - 10} columnas más")
                
                # Si es una tabla pequeña, mostrar muestra de datos
                if count <= 10 and table_name != 'historico_nominas_gsau':
                    try:
                        cursor.execute(f'SELECT * FROM "{table_name}" LIMIT 3')
                        sample_data = cursor.fetchall()
                        
                        if sample_data:
                            print(f"  📊 Muestra de datos:")
                            col_names = [desc[0] for desc in cursor.description]
                            
                            for i, row in enumerate(sample_data):
                                print(f"    Registro {i+1}:")
                                for j, value in enumerate(row[:5]):  # Solo primeros 5 campos
                                    print(f"      {col_names[j]}: {value}")
                                if len(row) > 5:
                                    print(f"      ... y {len(row) - 5} campos más")
                    
                    except Exception as e:
                        print(f"  ⚠️ Error obteniendo muestra: {e}")
    
    except Exception as e:
        print(f"❌ Error en análisis: {e}")
    finally:
        conn.close()

def check_postgres_vs_gsaudb_data():
    """Comparar datos específicos entre postgres y GSAUDB"""
    print(f"\n🔄 COMPARACIÓN postgres vs GSAUDB")
    print("=" * 50)
    
    # Conectar a postgres para comparar
    try:
        postgres_conn = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="postgres",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        
        gsaudb_conn = connect_gsaudb()
        
        if not gsaudb_conn:
            postgres_conn.close()
            return
        
        pg_cursor = postgres_conn.cursor()
        gsau_cursor = gsaudb_conn.cursor()
        
        print("📊 COMPARACIÓN DE DATOS ESPECÍFICOS:")
        
        # Buscar un RFC específico en ambas bases
        test_rfc = "AAGB941018V46"  # RFC que sabemos que existe
        
        print(f"\n🎯 BUSCANDO RFC: {test_rfc}")
        
        # En postgres
        pg_cursor.execute("""
            SELECT rfc, mes, sd, sdi, sueldoCliente, totalDeducciones, netoAntesVales, netoDespuesVales
            FROM payroll_data 
            WHERE rfc = %s 
            LIMIT 1
        """, [test_rfc])
        
        pg_data = pg_cursor.fetchone()
        
        # En GSAUDB
        gsau_cursor.execute('''
            SELECT "RFC", "Mes", " SD ", " SDI ", " SUELDO CLIENTE ", " TOTAL DEDUCCIONES ", " NETO ANTES DE VALES ", " NETO A PAGAR "
            FROM historico_nominas_gsau 
            WHERE "RFC" = %s 
            LIMIT 1
        ''', [test_rfc])
        
        gsau_data = gsau_cursor.fetchone()
        
        print(f"\n📋 DATOS EN POSTGRES:")
        if pg_data:
            fields = ['RFC', 'Mes', 'SD', 'SDI', 'Sueldo Cliente', 'Total Deducciones', 'Neto Antes Vales', 'Neto Después Vales']
            for i, field in enumerate(fields):
                print(f"  {field}: {pg_data[i]}")
        else:
            print("  ❌ No encontrado en postgres")
        
        print(f"\n📋 DATOS EN GSAUDB:")
        if gsau_data:
            fields = ['RFC', 'Mes', 'SD', 'SDI', 'Sueldo Cliente', 'Total Deducciones', 'Neto Antes Vales', 'Neto A Pagar']
            for i, field in enumerate(fields):
                print(f"  {field}: {gsau_data[i]}")
        else:
            print("  ❌ No encontrado en GSAUDB")
        
        postgres_conn.close()
        gsaudb_conn.close()
        
    except Exception as e:
        print(f"❌ Error en comparación: {e}")

def generate_data_migration_analysis():
    """Generar análisis de qué datos necesitan migración"""
    print(f"\n📋 ANÁLISIS DE MIGRACIÓN NECESARIA")
    print("=" * 50)
    
    analysis = {
        "campos_con_datos": [
            "RFC", "Mes", "Nombre completo", "Compañía", "Puesto", 
            "CURP", "Status", "SUELDO CLIENTE", "COMISIONES CLIENTE", 
            "TOTAL DE PERCEPCIONES", "Periodicidad", "cveper"
        ],
        "campos_sin_datos_pero_estructura_existe": [
            "SD", "SDI", "SUELDO", "TOTAL DEDUCCIONES", 
            "NETO ANTES DE VALES", "NETO A PAGAR", "COSTO DE NOMINA", 
            "TOTAL A FACTURAR", "PTU"
        ],
        "campos_completamente_ausentes": [
            "cargaSocial", "uploadBatch", "dataHash", 
            "createdAt", "updatedAt", "puestoCategorizado", 
            "claveEmpresa", "tiposNomina"
        ]
    }
    
    print("✅ CAMPOS CON DATOS DISPONIBLES:")
    for field in analysis["campos_con_datos"]:
        print(f"  • {field}")
    
    print(f"\n⚠️ CAMPOS SIN DATOS (NECESITAN MIGRACIÓN):")
    for field in analysis["campos_sin_datos_pero_estructura_existe"]:
        print(f"  • {field}")
    
    print(f"\n❌ CAMPOS AUSENTES (SOLO EN POSTGRES):")
    for field in analysis["campos_completamente_ausentes"]:
        print(f"  • {field}")
    
    return analysis

def main():
    print("🔍 VERIFICACIÓN COMPLETA DE ESTRUCTURA GSAUDB")
    print("=" * 65)
    
    # 1. Analizar todas las tablas
    analyze_related_tables()
    
    # 2. Comparar datos específicos
    check_postgres_vs_gsaudb_data()
    
    # 3. Generar análisis de migración
    migration_analysis = generate_data_migration_analysis()
    
    print(f"\n🎯 CONCLUSIONES FINALES:")
    print("=" * 30)
    print("✅ GSAUDB tiene la estructura pero faltan datos en campos críticos")
    print("📊 500 registros en GSAUDB vs ~51,000 en postgres") 
    print("🔄 Migración necesaria para completar datos faltantes")
    print("💡 Usar postgres como fuente principal hasta completar migración")

if __name__ == "__main__":
    main()
