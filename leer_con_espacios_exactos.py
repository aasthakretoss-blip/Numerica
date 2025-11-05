#!/usr/bin/env python3
"""
Script para leer campos con espacios exactos al principio y final (SIN comillas)
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

def test_spaces_variations():
    """Probar todas las variaciones de espacios posibles"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 PROBANDO VARIACIONES DE ESPACIOS EXACTAS")
        print("=" * 60)
        
        # Basado en tu captura, los campos deberían ser algo como:
        # SDI (con espacios), SD (con espacios), etc.
        
        # Variaciones de espacios para SDI
        sdi_variations = [
            'SDI',           # Sin espacios
            ' SDI',          # Espacio al inicio
            'SDI ',          # Espacio al final  
            ' SDI ',         # Espacios ambos lados
            '  SDI  ',       # Dobles espacios
            'sdi',           # Minúsculas
            ' sdi ',         # Minúsculas con espacios
            'sdLes',         # Como aparece en tu captura
            ' sdLes ',       # Con espacios
            'SD',            # SD simple
            ' SD ',          # SD con espacios
            'sdlm',          # Como aparece en tu captura
            ' sdlm ',        # Con espacios
        ]
        
        for field_variation in sdi_variations:
            try:
                # Probar sin comillas (como dices)
                query = f'SELECT {field_variation} FROM historico_nominas_gsau WHERE {field_variation} IS NOT NULL LIMIT 3'
                cursor.execute(query)
                results = cursor.fetchall()
                
                if results:
                    values = [r[0] for r in results]
                    print(f"✅ Campo encontrado: '{field_variation}' -> Valores: {values}")
                else:
                    print(f"⚠️  Campo existe pero sin datos: '{field_variation}'")
                    
            except psycopg2.Error as e:
                # Si no existe el campo, saltará error
                if "does not exist" in str(e):
                    print(f"❌ Campo no existe: '{field_variation}'")
                else:
                    print(f"⚠️  Error con '{field_variation}': {e}")
                # Resetear conexión si hay error
                conn.rollback()
            except Exception as e:
                print(f"❌ Error inesperado con '{field_variation}': {e}")
                conn.rollback()
    
    except Exception as e:
        print(f"❌ Error general: {e}")
    finally:
        conn.close()

def get_exact_field_names_raw():
    """Obtener nombres exactos de campos tal como están en la base"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n📋 NOMBRES EXACTOS TAL COMO ESTÁN EN LA BASE")
        print("=" * 50)
        
        # Obtener nombres SIN procesar
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print("📝 NOMBRES EXACTOS (mostrando espacios con []):")
        for i, (col_name,) in enumerate(columns, 1):
            # Mostrar espacios visualmente
            visual_name = col_name.replace(' ', '·')  # Mostrar espacios como puntos
            spaces_info = f"[{len(col_name)} chars]"
            
            print(f"{i:2d}. '{visual_name}' {spaces_info}")
            
            # Si contiene SDI o SD, probarlo
            if 'SDI' in col_name.upper() or (col_name.upper().strip() in ['SD', 'SDI']):
                try:
                    # Usar comillas dobles para nombres con espacios
                    query = f'SELECT "{col_name}" FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL LIMIT 3'
                    cursor.execute(query)
                    results = cursor.fetchall()
                    
                    if results:
                        values = [r[0] for r in results]
                        print(f"    ✅ DATOS ENCONTRADOS: {values}")
                    else:
                        print(f"    ❌ Sin datos")
                        
                except Exception as e:
                    print(f"    ⚠️ Error: {e}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def test_direct_query_like_pgadmin():
    """Probar query directa como en pgAdmin"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n🎯 QUERY DIRECTA COMO EN PGADMIN")
        print("=" * 40)
        
        # Query simple como harías en pgAdmin
        cursor.execute("SELECT * FROM historico_nominas_gsau LIMIT 1")
        
        # Obtener nombres de columnas tal como los devuelve
        column_names = [desc[0] for desc in cursor.description]
        record = cursor.fetchone()
        
        print("📋 TODAS LAS COLUMNAS CON SUS VALORES:")
        for i, col_name in enumerate(column_names):
            value = record[i] if record else None
            
            # Buscar campos que contengan SDI o SD
            if ('SDI' in col_name.upper() or 'SD' in col_name.upper() or 
                col_name.upper().strip() in ['SDI', 'SD']):
                
                status = "✅" if value and value != 0 else "❌"
                print(f"{status} CAMPO SDI/SD: '{col_name}' = {value}")
        
        # Intentar query específica para campos con espacios
        print(f"\n🧪 PROBANDO CAMPOS ESPECÍFICOS:")
        
        # Buscar el campo que debería tener SDI
        for col_name in column_names:
            if 'SDI' in col_name.upper():
                try:
                    cursor.execute(f'SELECT "{col_name}" FROM historico_nominas_gsau WHERE "{col_name}" > 0 LIMIT 5')
                    sdi_results = cursor.fetchall()
                    
                    if sdi_results:
                        values = [r[0] for r in sdi_results]
                        print(f"✅ '{col_name}' con valores > 0: {values}")
                    else:
                        print(f"❌ '{col_name}' sin valores > 0")
                        
                except Exception as e:
                    print(f"⚠️ Error con '{col_name}': {e}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def main():
    print("🔍 LECTURA CON ESPACIOS EXACTOS (SIN COMILLAS)")
    print("=" * 60)
    print("💡 Probando campos con espacios al inicio y final")
    
    # 1. Probar variaciones de espacios
    test_spaces_variations()
    
    # 2. Obtener nombres exactos
    get_exact_field_names_raw()
    
    # 3. Query directa como pgAdmin
    test_direct_query_like_pgadmin()
    
    print(f"\n🎯 SI SIGUES VIENDO DIFERENCIAS:")
    print("=" * 30)
    print("1. Verifica que estés conectado al mismo host/database")
    print("2. Ejecuta en pgAdmin: SELECT current_database(), version();")
    print("3. Copia exactamente la query que funciona en pgAdmin")

if __name__ == "__main__":
    main()
