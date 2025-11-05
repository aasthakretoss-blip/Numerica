#!/usr/bin/env python3
"""
Script para resolver problemas de campos faltantes en historico_nominas_gsau
"""

import psycopg2

# Mapeo de campos entre postgres y GSAUDB
FIELD_MAPPING = {
    # Postgres -> GSAUDB
    'sueldoCliente': '" SUELDO CLIENTE "',
    'comisionesCliente': '" COMISIONES CLIENTE "',
    'totalPercepciones': '" TOTAL DE PERCEPCIONES "',
    'totalDeducciones': '" TOTAL DEDUCCIONES "',
    'netoAntesVales': '" NETO ANTES DE VALES "',
    'netoDespuesVales': '" NETO A PAGAR "',
    'sd': '" SD "',
    'sdi': '" SDI "',
    'nombreCompleto': '"Nombre completo"',
    'empresa': '"Compañía"',
    # Campos que no existen en GSAUDB
    'cargaSocial': None,
    'uploadBatch': None,
    'dataHash': None,
    'createdAt': None,
    'updatedAt': None
}

def test_gsaudb_connection():
    """Probar conexión a GSAUDB"""
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="GSAUDB",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        print("✅ Conexión exitosa a GSAUDB")
        return connection
    except Exception as e:
        print(f"❌ Error conectando a GSAUDB: {e}")
        return None

def build_correct_query(desired_fields):
    """Construir query correcta usando nombres de campos exactos"""
    
    available_fields = []
    missing_fields = []
    
    for field in desired_fields:
        if field in FIELD_MAPPING:
            gsaudb_field = FIELD_MAPPING[field]
            if gsaudb_field:
                available_fields.append(f"{gsaudb_field} as {field}")
            else:
                missing_fields.append(field)
        else:
            # Verificar si el campo existe directamente
            if field in ['"RFC"', '"CURP"', '"Mes"', '"Puesto"']:
                available_fields.append(field)
            else:
                missing_fields.append(field)
    
    query = f"""
    SELECT {', '.join(available_fields)}
    FROM historico_nominas_gsau
    WHERE "RFC" IS NOT NULL
    LIMIT 5;
    """
    
    return query, available_fields, missing_fields

def test_query_execution():
    """Probar ejecución de query con campos correctos"""
    
    # Campos que típicamente se buscan en payroll
    desired_fields = [
        'RFC', 'nombreCompleto', 'empresa', 'mes',
        'sueldoCliente', 'comisionesCliente', 'totalPercepciones',
        'sd', 'sdi', 'cargaSocial'  # Este último no existe en GSAUDB
    ]
    
    conn = test_gsaudb_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        query, available, missing = build_correct_query(desired_fields)
        
        print("\n🔍 ANÁLISIS DE CONSULTA:")
        print("=" * 50)
        print(f"Campos disponibles: {len(available)}")
        for field in available:
            print(f"  ✅ {field}")
            
        if missing:
            print(f"\nCampos faltantes: {len(missing)}")
            for field in missing:
                print(f"  ❌ {field} - No existe en GSAUDB")
        
        print(f"\n📝 Query generada:")
        print(query)
        
        # Ejecutar query
        print(f"\n🚀 Ejecutando consulta...")
        cursor.execute(query)
        results = cursor.fetchall()
        
        print(f"✅ Query ejecutada exitosamente")
        print(f"📊 {len(results)} registros encontrados")
        
        if results:
            print("\n📋 Muestra de datos:")
            col_names = [desc[0] for desc in cursor.description]
            print("Columnas:", col_names)
            
            for i, row in enumerate(results[:2]):
                print(f"\nRegistro {i+1}:")
                for j, value in enumerate(row):
                    print(f"  {col_names[j]}: {value}")
        
    except Exception as e:
        print(f"❌ Error ejecutando consulta: {e}")
        
    finally:
        conn.close()

def generate_field_mapping_guide():
    """Generar guía de mapeo de campos"""
    
    print("\n📋 GUÍA DE MAPEO DE CAMPOS")
    print("=" * 60)
    print("Postgres -> GSAUDB")
    print("-" * 30)
    
    for pg_field, gsau_field in FIELD_MAPPING.items():
        if gsau_field:
            print(f"{pg_field:<20} -> {gsau_field}")
        else:
            print(f"{pg_field:<20} -> ❌ NO DISPONIBLE")

def main():
    print("🔧 DIAGNÓSTICO DE CAMPOS FALTANTES")
    print("=" * 50)
    
    # 1. Generar guía de mapeo
    generate_field_mapping_guide()
    
    # 2. Probar consulta
    test_query_execution()
    
    # 3. Recomendaciones
    print("\n💡 RECOMENDACIONES:")
    print("=" * 30)
    print("1. Usar nombres exactos con espacios para campos monetarios")
    print("2. Campos como cargaSocial no existen en GSAUDB")
    print("3. Considerar migrar datos faltantes desde postgres")
    print("4. Actualizar frontend para usar campos disponibles")

if __name__ == "__main__":
    main()
