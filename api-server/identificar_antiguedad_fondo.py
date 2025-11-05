#!/usr/bin/env python3
"""
Script para identificar y verificar la columna "Antigüedad en Fondo" en la base de datos historico_fondos_gsau.
Este script ayuda a confirmar que los cálculos de fechas FPL están funcionando correctamente.
"""

import os
import sys
import psycopg2
from decimal import Decimal
import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def conectar_fondos_db():
    """Conectar a la base de datos de fondos."""
    try:
        conn = psycopg2.connect(
            host=os.getenv('FONDOS_DB_HOST', 'localhost'),
            database=os.getenv('FONDOS_DB_NAME', 'numerica_fondos'),
            user=os.getenv('FONDOS_DB_USER', 'postgres'),
            password=os.getenv('FONDOS_DB_PASSWORD', ''),
            port=os.getenv('FONDOS_DB_PORT', '5432')
        )
        print("✅ Conexión exitosa a la base de datos de fondos")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Error conectando a la base de datos de fondos: {e}")
        return None

def obtener_columnas_tabla(cursor):
    """Obtener todas las columnas de la tabla historico_fondos_gsau."""
    try:
        query = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'historico_fondos_gsau'
        ORDER BY ordinal_position
        """
        cursor.execute(query)
        columnas = cursor.fetchall()
        
        print(f"📋 COLUMNAS ENCONTRADAS EN historico_fondos_gsau: {len(columnas)}")
        print("="*80)
        
        for i, (nombre, tipo, nulo) in enumerate(columnas, 1):
            print(f"{i:2d}. {nombre:<30} | {tipo:<20} | Nulo: {nulo}")
        
        return [col[0] for col in columnas]
    
    except psycopg2.Error as e:
        print(f"❌ Error obteniendo columnas: {e}")
        return []

def identificar_columna_antiguedad(cursor, columnas):
    """Identificar la columna que corresponde a 'Antigüedad en Fondo'."""
    
    # Estrategia 1: Búsqueda por nombres exactos
    nombres_exactos = [
        'Antigüedad en Fondo', 'ANTIGÜEDAD EN FONDO', 'antiguedad_en_fondo',
        'AntiguedadEnFondo', 'antiguedad_fondo', 'AntiguedadFondo',
        'ant_fondo', 'Ant Fondo', 'ANT FONDO', 'Antiguedad en Fondo'
    ]
    
    print("\n🔍 ESTRATEGIA 1: Búsqueda por nombres exactos")
    print("-" * 50)
    
    for nombre_exacto in nombres_exactos:
        if nombre_exacto in columnas:
            print(f"✅ ENCONTRADA por nombre exacto: '{nombre_exacto}'")
            return nombre_exacto
        else:
            print(f"❌ No encontrada: '{nombre_exacto}'")
    
    # Estrategia 2: Búsqueda por palabras clave
    print("\n🔍 ESTRATEGIA 2: Búsqueda por palabras clave")
    print("-" * 50)
    
    candidatos_keywords = []
    for columna in columnas:
        columna_lower = columna.lower()
        if ('antiguedad' in columna_lower) or ('fondo' in columna_lower) or \
           ('ant' in columna_lower and 'fondo' in columna_lower):
            candidatos_keywords.append(columna)
            print(f"🎯 Candidato encontrado: '{columna}'")
    
    if candidatos_keywords:
        columna_seleccionada = candidatos_keywords[0]
        print(f"✅ SELECCIONADA por palabras clave: '{columna_seleccionada}'")
        return columna_seleccionada
    
    # Estrategia 3: Análisis de contenido numérico
    print("\n🔍 ESTRATEGIA 3: Análisis de contenido numérico")
    print("-" * 50)
    
    # Buscar columnas numéricas
    try:
        query_tipos = """
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'historico_fondos_gsau'
        AND data_type IN ('numeric', 'double precision', 'real', 'integer', 'smallint', 'bigint')
        AND column_name NOT IN ('numrfc')
        ORDER BY ordinal_position
        """
        cursor.execute(query_tipos)
        columnas_numericas = cursor.fetchall()
        
        print(f"📊 Columnas numéricas encontradas: {len(columnas_numericas)}")
        
        for nombre_col, tipo_col in columnas_numericas[:10]:  # Analizar máximo 10
            try:
                query_analisis = f"""
                SELECT 
                    COUNT(*) FILTER (WHERE "{nombre_col}" > 0) as positivos,
                    MIN("{nombre_col}") as min_val,
                    MAX("{nombre_col}") as max_val,
                    AVG("{nombre_col}") as avg_val,
                    COUNT(*) as total
                FROM historico_fondos_gsau
                WHERE "{nombre_col}" IS NOT NULL
                """
                
                cursor.execute(query_analisis)
                stats = cursor.fetchone()
                positivos, min_val, max_val, avg_val, total = stats
                
                # Verificar si parece datos de antigüedad (años: 0-50, promedio razonable)
                if positivos > 0 and min_val is not None and max_val is not None:
                    min_val = float(min_val) if min_val else 0
                    max_val = float(max_val) if max_val else 0
                    avg_val = float(avg_val) if avg_val else 0
                    
                    print(f"📊 {nombre_col}: pos={positivos}, rango=[{min_val:.2f}-{max_val:.2f}], avg={avg_val:.2f}")
                    
                    if min_val >= 0 and max_val <= 50 and avg_val <= 15 and positivos > 100:
                        print(f"✅ CANDIDATO FUERTE por análisis: '{nombre_col}'")
                        return nombre_col
                
            except psycopg2.Error as e:
                print(f"⚠️  Error analizando {nombre_col}: {e}")
                continue
    
    except psycopg2.Error as e:
        print(f"❌ Error en análisis numérico: {e}")
    
    print("\n❌ NO SE PUDO IDENTIFICAR automáticamente la columna de Antigüedad en Fondo")
    return None

def verificar_calculo_fechas(cursor, columna_antiguedad, rfc_ejemplo='SAHC780525'):
    """Verificar que el cálculo de fechas FPL esté funcionando correctamente."""
    
    if not columna_antiguedad:
        print("❌ No se puede verificar cálculos sin columna de antigüedad identificada")
        return
    
    print(f"\n🧮 VERIFICANDO CÁLCULOS FPL con columna: '{columna_antiguedad}'")
    print("=" * 80)
    
    try:
        # Query similar a la del endpoint, con conversión explícita
        query = f"""
        SELECT 
            fecpla,
            "{columna_antiguedad}" as antiguedad_raw,
            CAST("{columna_antiguedad}" AS NUMERIC) as antiguedad_anos,
            -- Cálculo FPL: fecpla + (antiguedad_anos * 365.25 días)
            (fecpla + INTERVAL '1 day' * (CAST(COALESCE("{columna_antiguedad}", 0) AS NUMERIC) * 365.25))::date as fecha_fpl_calculada
        FROM historico_fondos_gsau
        WHERE numrfc LIKE %s
          AND fecpla IS NOT NULL
          AND "{columna_antiguedad}" IS NOT NULL
          AND CAST("{columna_antiguedad}" AS NUMERIC) >= 0
        ORDER BY CAST("{columna_antiguedad}" AS NUMERIC) ASC, fecha_fpl_calculada DESC
        LIMIT 10
        """
        
        cursor.execute(query, (f'%{rfc_ejemplo}%',))
        resultados = cursor.fetchall()
        
        if not resultados:
            print(f"⚠️  No se encontraron datos para RFC que contenga '{rfc_ejemplo}'")
            
            # Intentar con cualquier RFC
            query_any = f"""
            SELECT 
                numrfc,
                fecpla,
                "{columna_antiguedad}" as antiguedad_raw,
                CAST("{columna_antiguedad}" AS NUMERIC) as antiguedad_anos,
                (fecpla + INTERVAL '1 day' * (CAST(COALESCE("{columna_antiguedad}", 0) AS NUMERIC) * 365.25))::date as fecha_fpl_calculada
            FROM historico_fondos_gsau
            WHERE fecpla IS NOT NULL
              AND "{columna_antiguedad}" IS NOT NULL
              AND CAST("{columna_antiguedad}" AS NUMERIC) >= 0
            ORDER BY CAST("{columna_antiguedad}" AS NUMERIC) ASC
            LIMIT 5
            """
            
            cursor.execute(query_any)
            resultados_any = cursor.fetchall()
            
            if resultados_any:
                print("\n📋 EJEMPLOS DE CÁLCULOS FPL (con cualquier RFC):")
                print(f"{'RFC':<15} {'Fecha Base':<12} {'Antigüedad':<12} {'Fecha FPL':<12} {'Diferencia'}")
                print("-" * 75)
                
                for row in resultados_any:
                    numrfc, fecpla, antiguedad_raw, antiguedad_anos, fecha_fpl = row
                    
                    # Calcular diferencia en días manualmente
                    diff_days = (fecha_fpl - fecpla).days
                    expected_days = int(float(antiguedad_anos) * 365.25)
                    
                    print(f"{numrfc:<15} {fecpla} {float(antiguedad_anos):>8.2f} años {fecha_fpl} {diff_days:>4d} días")
                    
                    # Verificar precisión del cálculo
                    if abs(diff_days - expected_days) <= 1:  # Tolerancia de 1 día
                        print(f"   ✅ Cálculo correcto: {expected_days} días esperados, {diff_days} calculados")
                    else:
                        print(f"   ❌ Error de cálculo: {expected_days} días esperados, {diff_days} calculados")
            
            return
        
        print(f"\n📋 CÁLCULOS FPL PARA RFC que contiene '{rfc_ejemplo}':")
        print(f"{'Fecha Base':<12} {'Antigüedad':<12} {'Fecha FPL':<12} {'Diferencia'}")
        print("-" * 60)
        
        fechas_calculadas = set()
        
        for row in resultados:
            fecpla, antiguedad_raw, antiguedad_anos, fecha_fpl = row
            
            # Calcular diferencia en días
            diff_days = (fecha_fpl - fecpla).days
            expected_days = int(float(antiguedad_anos) * 365.25)
            
            print(f"{fecpla} {float(antiguedad_anos):>8.2f} años {fecha_fpl} {diff_days:>4d} días")
            
            fechas_calculadas.add(fecha_fpl)
            
            # Verificar precisión del cálculo
            if abs(diff_days - expected_days) <= 1:  # Tolerancia de 1 día
                print(f"   ✅ Cálculo correcto")
            else:
                print(f"   ❌ Error: esperado {expected_days} días")
        
        print(f"\n📊 RESUMEN:")
        print(f"   Total registros analizados: {len(resultados)}")
        print(f"   Fechas FPL únicas generadas: {len(fechas_calculadas)}")
        
        if len(fechas_calculadas) > 1:
            print(f"   ✅ CORRECTO: Se generan fechas FPL diferentes según antigüedad")
        else:
            print(f"   ⚠️  POSIBLE PROBLEMA: Todas las fechas FPL son iguales")
        
    except psycopg2.Error as e:
        print(f"❌ Error verificando cálculos: {e}")

def main():
    """Función principal."""
    print("🔍 IDENTIFICADOR DE COLUMNA 'ANTIGÜEDAD EN FONDO'")
    print("=" * 80)
    
    # Conectar a la base de datos
    conn = conectar_fondos_db()
    if not conn:
        sys.exit(1)
    
    try:
        cursor = conn.cursor()
        
        # Paso 1: Obtener todas las columnas
        columnas = obtener_columnas_tabla(cursor)
        if not columnas:
            print("❌ No se pudieron obtener las columnas de la tabla")
            return
        
        # Paso 2: Identificar la columna de antigüedad
        columna_antiguedad = identificar_columna_antiguedad(cursor, columnas)
        
        if columna_antiguedad:
            print(f"\n🎯 COLUMNA IDENTIFICADA: '{columna_antiguedad}'")
        else:
            print(f"\n❓ No se pudo identificar automáticamente. Columnas disponibles:")
            for i, col in enumerate(columnas, 1):
                print(f"   {i:2d}. {col}")
            return
        
        # Paso 3: Verificar cálculos
        verificar_calculo_fechas(cursor, columna_antiguedad)
        
    finally:
        cursor.close()
        conn.close()
        print("\n🔐 Conexión cerrada")

if __name__ == "__main__":
    main()
