#!/usr/bin/env python3
"""
Script para encontrar la tabla correcta que tiene 104 columnas con datos SDI
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

def find_all_tables_with_column_counts():
    """Encontrar todas las tablas y contar sus columnas"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 BUSCANDO TABLA CON 104 COLUMNAS")
        print("=" * 60)
        
        # Obtener todas las tablas con conteo de columnas
        cursor.execute("""
            SELECT 
                t.table_name,
                COUNT(c.column_name) as column_count
            FROM information_schema.tables t
            LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
            GROUP BY t.table_name
            ORDER BY column_count DESC;
        """)
        
        tables = cursor.fetchall()
        
        print("📋 TABLAS ORDENADAS POR NÚMERO DE COLUMNAS:")
        for table_name, column_count in tables:
            print(f"  📄 {table_name}: {column_count} columnas")
            
            # Si encontramos una tabla con muchas columnas, investigarla
            if column_count > 50:
                print(f"    🎯 ¡POSIBLE CANDIDATA! Investigando {table_name}...")
                investigate_table(cursor, table_name)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def investigate_table(cursor, table_name):
    """Investigar una tabla específica"""
    try:
        # Obtener conteo de registros
        cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
        record_count = cursor.fetchone()[0]
        
        if record_count == 0:
            print(f"    ❌ Tabla vacía")
            return
        
        print(f"    📊 {record_count} registros")
        
        # Buscar columnas con SDI, SD en el nombre
        cursor.execute(f"""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = '{table_name}'
            AND (UPPER(column_name) LIKE '%SDI%' OR UPPER(column_name) LIKE '%SD%')
            ORDER BY ordinal_position;
        """)
        
        sdi_columns = cursor.fetchall()
        
        if sdi_columns:
            print(f"    ✅ Columnas con SDI/SD encontradas:")
            for col_name, data_type in sdi_columns:
                print(f"      • {col_name} ({data_type})")
                
                # Probar si tiene datos
                try:
                    cursor.execute(f'SELECT "{col_name}" FROM "{table_name}" WHERE "{col_name}" IS NOT NULL AND "{col_name}" != 0 LIMIT 3')
                    sample_data = cursor.fetchall()
                    
                    if sample_data:
                        values = [str(r[0])[:10] for r in sample_data]
                        print(f"        📈 Datos: {values}")
                    else:
                        print(f"        ❌ Sin datos")
                        
                except Exception as e:
                    print(f"        ⚠️ Error: {e}")
        else:
            print(f"    ❌ No hay columnas SDI/SD")
            
    except Exception as e:
        print(f"    ❌ Error investigando {table_name}: {e}")

def search_for_sdi_in_all_tables():
    """Buscar campos SDI en todas las tablas"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n🕵️ BÚSQUEDA GLOBAL DE CAMPOS SDI")
        print("=" * 50)
        
        # Buscar en todas las tablas cualquier columna que contenga SDI
        cursor.execute("""
            SELECT 
                table_name, 
                column_name, 
                data_type,
                ordinal_position
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (
                UPPER(column_name) LIKE '%SDI%' 
                OR UPPER(column_name) LIKE '%SD%'
                OR column_name LIKE '%sdi%'
                OR column_name LIKE '%sd%'
            )
            ORDER BY table_name, ordinal_position;
        """)
        
        sdi_fields = cursor.fetchall()
        
        if sdi_fields:
            print("🎯 CAMPOS SDI/SD ENCONTRADOS EN TODAS LAS TABLAS:")
            
            current_table = None
            for table_name, col_name, data_type, position in sdi_fields:
                if current_table != table_name:
                    current_table = table_name
                    print(f"\n📋 TABLA: {table_name}")
                
                print(f"  {position:3d}. {col_name} ({data_type})")
                
                # Probar si tiene datos
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{table_name}" WHERE "{col_name}" IS NOT NULL')
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        cursor.execute(f'SELECT "{col_name}" FROM "{table_name}" WHERE "{col_name}" IS NOT NULL LIMIT 2')
                        samples = cursor.fetchall()
                        values = [str(r[0])[:15] for r in samples]
                        print(f"       ✅ {count} registros - Muestra: {values}")
                    else:
                        print(f"       ❌ Sin datos")
                        
                except Exception as e:
                    print(f"       ⚠️ Error: {e}")
        else:
            print("❌ No se encontraron campos SDI en ninguna tabla")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def check_specific_table_from_screenshot():
    """Verificar si estamos en la tabla correcta según la captura"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n📸 VERIFICANDO TABLA SEGÚN CAPTURA")
        print("=" * 50)
        
        # Buscar tabla que tenga campos como los de la captura: cveper, Periodo, tipo, SDI, etc.
        test_fields = ['cveper', 'Periodo', 'SDI', 'sdLes', 'SD', 'sdlm', 'SUELDO CLIENTE']
        
        cursor.execute("""
            SELECT DISTINCT table_name
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND column_name IN ('cveper', 'Periodo', 'SDI', 'sdLes', 'SD', 'sdlm')
        """)
        
        candidate_tables = cursor.fetchall()
        
        print(f"🎯 Tablas que contienen campos de la captura:")
        for (table_name,) in candidate_tables:
            print(f"  📄 {table_name}")
            
            # Verificar estructura completa
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}'
            """)
            col_count = cursor.fetchone()[0]
            print(f"      Columnas: {col_count}")
            
            if col_count > 50:  # Si tiene muchas columnas como en la captura
                print(f"      🎯 ¡POSIBLE TABLA CORRECTA!")
                
                # Mostrar algunas columnas
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}'
                    ORDER BY ordinal_position 
                    LIMIT 20
                """)
                cols = cursor.fetchall()
                col_names = [c[0] for c in cols]
                print(f"      Primeras columnas: {col_names}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def main():
    print("🔍 BÚSQUEDA DE LA TABLA CORRECTA CON 104 COLUMNAS")
    print("=" * 65)
    print("💡 Tu captura muestra 104 columnas, pero solo veo 33")
    print("💡 Debe haber otra tabla o vista con más columnas")
    
    # 1. Encontrar tablas con muchas columnas
    find_all_tables_with_column_counts()
    
    # 2. Búsqueda global de campos SDI
    search_for_sdi_in_all_tables()
    
    # 3. Verificar tabla específica según captura
    check_specific_table_from_screenshot()
    
    print(f"\n🎯 CONCLUSIÓN:")
    print("=" * 30)
    print("Si tu captura muestra datos reales con SDI, entonces:")
    print("1. Hay otra tabla con 104 columnas")
    print("2. O estás viendo una vista diferente")
    print("3. O hay un problema de permisos/conexión")

if __name__ == "__main__":
    main()
