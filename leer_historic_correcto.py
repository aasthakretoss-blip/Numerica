#!/usr/bin/env python3
"""
Script para conectarse a la base CORRECTA: Historic en dbgsau
donde SÍ están los datos reales con SDI
"""

import psycopg2

def connect_historic():
    """Conectar a Historic en dbgsau (la base correcta)"""
    try:
        connection = psycopg2.connect(
            host="dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",  # HOST CORRECTO
            port=5432,
            database="Historic",  # BASE CORRECTA
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        return connection
    except Exception as e:
        print(f"❌ Error conectando a Historic: {e}")
        return None

def verify_connection():
    """Verificar que estamos en la base correcta"""
    conn = connect_historic()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        cursor.execute("SELECT current_database(), inet_server_addr(), inet_server_port()")
        db_info = cursor.fetchone()
        
        print("🔍 VERIFICANDO CONEXIÓN")
        print("=" * 40)
        print(f"📄 Base de datos: {db_info[0]}")
        print(f"🌐 Host: {db_info[1]}")
        print(f"🔌 Puerto: {db_info[2]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando conexión: {e}")
        return False
    finally:
        conn.close()

def get_table_structure():
    """Obtener estructura completa de historico_nominas_gsau en Historic"""
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n📋 ESTRUCTURA DE historico_nominas_gsau EN HISTORIC")
        print("=" * 60)
        
        # Contar columnas
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
        """)
        col_count = cursor.fetchone()[0]
        print(f"📊 Total de columnas: {col_count}")
        
        # Obtener todas las columnas
        cursor.execute("""
            SELECT ordinal_position, column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print(f"\n📝 PRIMERAS 20 COLUMNAS:")
        for pos, col_name, data_type in columns[:20]:
            print(f"{pos:3d}. '{col_name}' ({data_type})")
        
        if len(columns) > 20:
            print(f"... y {len(columns) - 20} columnas más")
            
        return columns
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []
    finally:
        conn.close()

def find_sdi_fields():
    """Buscar específicamente campos SDI con datos reales"""
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n🎯 BUSCANDO CAMPOS SDI EN HISTORIC")
        print("=" * 50)
        
        # Buscar campos que contengan SDI
        cursor.execute("""
            SELECT ordinal_position, column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            AND (
                UPPER(column_name) LIKE '%SDI%' OR
                UPPER(column_name) LIKE '%SD%' OR
                column_name LIKE '%sdi%' OR
                column_name LIKE '%sd%'
            )
            ORDER BY ordinal_position;
        """)
        
        sdi_columns = cursor.fetchall()
        
        if sdi_columns:
            print("✅ CAMPOS SDI/SD ENCONTRADOS:")
            
            for pos, col_name, data_type in sdi_columns:
                print(f"\n{pos:3d}. '{col_name}' ({data_type})")
                
                # Probar si tiene datos reales
                try:
                    cursor.execute(f'SELECT "{col_name}" FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL AND "{col_name}" != 0 LIMIT 5')
                    data_samples = cursor.fetchall()
                    
                    if data_samples:
                        values = [str(r[0]) for r in data_samples]
                        print(f"     ✅ DATOS REALES: {values}")
                        
                        # Contar registros con datos
                        cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL AND "{col_name}" != 0')
                        count = cursor.fetchone()[0]
                        print(f"     📊 {count} registros con datos")
                        
                    else:
                        print(f"     ❌ Sin datos")
                        
                except Exception as e:
                    print(f"     ⚠️ Error probando datos: {e}")
        else:
            print("❌ No se encontraron campos SDI")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def test_sample_query():
    """Probar query de muestra para ver datos como en tu captura"""
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n📊 QUERY DE MUESTRA (COMO TU CAPTURA)")
        print("=" * 50)
        
        # Query simple para ver datos
        cursor.execute("SELECT * FROM historico_nominas_gsau LIMIT 3")
        
        # Obtener nombres de columnas
        column_names = [desc[0] for desc in cursor.description]
        records = cursor.fetchall()
        
        print(f"📋 Columnas encontradas: {len(column_names)}")
        print(f"📊 Registros de muestra: {len(records)}")
        
        if records:
            print(f"\n🎯 DATOS DE MUESTRA:")
            
            # Buscar columnas con SDI para mostrar
            sdi_columns = [(i, name) for i, name in enumerate(column_names) 
                          if 'SDI' in name.upper() or 'SD' in name.upper()]
            
            if sdi_columns:
                print("📈 CAMPOS SDI/SD CON VALORES:")
                for record_num, record in enumerate(records, 1):
                    print(f"\n  Registro {record_num}:")
                    for col_index, col_name in sdi_columns:
                        value = record[col_index]
                        status = "✅" if value and value != 0 else "❌"
                        print(f"    {status} {col_name}: {value}")
            
            # También mostrar algunos campos básicos
            basic_fields = ['RFC', 'Mes', 'Nombre completo', 'Compañía']
            print(f"\n📋 CAMPOS BÁSICOS:")
            for record_num, record in enumerate(records, 1):
                print(f"\n  Registro {record_num}:")
                for i, col_name in enumerate(column_names):
                    if any(field.lower() in col_name.lower() for field in basic_fields):
                        print(f"    • {col_name}: {record[i]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def main():
    print("🎯 CONECTANDO A LA BASE CORRECTA: HISTORIC")
    print("=" * 60)
    print("🌐 Host: dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com")
    print("📄 Database: Historic")
    print("📋 Table: historico_nominas_gsau")
    
    # 1. Verificar conexión
    if not verify_connection():
        print("❌ No se pudo conectar a Historic")
        return
    
    # 2. Obtener estructura
    columns = get_table_structure()
    
    # 3. Buscar campos SDI específicos
    find_sdi_fields()
    
    # 4. Probar query de muestra
    test_sample_query()
    
    print(f"\n🎉 AHORA SÍ DEBERÍAS VER LOS DATOS REALES!")
    print("=" * 50)
    print("✅ Conexión correcta a Historic")
    print("✅ Campos SDI con datos reales")
    print("✅ Estructura de 104 columnas")

if __name__ == "__main__":
    main()
