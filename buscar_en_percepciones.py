#!/usr/bin/env python3
"""
Script para buscar datos detallados en percepciones y deducciones
que podrían contener los campos "faltantes" como SDI
"""

import psycopg2
import json

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

def get_all_tables():
    """Obtener todas las tablas de GSAUDB para buscar datos detallados"""
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
        return [table[0] for table in tables]
        
    except Exception as e:
        print(f"❌ Error obteniendo tablas: {e}")
        return []
    finally:
        conn.close()

def search_for_sdi_data():
    """Buscar específicamente datos de SDI en diferentes lugares"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 BUSCANDO DATOS DE SDI EN DIFERENTES ESTRUCTURAS")
        print("=" * 60)
        
        # 1. Verificar si hay datos ocultos en campos que parecen vacíos
        print("\n1. VERIFICANDO CAMPOS CON ESPACIOS ESPECÍFICOS:")
        
        test_fields = ['" SDI "', '" SD "', '" SUELDO "', '" TOTAL DEDUCCIONES "', '" NETO A PAGAR "']
        
        for field in test_fields:
            try:
                # Contar todos los registros (incluyendo NULL y vacíos)
                cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau')
                total_count = cursor.fetchone()[0]
                
                # Contar registros no nulos
                cursor.execute(f'SELECT COUNT({field}) FROM historico_nominas_gsau WHERE {field} IS NOT NULL')
                not_null_count = cursor.fetchone()[0]
                
                # Contar registros con valores > 0
                cursor.execute(f'SELECT COUNT({field}) FROM historico_nominas_gsau WHERE {field} > 0')
                positive_count = cursor.fetchone()[0]
                
                print(f"  {field}:")
                print(f"    Total registros: {total_count}")
                print(f"    No NULL: {not_null_count}")
                print(f"    Valores > 0: {positive_count}")
                
                if positive_count > 0:
                    # Obtener muestra de valores
                    cursor.execute(f'SELECT {field} FROM historico_nominas_gsau WHERE {field} > 0 LIMIT 5')
                    samples = cursor.fetchall()
                    print(f"    ✅ DATOS ENCONTRADOS: {[s[0] for s in samples]}")
                else:
                    print(f"    ❌ Sin datos positivos")
                    
            except Exception as e:
                print(f"  ❌ Error con {field}: {e}")
        
        # 2. Buscar en otras tablas que puedan tener percepciones detalladas
        print(f"\n2. BUSCANDO EN OTRAS TABLAS:")
        
        tables = get_all_tables()
        for table in tables:
            if 'percepcion' in table.lower() or 'deduccion' in table.lower() or 'detalle' in table.lower():
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM {table}')
                    count = cursor.fetchone()[0]
                    print(f"  📋 {table}: {count} registros")
                    
                    if count > 0:
                        # Ver estructura de la tabla
                        cursor.execute(f"""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = '{table}'
                            ORDER BY ordinal_position
                        """)
                        columns = cursor.fetchall()
                        col_names = [col[0] for col in columns]
                        print(f"    Columnas: {col_names}")
                        
                except Exception as e:
                    print(f"  ❌ Error con tabla {table}: {e}")
        
        # 3. Buscar patrones específicos en los datos
        print(f"\n3. ANÁLISIS DE PATRONES DE DATOS:")
        
        # Verificar si hay registros con percepciones pero sin SDI
        cursor.execute('''
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN " SUELDO CLIENTE " > 0 THEN 1 END) as con_sueldo,
                COUNT(CASE WHEN " SDI " > 0 THEN 1 END) as con_sdi,
                COUNT(CASE WHEN " SD " > 0 THEN 1 END) as con_sd
            FROM historico_nominas_gsau
        ''')
        
        stats = cursor.fetchone()
        print(f"  Total registros: {stats[0]}")
        print(f"  Con sueldo cliente: {stats[1]}")
        print(f"  Con SDI: {stats[2]}")
        print(f"  Con SD: {stats[3]}")
        
    except Exception as e:
        print(f"❌ Error general: {e}")
    finally:
        conn.close()

def deep_search_missing_data():
    """Búsqueda profunda de datos que podrían estar en campos inesperados"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n🕵️ BÚSQUEDA PROFUNDA DE DATOS ESCONDIDOS")
        print("=" * 50)
        
        # 1. Revisar si los datos están en campos con nombres ligeramente diferentes
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            AND (
                LOWER(column_name) LIKE '%sdi%' OR
                LOWER(column_name) LIKE '%salario%' OR  
                LOWER(column_name) LIKE '%deduccion%' OR
                LOWER(column_name) LIKE '%neto%' OR
                LOWER(column_name) LIKE '%integrado%'
            )
            ORDER BY column_name;
        """)
        
        similar_columns = cursor.fetchall()
        print(f"📋 COLUMNAS CON NOMBRES SIMILARES:")
        for col_name, data_type in similar_columns:
            # Probar si tiene datos
            try:
                cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL AND CAST("{col_name}" as text) != \'\'')
                count = cursor.fetchone()[0]
                
                if count > 0:
                    cursor.execute(f'SELECT "{col_name}" FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL LIMIT 3')
                    samples = cursor.fetchall()
                    print(f"  ✅ {col_name} ({data_type}): {count} registros - Muestra: {[s[0] for s in samples]}")
                else:
                    print(f"  ❌ {col_name} ({data_type}): Sin datos")
                    
            except Exception as e:
                print(f"  ⚠️ {col_name}: Error al verificar - {e}")
        
        # 2. Verificar si hay datos calculables desde otros campos
        print(f"\n🧮 VERIFICANDO DATOS CALCULABLES:")
        
        try:
            cursor.execute('''
                SELECT 
                    "RFC",
                    " SUELDO CLIENTE ",
                    " COMISIONES CLIENTE ",
                    " TOTAL DE PERCEPCIONES ",
                    (" SUELDO CLIENTE " + " COMISIONES CLIENTE ") as calculado_percepciones
                FROM historico_nominas_gsau 
                WHERE " SUELDO CLIENTE " > 0 
                LIMIT 5
            ''')
            
            calc_data = cursor.fetchall()
            print(f"📊 DATOS CALCULABLES (muestra):")
            for row in calc_data:
                rfc, sueldo, comisiones, total_perc, calc_perc = row
                print(f"  {rfc}: Sueldo={sueldo}, Comisiones={comisiones}, Total={total_perc}, Calculado={calc_perc}")
                
        except Exception as e:
            print(f"❌ Error en cálculos: {e}")
        
        # 3. Buscar en registros específicos donde sabemos que HAY datos
        print(f"\n🎯 ANÁLISIS DE REGISTROS CON DATOS:")
        
        cursor.execute('''
            SELECT 
                "RFC",
                "Mes",
                " SUELDO CLIENTE ",
                " COMISIONES CLIENTE ",
                " TOTAL DE PERCEPCIONES ",
                " SDI ",
                " SD ",
                " TOTAL DEDUCCIONES ",
                " NETO A PAGAR "
            FROM historico_nominas_gsau 
            WHERE " SUELDO CLIENTE " > 0
            LIMIT 3
        ''')
        
        sample_records = cursor.fetchall()
        print(f"📋 REGISTROS DE MUESTRA:")
        
        col_names = ['RFC', 'Mes', 'Sueldo Cliente', 'Comisiones', 'Total Percepciones', 'SDI', 'SD', 'Total Deducciones', 'Neto a Pagar']
        
        for record in sample_records:
            print(f"\n  📄 Registro:")
            for i, value in enumerate(record):
                status = "✅" if value and value != 0 else "❌"
                print(f"    {status} {col_names[i]}: {value}")
    
    except Exception as e:
        print(f"❌ Error en búsqueda profunda: {e}")
    finally:
        conn.close()

def generate_updated_mapping():
    """Generar mapeo actualizado basado en hallazgos"""
    print(f"\n📋 MAPEO ACTUALIZADO CON HALLAZGOS")
    print("=" * 50)
    
    # Mapeo basado en los hallazgos reales
    real_mapping = {
        # Campos confirmados con datos
        'rfc': '"RFC"',
        'mes': '"Mes"', 
        'nombreCompleto': '"Nombre completo"',
        'empresa': '"Compañía"',
        'puesto': '"Puesto"',
        'curp': '"CURP"',
        'status': '"Status"',
        'sueldoCliente': '" SUELDO CLIENTE "',
        'comisionesCliente': '" COMISIONES CLIENTE "',
        'totalPercepciones': '" TOTAL DE PERCEPCIONES "',
        'periodicidad': '"Periodicidad"',
        'cveper': '"cveper"',
        
        # Campos que existen pero pueden tener patrones de datos específicos
        'sd': '" SD "',  # Verificar si hay datos bajo condiciones específicas
        'sdi': '" SDI "',  # Verificar si hay datos bajo condiciones específicas
        'totalDeducciones': '" TOTAL DEDUCCIONES "',
        'netoAntesVales': '" NETO ANTES DE VALES "',
        'netoDespuesVales': '" NETO A PAGAR "',
        'cargaSocial': '" COSTO DE NOMINA "',  # Posible equivalente
        'ptu': '"PTU"',
    }
    
    print("Campo Postgres -> Campo GSAUDB (Estado)")
    print("-" * 45)
    for pg_field, gsau_field in real_mapping.items():
        print(f"{pg_field:<20} -> {gsau_field}")
    
    return real_mapping

def main():
    print("🔍 BÚSQUEDA DETALLADA EN PERCEPCIONES Y DEDUCCIONES")
    print("=" * 65)
    
    # 1. Buscar datos de SDI específicamente
    search_for_sdi_data()
    
    # 2. Búsqueda profunda de datos escondidos
    deep_search_missing_data()
    
    # 3. Generar mapeo actualizado
    updated_mapping = generate_updated_mapping()
    
    print(f"\n🎯 CONCLUSIONES:")
    print("=" * 30)
    print("✅ Se verificó que algunos campos tienen estructura pero datos específicos")
    print("🔍 Necesario verificar condiciones específicas para encontrar datos")
    print("💡 Posible que datos estén en campos con patrones específicos")
    
if __name__ == "__main__":
    main()
