#!/usr/bin/env python3
"""
Script para analizar datos históricos usando cveper como campo de fecha
en GSAUDB.historico_nominas_gsau
"""

import psycopg2
from datetime import datetime
import re

def connect_to_gsaudb():
    """Conecta a GSAUDB donde están los datos históricos reales"""
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

def analyze_historico_nominas_with_cveper():
    """Analiza historico_nominas_gsau usando cveper como campo de fecha"""
    conn = connect_to_gsaudb()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        print("🔍 ANÁLISIS COMPLETO - HISTORICO_NOMINAS_GSAU")
        print("=" * 60)
        
        # 1. CONTEO TOTAL
        cursor.execute('SELECT COUNT(*) FROM historico_nominas_gsau')
        total = cursor.fetchone()[0]
        print(f"📊 TOTAL REGISTROS EN GSAUDB: {total:,}")
        
        if total == 0:
            print("❌ No hay datos en historico_nominas_gsau")
            return None
        
        # 2. VERIFICAR ESTRUCTURA DE CVEPER
        cursor.execute("""
            SELECT 
                MIN(cveper) as fecha_minima,
                MAX(cveper) as fecha_maxima,
                COUNT(DISTINCT cveper) as fechas_unicas,
                COUNT(DISTINCT "RFC") as empleados_unicos
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL;
        """)
        
        temporal_info = cursor.fetchone()
        print(f"\n📅 ANÁLISIS TEMPORAL (usando cveper):")
        print(f"   • Fecha mínima: {temporal_info[0]}")
        print(f"   • Fecha máxima: {temporal_info[1]}")
        print(f"   • Fechas únicas: {temporal_info[2]:,}")
        print(f"   • Empleados únicos: {temporal_info[3]:,}")
        
        # 3. ANÁLISIS POR AÑOS (extraer año de cveper)
        cursor.execute("""
            SELECT 
                EXTRACT(YEAR FROM cveper) as año,
                COUNT(*) as registros,
                COUNT(DISTINCT "RFC") as empleados_unicos,
                COUNT(DISTINCT cveper) as fechas_unicas
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY EXTRACT(YEAR FROM cveper)
            ORDER BY año DESC;
        """)
        
        yearly_data = cursor.fetchall()
        
        print(f"\n📈 RESUMEN POR AÑOS (basado en cveper):")
        print("-" * 50)
        
        total_years_found = 0
        years_with_data = []
        
        for año, registros, empleados, fechas in yearly_data:
            año_int = int(año) if año else 0
            print(f"✅ {año_int}: {registros:,} registros, {empleados:,} empleados, {fechas:,} fechas")
            total_years_found += 1
            years_with_data.append(año_int)
        
        # Verificar años esperados (2021-2025)
        expected_years = [2021, 2022, 2023, 2024, 2025]
        missing_years = [y for y in expected_years if y not in years_with_data]
        
        print(f"\n📊 COBERTURA TEMPORAL:")
        print(f"   • Años con datos: {years_with_data}")
        print(f"   • Años faltantes: {missing_years}")
        print(f"   • Total años encontrados: {total_years_found}/5")
        
        # 4. DISTRIBUCIÓN MENSUAL MÁS RECIENTE
        cursor.execute("""
            SELECT 
                cveper,
                "Mes",
                COUNT(*) as registros
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY cveper, "Mes"
            ORDER BY cveper DESC
            LIMIT 20;
        """)
        
        recent_periods = cursor.fetchall()
        
        print(f"\n📅 PERÍODOS MÁS RECIENTES (ordenados por cveper DESC):")
        print("-" * 60)
        for cveper, mes, registros in recent_periods:
            print(f"   {cveper} ({mes}): {registros:,} registros")
        
        # 5. CONFIGURACIÓN PARA DASHBOARD
        pages_needed = (total + 49) // 50
        
        print(f"\n🎯 CONFIGURACIÓN PARA DASHBOARD:")
        print("-" * 40)
        print(f"📊 Total registros: {total:,}")
        print(f"📄 Páginas necesarias (50 por página): {pages_needed:,}")
        print(f"📱 Registros en última página: {total % 50 if total % 50 > 0 else 50}")
        
        # 6. QUERY OPTIMIZADA PARA BACKEND
        print(f"\n💻 QUERY PARA BACKEND (ordenado por cveper DESC):")
        print("""
        SELECT 
            "RFC",
            "Nombre completo",
            "Puesto", 
            "Compañía",
            cveper as "Periodo",  -- Remapeado desde cveper
            "Mes",
            "SD",
            "SDI",
            "SUELDO CLIENTE",
            "TOTAL DE PERCEPCIONES",
            "TOTAL DEDUCCIONES",
            "NETO A PAGAR"
        FROM historico_nominas_gsau
        ORDER BY cveper DESC
        LIMIT 50 OFFSET (página_número - 1) * 50;
        """)
        
        # 7. VERIFICAR EMPRESAS GSAU
        cursor.execute("""
            SELECT 
                "Compañía",
                COUNT(*) as registros,
                COUNT(DISTINCT "RFC") as empleados
            FROM historico_nominas_gsau
            WHERE "Compañía" IS NOT NULL
            GROUP BY "Compañía"
            ORDER BY registros DESC;
        """)
        
        companies = cursor.fetchall()
        
        print(f"\n🏢 EMPRESAS EN HISTORICO_NOMINAS_GSAU:")
        for empresa, registros, empleados in companies:
            print(f"   • {empresa}: {registros:,} registros, {empleados:,} empleados")
        
        return {
            'total_records': total,
            'years_found': total_years_found,
            'years_with_data': years_with_data,
            'missing_years': missing_years,
            'pages_needed': pages_needed,
            'recent_periods': recent_periods,
            'companies': companies
        }
        
    except Exception as e:
        print(f"❌ Error en análisis: {e}")
        return None
    finally:
        conn.close()

def main():
    print("🚀 ANÁLISIS USANDO CVEPER COMO CAMPO DE FECHA")
    print("=" * 60)
    print(f"🎯 Analizando historico_nominas_gsau con cveper para 2021-2025")
    
    result = analyze_historico_nominas_with_cveper()
    
    if result:
        print(f"\n✅ ANÁLISIS COMPLETADO CON CVEPER")
        print(f"📊 REGISTROS TOTALES: {result['total_records']:,}")
        print(f"📅 AÑOS CON DATOS: {result['years_found']}")
        print(f"📄 PÁGINAS NECESARIAS: {result['pages_needed']:,}")
        
        # RESPUESTA FINAL
        print(f"\n🎯 RESPUESTAS FINALES:")
        print(f"❓ ¿Cuántos registros en AWS? → {result['total_records']:,} registros")
        print(f"❓ ¿Datos 2021-2025? → Años disponibles: {result['years_with_data']}")
        print(f"❓ ¿Años faltantes? → {result['missing_years']}")
        print(f"❓ ¿Paginación 50? → Sí, {result['pages_needed']:,} páginas")
        print(f"❓ ¿Ordenado por fecha reciente? → Sí, usando cveper DESC")
        print(f"❓ ¿Campo Periodo? → Remapeado a cveper")
        
        if len(result['years_with_data']) < 5:
            print(f"\n⚠️  CONCLUSIÓN: Solo tienes {len(result['years_with_data'])} de 5 años solicitados")
            print(f"📝 Necesitarás cargar datos históricos para: {result['missing_years']}")
        else:
            print(f"\n✅ CONCLUSIÓN: Tienes datos completos para 2021-2025")
    else:
        print(f"❌ No se pudo completar el análisis")

if __name__ == "__main__":
    main()
