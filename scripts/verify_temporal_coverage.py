#!/usr/bin/env python3
"""
Script para verificar cobertura temporal 2021-2025 y configurar dashboard
"""

import psycopg2
import re
from datetime import datetime

def connect_to_postgres():
    """Conecta a postgres (base principal)"""
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="postgres",
            user="postgres", 
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        return connection
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def extract_year_from_month(mes_text):
    """Extrae año del formato YY_MES"""
    if not mes_text:
        return None
    
    # Buscar patrón 21_, 22_, 23_, 24_, 25_
    year_match = re.match(r'(\d{2})_', str(mes_text))
    if year_match:
        year_prefix = int(year_match.group(1))
        if year_prefix >= 21 and year_prefix <= 25:
            return 2000 + year_prefix
    return None

def analyze_temporal_coverage():
    """Analiza cobertura temporal completa"""
    conn = connect_to_postgres()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        print("🔍 ANÁLISIS TEMPORAL COMPLETO - REGISTROS AWS")
        print("=" * 60)
        
        # 1. CONTEO TOTAL
        cursor.execute("SELECT COUNT(*) FROM payroll_data")
        total = cursor.fetchone()[0]
        print(f"📊 TOTAL REGISTROS EN AWS: {total:,}")
        
        # 2. ANÁLISIS POR AÑOS
        cursor.execute("""
            SELECT 
                mes,
                COUNT(*) as registros,
                COUNT(DISTINCT rfc) as empleados_unicos
            FROM payroll_data 
            GROUP BY mes 
            ORDER BY mes;
        """)
        
        monthly_data = cursor.fetchall()
        
        # Agrupar por años
        years_summary = {}
        all_months_detail = []
        
        for mes, registros, empleados in monthly_data:
            year = extract_year_from_month(mes)
            
            if year:
                if year not in years_summary:
                    years_summary[year] = {'registros': 0, 'meses': 0, 'empleados_max': 0}
                
                years_summary[year]['registros'] += registros
                years_summary[year]['meses'] += 1
                years_summary[year]['empleados_max'] = max(years_summary[year]['empleados_max'], empleados)
            
            all_months_detail.append((mes, registros, empleados, year))
        
        # 3. MOSTRAR RESUMEN POR AÑOS
        print(f"\n📈 RESUMEN POR AÑOS (2021-2025):")
        print("-" * 50)
        
        expected_years = [2021, 2022, 2023, 2024, 2025]
        total_years_found = 0
        
        for year in expected_years:
            if year in years_summary:
                data = years_summary[year]
                print(f"✅ {year}: {data['registros']:,} registros, {data['meses']} meses, ~{data['empleados_max']:,} empleados")
                total_years_found += 1
            else:
                print(f"❌ {year}: 0 registros (SIN DATOS)")
        
        print(f"\n📊 AÑOS CON DATOS: {total_years_found}/5 años esperados")
        
        # 4. DETALLE MENSUAL ORDENADO (MÁS RECIENTE PRIMERO)
        print(f"\n📅 DETALLE MENSUAL (ORDENADO POR FECHA MÁS RECIENTE):")
        print("-" * 60)
        
        # Ordenar por año descendente y mes
        sorted_months = sorted(all_months_detail, key=lambda x: (x[3] or 0, x[0]), reverse=True)
        
        for mes, registros, empleados, year in sorted_months[:20]:  # Mostrar solo top 20
            year_str = f" ({year})" if year else ""
            print(f"   {mes}{year_str}: {registros:,} registros, {empleados:,} empleados")
        
        # 5. CONFIGURACIÓN PARA PAGINACIÓN
        print(f"\n🎯 CONFIGURACIÓN PARA DASHBOARD:")
        print("-" * 40)
        
        pages_total = (total + 49) // 50
        print(f"📊 Total registros: {total:,}")
        print(f"📄 Total páginas (50 por página): {pages_total:,}")
        print(f"📱 Registros en última página: {total % 50 if total % 50 > 0 else 50}")
        
        # Query para ordenamiento por fecha más reciente
        print(f"\n💻 QUERY RECOMENDADA PARA BACKEND:")
        print("""
        SELECT * FROM payroll_data 
        ORDER BY 
            CASE 
                WHEN mes LIKE '25_%' THEN 1
                WHEN mes LIKE '24_%' THEN 2  
                WHEN mes LIKE '23_%' THEN 3
                WHEN mes LIKE '22_%' THEN 4
                WHEN mes LIKE '21_%' THEN 5
                ELSE 6
            END,
            mes DESC
        LIMIT 50 OFFSET (página_número - 1) * 50;
        """)
        
        return {
            'total_records': total,
            'years_summary': years_summary,
            'years_found': total_years_found,
            'pages_needed': pages_total,
            'months_detail': sorted_months
        }
        
    finally:
        conn.close()

def main():
    print("🚀 VERIFICACIÓN TEMPORAL Y PAGINACIÓN AWS")
    print("=" * 60)
    print(f"🎯 Buscando datos 2021-2025 para dashboard con paginación de 50")
    
    result = analyze_temporal_coverage()
    
    if result:
        print(f"\n✅ VERIFICACIÓN COMPLETADA")
        print(f"📊 REGISTROS TOTALES: {result['total_records']:,}")
        print(f"📅 AÑOS CON DATOS: {result['years_found']}/5 años")
        print(f"📄 PÁGINAS NECESARIAS: {result['pages_needed']:,}")
        
        # RESPUESTA DIRECTA A TUS PREGUNTAS
        print(f"\n🎯 RESPUESTAS A TUS PREGUNTAS:")
        print(f"❓ ¿Cuántos registros tienes en AWS? → {result['total_records']:,} registros")
        print(f"❓ ¿Tienes datos 2021-2025? → {result['years_found']}/5 años disponibles")
        print(f"❓ ¿Paginación de 50? → Sí, {result['pages_needed']:,} páginas totales")
        print(f"❓ ¿Ordenado por fecha reciente? → Sí, query preparada")
        
        if result['years_found'] < 5:
            print(f"\n⚠️  IMPORTANTE: Solo tienes datos para {result['years_found']} años, no los 5 años completos (2021-2025)")
            print(f"📝 Los datos disponibles parecen ser principalmente de 2024")
    else:
        print(f"❌ No se pudo completar la verificación")

if __name__ == "__main__":
    main()
