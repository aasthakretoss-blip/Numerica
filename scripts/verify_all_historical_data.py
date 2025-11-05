#!/usr/bin/env python3
"""
Script para verificar TODOS los registros históricos (2021-2025) en AWS
Sin migraciones - solo verificación y conteo completo
"""

import psycopg2
from datetime import datetime
import re

def connect_to_database(database_name):
    """Conecta a la base de datos especificada en AWS"""
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database=database_name,
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        return connection
    except Exception as e:
        print(f"❌ Error conectando a {database_name}: {e}")
        return None

def extract_year_from_month(mes_text):
    """Extrae el año del formato del mes (ej: 24_ENERO -> 2024)"""
    if not mes_text:
        return None
    
    # Buscar patrón de año al inicio
    year_match = re.match(r'(\d{2})_', mes_text)
    if year_match:
        year_prefix = year_match.group(1)
        return 2000 + int(year_prefix)  # 24 -> 2024, 21 -> 2021, etc.
    
    return None

def analyze_complete_data():
    """Analiza TODOS los datos disponibles en ambas bases de datos"""
    print("🔍 VERIFICACIÓN COMPLETA DE DATOS HISTÓRICOS 2021-2025")
    print("=" * 70)
    
    total_records_found = 0
    databases_analyzed = []
    
    # Analizar ambas bases de datos
    for db_name in ['postgres', 'GSAUDB']:
        print(f"\n📋 ANALIZANDO BASE DE DATOS: {db_name}")
        print("=" * 50)
        
        conn = connect_to_database(db_name)
        if not conn:
            continue
        
        try:
            cursor = conn.cursor()
            
            # Buscar todas las tablas con datos de nómina
            cursor.execute("""
                SELECT 
                    t.table_name,
                    (SELECT COUNT(*) 
                     FROM information_schema.columns 
                     WHERE table_name = t.table_name AND table_schema = 'public') as column_count
                FROM information_schema.tables t
                WHERE t.table_schema = 'public' 
                AND t.table_type = 'BASE TABLE'
                AND (
                    LOWER(t.table_name) LIKE '%payroll%' OR
                    LOWER(t.table_name) LIKE '%nomina%' OR
                    LOWER(t.table_name) LIKE '%historico%'
                )
                ORDER BY t.table_name;
            """)
            
            relevant_tables = cursor.fetchall()
            
            if not relevant_tables:
                print(f"❌ No se encontraron tablas de nómina en {db_name}")
                continue
            
            db_total = 0
            
            for table_name, column_count in relevant_tables:
                # Contar registros en cada tabla
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                table_count = cursor.fetchone()[0]
                
                print(f"📊 {table_name}: {table_count:,} registros ({column_count} columnas)")
                
                if table_count > 0:
                    db_total += table_count
                    
                    # Análisis temporal si la tabla tiene datos
                    # Buscar campo de mes/fecha
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '{table_name}' 
                        AND (
                            LOWER(column_name) LIKE '%mes%' OR
                            LOWER(column_name) LIKE '%month%' OR
                            LOWER(column_name) LIKE '%fecha%' OR
                            LOWER(column_name) LIKE '%date%'
                        )
                        LIMIT 1;
                    """)
                    
                    date_column = cursor.fetchone()
                    
                    if date_column:
                        date_field = date_column[0]
                        
                        # Obtener rango temporal
                        cursor.execute(f"""
                            SELECT 
                                MIN({date_field}) as primer_periodo,
                                MAX({date_field}) as ultimo_periodo,
                                COUNT(DISTINCT {date_field}) as periodos_unicos
                            FROM {table_name}
                            WHERE {date_field} IS NOT NULL;
                        """)
                        
                        temporal_info = cursor.fetchone()
                        
                        print(f"   📅 Rango: {temporal_info[0]} a {temporal_info[1]}")
                        print(f"   📊 Períodos únicos: {temporal_info[2]}")
                        
                        # Análisis por año
                        cursor.execute(f"""
                            SELECT 
                                {date_field},
                                COUNT(*) as registros
                            FROM {table_name}
                            WHERE {date_field} IS NOT NULL
                            GROUP BY {date_field}
                            ORDER BY {date_field};
                        """)
                        
                        period_data = cursor.fetchall()
                        
                        # Agrupar por años
                        years_data = {}
                        for period, count in period_data:
                            year = extract_year_from_month(str(period))
                            if year:
                                if year not in years_data:
                                    years_data[year] = 0
                                years_data[year] += count
                        
                        print(f"   📈 Distribución por año:")
                        for year in sorted(years_data.keys()):
                            print(f"      {year}: {years_data[year]:,} registros")
                        
                        # Verificar si tenemos datos de 2021-2025
                        expected_years = [2021, 2022, 2023, 2024, 2025]
                        available_years = list(years_data.keys())
                        
                        print(f"   🎯 Años disponibles: {sorted(available_years)}")
                        missing_years = [y for y in expected_years if y not in available_years]
                        if missing_years:
                            print(f"   ⚠️  Años faltantes: {missing_years}")
                        else:
                            print(f"   ✅ COMPLETO: Datos para 2021-2025")
            
            print(f"\n📊 TOTAL EN {db_name}: {db_total:,} registros")
            total_records_found += db_total
            
            databases_analyzed.append({
                'name': db_name,
                'total_records': db_total,
                'tables': relevant_tables
            })
            
        except Exception as e:
            print(f"❌ Error analizando {db_name}: {e}")
        finally:
            conn.close()
    
    return total_records_found, databases_analyzed

def verify_data_for_dashboard():
    """Verifica los datos específicamente para el dashboard con paginación de 50"""
    print(f"\n🎯 VERIFICACIÓN PARA DASHBOARD")
    print("=" * 50)
    
    # Primero verificar en postgres (base principal)
    conn = connect_to_database("postgres")
    if not conn:
        print("❌ No se pudo conectar a postgres")
        return None
    
    try:
        cursor = conn.cursor()
        
        # Verificar estructura para dashboard
        cursor.execute("""
            SELECT COUNT(*) as total_records
            FROM payroll_data;
        """)
        
        total = cursor.fetchone()[0]
        pages_needed = (total + 49) // 50  # Redondear hacia arriba
        
        print(f"📊 Total registros en postgres.payroll_data: {total:,}")
        print(f"📄 Páginas necesarias (50 por página): {pages_needed:,}")
        print(f"📈 Última página tendría: {total % 50 if total % 50 > 0 else 50} registros")
        
        # Verificar ordenamiento por fecha
        cursor.execute("""
            SELECT 
                mes,
                COUNT(*) as registros
            FROM payroll_data
            GROUP BY mes
            ORDER BY mes DESC  -- Más reciente primero
            LIMIT 10;
        """)
        
        recent_months = cursor.fetchall()
        print(f"\n📅 MESES MÁS RECIENTES (para ordenamiento):")
        for mes, registros in recent_months:
            print(f"   {mes}: {registros:,} registros")
        
        # Verificar campos disponibles para filtrado
        cursor.execute("""
            SELECT DISTINCT empresa
            FROM payroll_data
            WHERE empresa IS NOT NULL
            ORDER BY empresa
            LIMIT 20;
        """)
        
        companies = cursor.fetchall()
        print(f"\n🏢 EMPRESAS DISPONIBLES PARA FILTRAR:")
        for (empresa,) in companies:
            print(f"   • {empresa}")
        
        return {
            'total_records': total,
            'pages_needed': pages_needed,
            'recent_months': recent_months,
            'companies': [c[0] for c in companies]
        }
        
    finally:
        conn.close()

def verify_gsaudb_specifically():
    """Verifica específicamente GSAUDB para datos históricos completos"""
    print(f"\n🎯 VERIFICACIÓN ESPECÍFICA DE GSAUDB")
    print("=" * 50)
    
    conn = connect_to_database("GSAUDB")
    if not conn:
        print("❌ No se pudo conectar a GSAUDB")
        return None
    
    try:
        cursor = conn.cursor()
        
        # Verificar historico_nominas_gsau
        cursor.execute('SELECT COUNT(*) FROM historico_nominas_gsau')
        nominas_count = cursor.fetchone()[0]
        
        print(f"📊 historico_nominas_gsau: {nominas_count:,} registros")
        
        if nominas_count > 0:
            # Análisis temporal en GSAUDB
            cursor.execute("""
                SELECT 
                    MIN("Mes") as primer_mes,
                    MAX("Mes") as ultimo_mes,
                    COUNT(DISTINCT "Mes") as meses_unicos,
                    COUNT(DISTINCT "RFC") as empleados_unicos
                FROM historico_nominas_gsau;
            """)
            
            info = cursor.fetchone()
            print(f"📅 Rango: {info[0]} a {info[1]}")
            print(f"📊 Meses únicos: {info[2]}")
            print(f"👥 Empleados únicos: {info[3]:,}")
            
            # Verificar distribución por año en GSAUDB
            cursor.execute("""
                SELECT 
                    "Mes",
                    COUNT(*) as registros
                FROM historico_nominas_gsau
                GROUP BY "Mes"
                ORDER BY "Mes" DESC;
            """)
            
            gsaudb_months = cursor.fetchall()
            print(f"\n📅 DISTRIBUCIÓN POR MES EN GSAUDB:")
            
            years_in_gsaudb = {}
            for mes, registros in gsaudb_months:
                year = extract_year_from_month(str(mes))
                if year:
                    if year not in years_in_gsaudb:
                        years_in_gsaudb[year] = 0
                    years_in_gsaudb[year] += registros
                print(f"   {mes}: {registros:,} registros")
            
            print(f"\n📈 RESUMEN POR AÑO EN GSAUDB:")
            for year in sorted(years_in_gsaudb.keys(), reverse=True):
                print(f"   {year}: {years_in_gsaudb[year]:,} registros")
        
        return nominas_count
        
    finally:
        conn.close()

def main():
    print("🚀 VERIFICACIÓN COMPLETA DE DATOS AWS (2021-2025)")
    print("=" * 70)
    print(f"⏰ Ejecutado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 Objetivo: Verificar datos para dashboard con paginación de 50")
    
    # 1. Análisis completo de todas las bases
    total_records, databases = analyze_complete_data()
    
    # 2. Verificación específica para dashboard
    dashboard_data = verify_data_for_dashboard()
    
    # 3. Verificación específica de GSAUDB
    gsaudb_records = verify_gsaudb_specifically()
    
    # 4. RESUMEN FINAL
    print(f"\n🎯 RESUMEN FINAL - DATOS TOTALES EN AWS")
    print("=" * 60)
    
    print(f"📊 TOTAL GENERAL EN AWS: {total_records:,} registros")
    
    for db_info in databases:
        print(f"   • {db_info['name']}: {db_info['total_records']:,} registros")
    
    if dashboard_data:
        print(f"\n📱 CONFIGURACIÓN PARA DASHBOARD:")
        print(f"   • Total registros: {dashboard_data['total_records']:,}")
        print(f"   • Páginas (50 por página): {dashboard_data['pages_needed']:,}")
        print(f"   • Registros en última página: {dashboard_data['total_records'] % 50 if dashboard_data['total_records'] % 50 > 0 else 50}")
    
    # Verificar cobertura temporal
    print(f"\n📅 COBERTURA TEMPORAL:")
    if total_records >= 100000:  # Si hay muchos registros, probablemente sean 4+ años
        print(f"   ✅ PROBABLE: Datos para múltiples años (2021-2025)")
    elif total_records >= 50000:
        print(f"   ⚠️  PARCIAL: Posiblemente 2-3 años de datos")
    else:
        print(f"   ❌ LIMITADO: Probablemente solo 1 año de datos")
    
    print(f"\n🎯 RECOMENDACIÓN PARA BACKEND:")
    if dashboard_data and dashboard_data['total_records'] > 0:
        print(f"   ✅ Implementar paginación de 50 registros")
        print(f"   ✅ Ordenar por fecha más reciente (DESC)")
        print(f"   ✅ Total páginas a manejar: {dashboard_data['pages_needed']:,}")
        print(f"   ✅ Usar postgres.payroll_data como fuente principal")
    else:
        print(f"   ❌ No se encontraron datos suficientes para el dashboard")
    
    return total_records

if __name__ == "__main__":
    total = main()
    print(f"\n✅ VERIFICACIÓN COMPLETA FINALIZADA")
    print(f"📊 REGISTROS TOTALES EN AWS: {total:,}")
    exit(0)
