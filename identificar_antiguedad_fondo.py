#!/usr/bin/env python3
"""
Script para identificar exactamente la columna de Antigüedad en Fondo
y verificar sus valores como números float
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

def identificar_columna_antiguedad():
    """Identificar la columna exacta de Antigüedad en Fondo"""
    conn = connect_historic()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        print("🔍 IDENTIFICANDO COLUMNA 'ANTIGÜEDAD EN FONDO'")
        print("=" * 55)
        
        # 1. Mostrar TODAS las columnas de la tabla
        cursor.execute("""
            SELECT column_name, data_type, ordinal_position
            FROM information_schema.columns 
            WHERE table_name = 'historico_fondos_gsau'
            ORDER BY ordinal_position;
        """)
        
        all_columns = cursor.fetchall()
        print(f"📋 TODAS LAS COLUMNAS ({len(all_columns)} total):")
        for pos, col_name, data_type in all_columns:
            print(f"   {pos:2d}. {col_name} ({data_type})")
        
        # 2. Buscar específicamente columnas que contengan "antiguedad" o "fondo"
        antiguedad_candidates = []
        for pos, col_name, data_type in all_columns:
            if any(word in col_name.lower() for word in ['antiguedad', 'fondo', 'ant']):
                antiguedad_candidates.append((col_name, data_type))
        
        if antiguedad_candidates:
            print(f"\n🎯 CANDIDATOS PARA 'ANTIGÜEDAD EN FONDO':")
            for col_name, data_type in antiguedad_candidates:
                print(f"   • {col_name} ({data_type})")
                
                # Analizar datos de cada candidato
                try:
                    cursor.execute(f"""
                        SELECT 
                            COUNT(*) as total,
                            COUNT(*) FILTER (WHERE "{col_name}" IS NOT NULL) as no_nulos,
                            COUNT(*) FILTER (WHERE "{col_name}" > 0) as positivos,
                            MIN("{col_name}") as min_val,
                            MAX("{col_name}") as max_val,
                            AVG("{col_name}") as avg_val
                        FROM historico_fondos_gsau
                        WHERE "{col_name}" IS NOT NULL
                    """)
                    
                    stats = cursor.fetchone()
                    if stats:
                        total, no_nulos, positivos, min_val, max_val, avg_val = stats
                        print(f"     📊 Stats: {no_nulos:,} no nulos, {positivos:,} > 0")
                        if min_val is not None:
                            print(f"     📈 Rango: {min_val} - {max_val}, Promedio: {avg_val:.4f}")
                    
                    # Mostrar algunos valores de ejemplo
                    cursor.execute(f"""
                        SELECT "{col_name}", numrfc
                        FROM historico_fondos_gsau 
                        WHERE "{col_name}" IS NOT NULL 
                        AND "{col_name}" > 0
                        ORDER BY "{col_name}" ASC
                        LIMIT 10
                    """)
                    
                    samples = cursor.fetchall()
                    if samples:
                        print(f"     🎯 Primeros 10 valores ordenados:")
                        for value, rfc in samples:
                            print(f"       {value} (RFC: {rfc})")
                    
                    print()
                        
                except Exception as e:
                    print(f"     ❌ Error analizando {col_name}: {e}")
        
        # 3. Si no encontramos obvios, buscar columnas numéricas que podrían ser años
        else:
            print(f"\n🔍 BUSCANDO EN COLUMNAS NUMÉRICAS:")
            numeric_candidates = []
            for pos, col_name, data_type in all_columns:
                if data_type in ['numeric', 'double precision', 'real', 'integer', 'smallint', 'bigint']:
                    if col_name.lower() not in ['numrfc', 'fecpla']:
                        numeric_candidates.append((col_name, data_type))
            
            for col_name, data_type in numeric_candidates[:15]:  # Solo primeros 15
                try:
                    cursor.execute(f"""
                        SELECT 
                            COUNT(*) FILTER (WHERE "{col_name}" > 0) as positivos,
                            MIN("{col_name}") as min_val,
                            MAX("{col_name}") as max_val,
                            AVG("{col_name}") as avg_val
                        FROM historico_fondos_gsau
                        WHERE "{col_name}" IS NOT NULL AND "{col_name}" > 0
                    """)
                    
                    stats = cursor.fetchone()
                    if stats and stats[0] > 0:
                        positivos, min_val, max_val, avg_val = stats
                        
                        # Filtrar por rangos que podrían ser años de antigüedad
                        if min_val >= 0 and max_val <= 50 and avg_val <= 15:
                            print(f"   🎯 {col_name} ({data_type}): {positivos:,} registros")
                            print(f"      Rango: {min_val} - {max_val}, Promedio: {avg_val:.4f}")
                            
                            # Mostrar muestra ordenada
                            cursor.execute(f"""
                                SELECT DISTINCT "{col_name}"
                                FROM historico_fondos_gsau 
                                WHERE "{col_name}" IS NOT NULL AND "{col_name}" > 0
                                ORDER BY "{col_name}" ASC
                                LIMIT 10
                            """)
                            
                            distinct_values = [row[0] for row in cursor.fetchall()]
                            print(f"      Valores únicos (primeros 10): {distinct_values}")
                            print()
                            
                except Exception as e:
                    continue
        
        conn.close()
        return antiguedad_candidates if antiguedad_candidates else None
        
    except Exception as e:
        print(f"❌ Error identificando columna: {e}")
        return None

if __name__ == "__main__":
    print("🎯 IDENTIFICANDO COLUMNA DE ANTIGÜEDAD EN FONDO")
    print("Para corregir el cálculo de fechas FPL")
    print()
    
    columnas_encontradas = identificar_columna_antiguedad()
    
    print(f"\n📝 INSTRUCCIONES:")
    print("1. Identifica cuál columna contiene los valores de Antigüedad en Fondo")
    print("2. Verifica que los valores sean números decimales (float)")
    print("3. Confirma el nombre exacto de la columna")
    print("4. Usaremos este nombre para corregir el endpoint")
