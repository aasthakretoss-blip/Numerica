#!/usr/bin/env python3
"""
Script corregido para leer los datos reales que SÍ existen en historico_nominas_gsau
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

def get_all_columns_with_sample_data():
    """Obtener TODAS las columnas con datos de muestra reales"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 OBTENIENDO TODAS LAS COLUMNAS REALES")
        print("=" * 60)
        
        # Obtener información detallada de TODAS las columnas
        cursor.execute("""
            SELECT column_name, data_type, ordinal_position
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        all_columns = cursor.fetchall()
        print(f"📋 Total de columnas encontradas: {len(all_columns)}")
        
        # Obtener un registro completo para ver todos los datos
        print(f"\n📊 OBTENIENDO REGISTRO COMPLETO:")
        cursor.execute("SELECT * FROM historico_nominas_gsau LIMIT 1")
        
        sample_record = cursor.fetchone()
        column_names = [desc[0] for desc in cursor.description]
        
        print(f"📋 TODOS LOS CAMPOS CON SUS VALORES:")
        print("-" * 80)
        
        available_fields = {}
        
        for i, (col_name, data_type, position) in enumerate(all_columns):
            value = sample_record[i] if sample_record and i < len(sample_record) else None
            
            # Marcar si tiene datos
            has_data = value is not None and value != '' and value != 0
            status = "✅" if has_data else "❌"
            
            print(f"{position:3d}. {status} '{col_name}' ({data_type}): {value}")
            
            if has_data:
                available_fields[col_name] = {
                    'data_type': data_type,
                    'sample_value': value,
                    'position': position
                }
        
        return available_fields
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return {}
    finally:
        conn.close()

def test_specific_sdi_fields():
    """Probar específicamente los campos SDI que viste en pgAdmin"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n🎯 PROBANDO CAMPOS SDI ESPECÍFICOS")
        print("=" * 50)
        
        # Lista de posibles nombres de campos SDI basados en la imagen
        sdi_fields = ['SDI', 'sdi', 'sdLes', 'SD', 'sd', 'sdlm', 'SUELDO CLIENTE']
        
        for field_name in sdi_fields:
            try:
                # Probar con y sin comillas
                for quote_style in [f'"{field_name}"', f"'{field_name}'", field_name]:
                    try:
                        query = f'SELECT {quote_style}, COUNT(*) FROM historico_nominas_gsau WHERE {quote_style} IS NOT NULL GROUP BY {quote_style} LIMIT 5'
                        cursor.execute(query)
                        results = cursor.fetchall()
                        
                        if results:
                            print(f"✅ Campo encontrado: {quote_style}")
                            print(f"   Valores: {results}")
                            break
                            
                    except Exception:
                        continue
                else:
                    print(f"❌ No encontrado: {field_name}")
                    
            except Exception as e:
                print(f"⚠️ Error con {field_name}: {e}")
    
    except Exception as e:
        print(f"❌ Error general: {e}")
    finally:
        conn.close()

def get_exact_column_names():
    """Obtener los nombres EXACTOS de todas las columnas"""
    conn = connect_gsaudb()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        
        print(f"\n📋 NOMBRES EXACTOS DE COLUMNAS")
        print("=" * 40)
        
        cursor.execute("""
            SELECT ordinal_position, column_name 
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        exact_names = []
        
        for position, col_name in columns:
            print(f"{position:3d}. '{col_name}'")
            exact_names.append(col_name)
        
        return exact_names
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []
    finally:
        conn.close()

def test_with_exact_names(column_names):
    """Probar consultas con nombres exactos de columnas"""
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"\n🧪 PROBANDO CON NOMBRES EXACTOS")
        print("=" * 40)
        
        # Buscar campos que contengan SDI, SD, sueldo, etc.
        target_keywords = ['SDI', 'SD', 'sueldo', 'SUELDO', 'sdi', 'sd']
        
        matching_fields = []
        for col_name in column_names:
            for keyword in target_keywords:
                if keyword in col_name:
                    matching_fields.append(col_name)
                    break
        
        print(f"🎯 Campos que contienen SDI/SD/sueldo: {matching_fields}")
        
        # Probar cada campo
        for field in matching_fields[:10]:  # Probar solo los primeros 10
            try:
                query = f'SELECT "{field}" FROM historico_nominas_gsau WHERE "{field}" IS NOT NULL LIMIT 3'
                cursor.execute(query)
                results = cursor.fetchall()
                
                if results:
                    values = [r[0] for r in results]
                    print(f"✅ '{field}': {values}")
                else:
                    print(f"⚠️ '{field}': Sin datos")
                    
            except Exception as e:
                print(f"❌ '{field}': Error - {e}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def main():
    print("🔍 INVESTIGACIÓN COMPLETA DE DATOS REALES")
    print("=" * 60)
    print("💡 Basado en la captura de pgAdmin que muestra datos reales")
    
    # 1. Obtener todas las columnas con datos de muestra
    available_fields = get_all_columns_with_sample_data()
    
    # 2. Obtener nombres exactos
    exact_names = get_exact_column_names()
    
    # 3. Probar campos específicos SDI
    test_specific_sdi_fields()
    
    # 4. Probar con nombres exactos
    if exact_names:
        test_with_exact_names(exact_names)
    
    # 5. Resumen
    print(f"\n🎯 RESUMEN:")
    print("=" * 30)
    if available_fields:
        print(f"✅ Campos disponibles encontrados: {len(available_fields)}")
        print("📋 Campos principales:")
        for field_name, info in list(available_fields.items())[:10]:
            print(f"  • {field_name}: {info['sample_value']}")
    else:
        print("⚠️ Necesario revisar conexión y permisos")
    
    print(f"\n💡 Según tu captura, deberían existir:")
    print("  • SDI con valores como 363.55, 609.89, etc.")
    print("  • SD con valores similares")
    print("  • SUELDO CLIENTE con valores como 5453.25")

if __name__ == "__main__":
    main()
