#!/usr/bin/env python3
"""
Script completo para analizar y migrar datos históricos entre postgres y GSAUDB
"""

import psycopg2
from datetime import datetime
import json

def connect_to_database(database_name):
    """Conecta a la base de datos especificada"""
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

def analyze_postgres_data():
    """Analiza los datos en postgres.payroll_data"""
    print("🔍 ANÁLISIS DE DATOS EN POSTGRES")
    print("=" * 50)
    
    conn = connect_to_database("postgres")
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        # 1. Análisis temporal
        cursor.execute("""
            SELECT 
                MIN(mes) as primer_mes,
                MAX(mes) as ultimo_mes,
                COUNT(DISTINCT mes) as meses_unicos,
                COUNT(*) as total_registros,
                COUNT(DISTINCT rfc) as empleados_unicos
            FROM payroll_data;
        """)
        
        temporal_info = cursor.fetchone()
        print(f"📅 Rango temporal: {temporal_info[0]} a {temporal_info[1]}")
        print(f"📊 Meses únicos: {temporal_info[2]}")
        print(f"📊 Total registros: {temporal_info[3]:,}")
        print(f"👥 Empleados únicos: {temporal_info[4]:,}")
        
        # 2. Distribución mensual
        cursor.execute("""
            SELECT 
                mes,
                COUNT(*) as registros,
                COUNT(DISTINCT rfc) as empleados
            FROM payroll_data 
            GROUP BY mes 
            ORDER BY mes;
        """)
        
        monthly_data = cursor.fetchall()
        print(f"\n📊 DISTRIBUCIÓN MENSUAL:")
        for mes, registros, empleados in monthly_data:
            print(f"  {mes}: {registros:,} registros, {empleados:,} empleados")
        
        # 3. Análisis de empresas
        cursor.execute("""
            SELECT 
                empresa,
                COUNT(*) as registros,
                COUNT(DISTINCT rfc) as empleados
            FROM payroll_data 
            WHERE empresa IS NOT NULL
            GROUP BY empresa 
            ORDER BY registros DESC 
            LIMIT 10;
        """)
        
        companies = cursor.fetchall()
        print(f"\n🏢 TOP 10 EMPRESAS:")
        for empresa, registros, empleados in companies:
            print(f"  {empresa}: {registros:,} registros, {empleados:,} empleados")
        
        # 4. Verificar datos GSAU
        cursor.execute("""
            SELECT COUNT(*) as gsau_records
            FROM payroll_data 
            WHERE UPPER(empresa) LIKE '%GSAU%';
        """)
        
        gsau_count = cursor.fetchone()[0]
        print(f"\n🎯 Registros GSAU específicos: {gsau_count:,}")
        
        return {
            'total_records': temporal_info[3],
            'unique_employees': temporal_info[4],
            'unique_months': temporal_info[2],
            'gsau_records': gsau_count,
            'date_range': f"{temporal_info[0]} a {temporal_info[1]}",
            'monthly_data': monthly_data,
            'companies': companies
        }
        
    finally:
        conn.close()

def analyze_gsaudb_data():
    """Analiza los datos en GSAUDB"""
    print("\n🔍 ANÁLISIS DE DATOS EN GSAUDB")
    print("=" * 50)
    
    conn = connect_to_database("GSAUDB")
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        # Analizar historico_nominas_gsau
        cursor.execute("SELECT COUNT(*) FROM historico_nominas_gsau")
        nominas_count = cursor.fetchone()[0]
        print(f"📊 historico_nominas_gsau: {nominas_count:,} registros")
        
        if nominas_count > 0:
            # Analizar estructura y contenido
            cursor.execute("""
                SELECT 
                    MIN("Mes") as primer_mes,
                    MAX("Mes") as ultimo_mes,
                    COUNT(DISTINCT "Mes") as meses_unicos,
                    COUNT(DISTINCT "RFC") as empleados_unicos
                FROM historico_nominas_gsau;
            """)
            
            info = cursor.fetchone()
            print(f"📅 Rango temporal: {info[0]} a {info[1]}")
            print(f"📊 Meses únicos: {info[2]}")
            print(f"👥 Empleados únicos: {info[3]:,}")
            
            # Muestra de distribución mensual
            cursor.execute("""
                SELECT 
                    "Mes",
                    COUNT(*) as registros
                FROM historico_nominas_gsau 
                GROUP BY "Mes" 
                ORDER BY "Mes" 
                LIMIT 10;
            """)
            
            monthly_gsau = cursor.fetchall()
            print(f"\n📊 DISTRIBUCIÓN MENSUAL EN GSAUDB:")
            for mes, registros in monthly_gsau:
                print(f"  {mes}: {registros:,} registros")
        
        # Analizar otras tablas
        cursor.execute("SELECT COUNT(*) FROM historico_fondos_gsau")
        fondos_count = cursor.fetchone()[0]
        print(f"\n📊 historico_fondos_gsau: {fondos_count:,} registros")
        
        cursor.execute("SELECT COUNT(*) FROM vista_unificada")
        vista_count = cursor.fetchone()[0]
        print(f"📊 vista_unificada: {vista_count:,} registros")
        
        return {
            'nominas_count': nominas_count,
            'fondos_count': fondos_count,
            'vista_count': vista_count
        }
        
    finally:
        conn.close()

def create_migration_script():
    """Crea script de migración desde postgres a GSAUDB"""
    print("\n💡 GENERANDO SCRIPT DE MIGRACIÓN")
    print("=" * 50)
    
    migration_sql = """
-- Script de migración de datos desde postgres.payroll_data a GSAUDB.historico_nominas_gsau
-- Generado automáticamente el {}

-- 1. Limpiar tabla destino (opcional)
-- TRUNCATE TABLE historico_nominas_gsau;

-- 2. Insertar datos desde postgres (requiere dblink o conexión externa)
-- Esta query asume que tienes acceso a ambas bases de datos desde GSAUDB

INSERT INTO historico_nominas_gsau (
    "RFC",
    "Nombre completo", 
    "Puesto",
    "Compañía",
    "CURP",
    "Mes",
    "SD",
    "SDI", 
    "SUELDO CLIENTE",
    "COMISIONES CLIENTE",
    "TOTAL DE PERCEPCIONES",
    "TOTAL DEDUCCIONES",
    "NETO ANTES DE VALES",
    "NETO A PAGAR",
    "PTU"
)
SELECT 
    rfc as "RFC",
    nombreCompleto as "Nombre completo",
    puesto as "Puesto", 
    empresa as "Compañía",
    curp as "CURP",
    mes as "Mes",
    CAST(sd AS numeric(10,2)) as "SD",
    CAST(sdi AS numeric(10,2)) as "SDI",
    CAST(sueldoCliente AS numeric(10,2)) as "SUELDO CLIENTE",
    CAST(comisionesCliente AS numeric(10,2)) as "COMISIONES CLIENTE", 
    CAST(totalPercepciones AS numeric(10,2)) as "TOTAL DE PERCEPCIONES",
    CAST(totalDeducciones AS numeric(10,2)) as "TOTAL DEDUCCIONES",
    CAST(netoAntesVales AS numeric(10,2)) as "NETO ANTES DE VALES",
    CAST(netoDespuesVales AS numeric(10,2)) as "NETO A PAGAR",
    CAST(ptu AS numeric(10,2)) as "PTU"
FROM postgres.payroll_data
WHERE rfc IS NOT NULL 
    AND nombreCompleto IS NOT NULL;

-- 3. Verificar migración
SELECT COUNT(*) as registros_migrados FROM historico_nominas_gsau;

-- 4. Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_historico_nominas_rfc ON historico_nominas_gsau("RFC");
CREATE INDEX IF NOT EXISTS idx_historico_nominas_mes ON historico_nominas_gsau("Mes");
CREATE INDEX IF NOT EXISTS idx_historico_nominas_empresa ON historico_nominas_gsau("Compañía");
""".format(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    # Guardar script
    script_path = "C:\\Users\\alber\\Autonumerica\\Numerica\\scripts\\migration_script.sql"
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(migration_sql)
    
    print(f"✅ Script de migración guardado en: {script_path}")
    return script_path

def generate_recommendations(postgres_data, gsaudb_data):
    """Genera recomendaciones basadas en el análisis"""
    print("\n🎯 RECOMENDACIONES FINALES")
    print("=" * 50)
    
    recommendations = []
    
    # Análisis de cobertura temporal
    if postgres_data and postgres_data.get('unique_months', 0) == 12:
        print("✅ COBERTURA TEMPORAL: postgres.payroll_data tiene 12 meses de datos (2024 completo)")
        recommendations.append("Los datos cubren un año completo, ideal para análisis anual")
    else:
        print("⚠️  COBERTURA TEMPORAL: Datos incompletos o fragmentados")
        recommendations.append("Considerar completar datos faltantes")
    
    # Análisis de volumen
    if postgres_data and postgres_data.get('total_records', 0) > 40000:
        print("✅ VOLUMEN DE DATOS: Suficientes registros para análisis estadístico")
        print(f"   - {postgres_data.get('total_records', 0):,} registros totales")
        print(f"   - {postgres_data.get('unique_employees', 0):,} empleados únicos")
        recommendations.append("Volumen de datos adecuado para reportes y análisis")
    
    # Comparación entre bases de datos
    postgres_records = postgres_data.get('total_records', 0) if postgres_data else 0
    gsaudb_records = gsaudb_data.get('nominas_count', 0) if gsaudb_data else 0
    
    print(f"\n📊 COMPARACIÓN DE DATOS:")
    print(f"   - postgres.payroll_data: {postgres_records:,} registros")
    print(f"   - GSAUDB.historico_nominas_gsau: {gsaudb_records:,} registros")
    
    if postgres_records > gsaudb_records * 10:
        print("🚀 RECOMENDACIÓN: Migrar datos de postgres a GSAUDB")
        recommendations.append("postgres tiene significativamente más datos - migrar a GSAUDB")
    elif gsaudb_records > 0:
        print("🔄 RECOMENDACIÓN: Evaluar cuál base usar como principal")
        recommendations.append("Ambas bases tienen datos - definir fuente única de verdad")
    else:
        print("📝 RECOMENDACIÓN: Usar postgres.payroll_data como fuente principal")
        recommendations.append("GSAUDB está vacío - mantener postgres como fuente principal")
    
    # Recomendaciones específicas para backend
    print(f"\n🛠️  RECOMENDACIONES TÉCNICAS:")
    
    if postgres_records > 0:
        print("✅ Configurar backend para usar postgres.payroll_data")
        print("✅ Implementar cache para consultas frecuentes")
        print("✅ Crear índices para campos de filtrado comunes (mes, empresa, rfc)")
        recommendations.extend([
            "Actualizar endpoints del API para usar postgres.payroll_data",
            "Implementar paginación para manejar 51k registros",
            "Crear índices en campos de búsqueda frecuente"
        ])
    
    if postgres_records > 0 and gsaudb_records < postgres_records:
        print("🔄 Considerar migración periódica o sincronización entre bases")
        recommendations.append("Establecer proceso de sincronización de datos")
    
    return recommendations

def main():
    print("🚀 ANÁLISIS FINAL DE DATOS HISTÓRICOS")
    print("=" * 60)
    print(f"⏰ Ejecutado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Analizar postgres
        postgres_data = analyze_postgres_data()
        
        # Analizar GSAUDB
        gsaudb_data = analyze_gsaudb_data()
        
        # Crear script de migración
        migration_script = create_migration_script()
        
        # Generar recomendaciones
        recommendations = generate_recommendations(postgres_data, gsaudb_data)
        
        # Crear informe final
        report = {
            'timestamp': datetime.now().isoformat(),
            'postgres_analysis': postgres_data,
            'gsaudb_analysis': gsaudb_data,
            'migration_script': migration_script,
            'recommendations': recommendations
        }
        
        # Guardar informe
        report_path = "C:\\Users\\alber\\Autonumerica\\Numerica\\FINAL_DATA_ANALYSIS_REPORT.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"\n📋 INFORME COMPLETO guardado en: {report_path}")
        
        # Resumen ejecutivo
        print(f"\n🎯 RESUMEN EJECUTIVO FINAL:")
        print(f"{'='*50}")
        if postgres_data and postgres_data.get('total_records', 0) > 0:
            print(f"✅ DATOS ENCONTRADOS: {postgres_data['total_records']:,} registros en postgres")
            print(f"   - Período: {postgres_data.get('date_range', 'N/A')}")
            print(f"   - Empleados únicos: {postgres_data.get('unique_employees', 0):,}")
            print(f"   - Registros GSAU: {postgres_data.get('gsau_records', 0):,}")
            
            print(f"\n💡 ACCIÓN RECOMENDADA:")
            if postgres_data.get('gsau_records', 0) > 0:
                print(f"   🚀 MIGRAR datos GSAU específicos a GSAUDB")
            else:
                print(f"   🔄 CONFIGURAR backend para usar postgres directamente")
        else:
            print(f"❌ NO SE ENCONTRARON DATOS SUFICIENTES")
            print(f"   📝 Verificar carga de datos o ubicación alternativa")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en análisis final: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
