#!/usr/bin/env python3
"""
Script para verificar la estructura de datos de Antigüedad en Fondo
y entender cómo calcular las fechas FPL correctas
"""

import psycopg2

def connect_historic():
    """Conectar a Historic"""
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

def verify_antiguedad_fondo_structure():
    """Verificar estructura de Antigüedad en Fondo"""
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO ESTRUCTURA DE ANTIGÜEDAD EN FONDO")
        print("=" * 65)
        
        # 1. Buscar columnas relacionadas con antiguedad
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_fondos_gsau'
            AND (
                LOWER(column_name) LIKE '%antiguedad%' OR
                LOWER(column_name) LIKE '%fondo%' OR
                LOWER(column_name) LIKE '%ant%' OR
                column_name IN ('fecpla', 'numrfc')
            )
            ORDER BY ordinal_position;
        """)
        
        relevant_columns = cursor.fetchall()
        print("📊 COLUMNAS RELEVANTES EN historico_fondos_gsau:")
        for col_name, data_type in relevant_columns:
            print(f"   • {col_name} ({data_type})")
        
        # 2. Buscar todas las columnas para identificar Antigüedad en Fondo
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'historico_fondos_gsau'
            ORDER BY ordinal_position;
        """)
        
        all_columns = [row[0] for row in cursor.fetchall()]
        print(f"\n📋 TODAS LAS COLUMNAS ({len(all_columns)} total):")
        for i, col in enumerate(all_columns, 1):
            print(f"   {i:2d}. {col}")
        
        # 3. Buscar patrones que puedan indicar Antigüedad en Fondo
        antiguedad_candidates = [col for col in all_columns 
                                if 'ant' in col.lower() or 'fondo' in col.lower() or 'year' in col.lower()]
        
        if antiguedad_candidates:
            print(f"\n🎯 POSIBLES COLUMNAS DE ANTIGÜEDAD EN FONDO:")
            for candidate in antiguedad_candidates:
                print(f"   • {candidate}")
                
                # Analizar datos de cada candidato
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM historico_fondos_gsau WHERE "{candidate}" IS NOT NULL')
                    count = cursor.fetchone()[0]
                    
                    cursor.execute(f'SELECT MIN("{candidate}"), MAX("{candidate}"), AVG("{candidate}") FROM historico_fondos_gsau WHERE "{candidate}" IS NOT NULL AND "{candidate}" != 0')
                    stats = cursor.fetchone()
                    
                    cursor.execute(f'SELECT "{candidate}" FROM historico_fondos_gsau WHERE "{candidate}" IS NOT NULL AND "{candidate}" != 0 LIMIT 5')
                    samples = cursor.fetchall()
                    
                    print(f"     📊 Registros: {count:,}")
                    if stats and stats[0] is not None:
                        print(f"     📈 Rango: {stats[0]} - {stats[1]} (Promedio: {stats[2]:.4f})")
                        print(f"     🎯 Muestras: {[float(s[0]) if s[0] is not None else None for s in samples[:5]]}")
                    print()
                    
                except Exception as e:
                    print(f"     ❌ Error analizando {candidate}: {e}")
        
        # 4. Mostrar muestra de datos completos para entender la estructura
        print(f"\n🧪 MUESTRA DE DATOS COMPLETOS (primeros 3 registros):")
        cursor.execute("SELECT * FROM historico_fondos_gsau LIMIT 3")
        sample_records = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        
        for i, record in enumerate(sample_records, 1):
            print(f"\n   📝 REGISTRO {i}:")
            for j, value in enumerate(record):
                if value is not None and value != 0 and value != '':
                    print(f"      {column_names[j]}: {value}")
        
        # 5. Buscar datos con fecpla válida para hacer pruebas
        cursor.execute("""
            SELECT numrfc, fecpla
            FROM historico_fondos_gsau 
            WHERE fecpla IS NOT NULL 
            AND numrfc IS NOT NULL
            LIMIT 3
        """)
        
        test_data = cursor.fetchall()
        print(f"\n🔬 DATOS DE PRUEBA PARA FECPLA:")
        for numrfc, fecpla in test_data:
            print(f"   RFC: {numrfc} -> Fecha base: {fecpla}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error verificando estructura: {e}")

if __name__ == "__main__":
    verify_antiguedad_fondo_structure()
