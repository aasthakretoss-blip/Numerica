#!/usr/bin/env python3
"""
Script para analizar los datos históricos existentes en payroll_data
y determinar si contienen la información completa para 4 años.
"""

import os
import sys
import psycopg2
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import json

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

def analyze_payroll_data(conn):
    """Analiza los datos históricos en payroll_data"""
    print("🔍 ANÁLISIS DE DATOS HISTÓRICOS EN PAYROLL_DATA")
    print("=" * 60)
    
    cursor = conn.cursor()
    
    # 1. Análisis temporal de los datos
    print("\n📅 1. ANÁLISIS TEMPORAL")
    print("-" * 30)
    
    # Consultar rango de fechas disponibles
    cursor.execute("""
        SELECT 
            MIN(mes) as primer_mes,
            MAX(mes) as ultimo_mes,
            COUNT(DISTINCT mes) as meses_unicos,
            COUNT(*) as total_registros
        FROM payroll_data;
    """)
    temporal_info = cursor.fetchone()
    
    print(f"📊 Primer mes: {temporal_info[0]}")
    print(f"📊 Último mes: {temporal_info[1]}")
    print(f"📊 Meses únicos: {temporal_info[2]}")
    print(f"📊 Total registros: {temporal_info[3]:,}")
    
    # 2. Distribución por mes
    print("\n📊 2. DISTRIBUCIÓN POR MES")
    print("-" * 30)
    
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
    
    for mes, registros, empleados in monthly_data:
        print(f"📅 {mes}: {registros:,} registros, {empleados:,} empleados únicos")
    
    # 3. Análisis de empleados únicos por período
    print("\n👥 3. ANÁLISIS DE EMPLEADOS")
    print("-" * 30)
    
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT rfc) as total_empleados_unicos,
            AVG(empleados_por_mes) as promedio_empleados_mes
        FROM (
            SELECT 
                mes,
                COUNT(DISTINCT rfc) as empleados_por_mes
            FROM payroll_data 
            GROUP BY mes
        ) subquery;
    """)
    
    emp_info = cursor.fetchone()
    print(f"👨‍💼 Total empleados únicos: {emp_info[0]:,}")
    print(f"📊 Promedio empleados/mes: {emp_info[1]:.0f}")
    
    # 4. Análisis de empresas/compañías
    print("\n🏢 4. ANÁLISIS DE EMPRESAS")
    print("-" * 30)
    
    cursor.execute("""
        SELECT 
            empresa,
            COUNT(*) as registros,
            COUNT(DISTINCT rfc) as empleados_unicos
        FROM payroll_data 
        WHERE empresa IS NOT NULL
        GROUP BY empresa 
        ORDER BY registros DESC
        LIMIT 10;
    """)
    
    companies = cursor.fetchall()
    for empresa, registros, empleados in companies:
        print(f"🏢 {empresa}: {registros:,} registros, {empleados:,} empleados")
    
    # 5. Análisis de calidad de datos
    print("\n✅ 5. CALIDAD DE DATOS")
    print("-" * 30)
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(rfc) as con_rfc,
            COUNT(nombreCompleto) as con_nombre,
            COUNT(CASE WHEN totalPercepciones > 0 THEN 1 END) as con_percepciones,
            COUNT(CASE WHEN totalDeducciones > 0 THEN 1 END) as con_deducciones
        FROM payroll_data;
    """)
    
    quality = cursor.fetchone()
    print(f"📊 Total registros: {quality[0]:,}")
    print(f"✅ Con RFC: {quality[1]:,} ({quality[1]/quality[0]*100:.1f}%)")
    print(f"✅ Con nombre: {quality[2]:,} ({quality[2]/quality[0]*100:.1f}%)")
    print(f"💰 Con percepciones > 0: {quality[3]:,} ({quality[3]/quality[0]*100:.1f}%)")
    print(f"💸 Con deducciones > 0: {quality[4]:,} ({quality[4]/quality[0]*100:.1f}%)")
    
    # 6. Verificar si los datos son suficientes para GSAUDB
    print("\n🎯 6. EVALUACIÓN PARA MIGRACIÓN A GSAUDB")
    print("-" * 45)
    
    # Calcular años cubiertos
    if temporal_info[2]:  # Si hay meses únicos
        years_covered = temporal_info[2] / 12
        print(f"📅 Años cubiertos aproximadamente: {years_covered:.1f}")
        
        if years_covered >= 3.5:  # Casi 4 años
            print("✅ SUFICIENTES DATOS: Los datos cubren cerca de 4 años")
            return True
        elif years_covered >= 2:
            print("⚠️  DATOS PARCIALES: Solo ~2-3 años de datos")
            return False
        else:
            print("❌ DATOS INSUFICIENTES: Menos de 2 años de datos")
            return False
    
    return False

def check_data_structure_compatibility(conn):
    """Verifica compatibilidad entre payroll_data y historico_nominas_gsau"""
    print("\n🔗 ANÁLISIS DE COMPATIBILIDAD DE ESTRUCTURA")
    print("=" * 50)
    
    cursor = conn.cursor()
    
    # Obtener campos de payroll_data
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'payroll_data' 
        ORDER BY ordinal_position;
    """)
    payroll_columns = cursor.fetchall()
    
    print("📋 Campos disponibles en payroll_data:")
    for col, dtype in payroll_columns:
        print(f"  • {col}: {dtype}")
    
    # Verificar mapeo con historico_nominas_gsau
    field_mapping = {
        'rfc': 'RFC',
        'nombreCompleto': 'Nombre completo',
        'puesto': 'Puesto',
        'empresa': 'Compañía',
        'curp': 'CURP',
        'mes': 'Mes',
        'sd': 'SD',
        'sdi': 'SDI',
        'sueldoCliente': 'SUELDO CLIENTE',
        'comisionesCliente': 'COMISIONES CLIENTE',
        'totalPercepciones': 'TOTAL DE PERCEPCIONES',
        'totalDeducciones': 'TOTAL DEDUCCIONES',
        'netoAntesVales': 'NETO ANTES DE VALES',
        'netoDespuesVales': 'NETO A PAGAR',
        'ptu': 'PTU'
    }
    
    print(f"\n🗺️  Mapeo disponible para migración:")
    available_fields = [col[0] for col in payroll_columns]
    
    compatible_fields = 0
    total_target_fields = len(field_mapping)
    
    for source_field, target_field in field_mapping.items():
        if source_field in available_fields:
            print(f"  ✅ {source_field} → {target_field}")
            compatible_fields += 1
        else:
            print(f"  ❌ {source_field} → {target_field} (FALTANTE)")
    
    compatibility_percentage = (compatible_fields / total_target_fields) * 100
    print(f"\n📊 Compatibilidad: {compatible_fields}/{total_target_fields} campos ({compatibility_percentage:.1f}%)")
    
    return compatibility_percentage >= 80

def generate_migration_recommendation(conn):
    """Genera recomendaciones para migración de datos"""
    print("\n💡 RECOMENDACIONES DE MIGRACIÓN")
    print("=" * 40)
    
    # Análisis para determinar estrategia
    cursor = conn.cursor()
    
    # Verificar si hay datos GSAU específicos en payroll_data
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN UPPER(empresa) LIKE '%GSAU%' THEN 1 END) as gsau_records,
            COUNT(DISTINCT empresa) as empresas_distintas
        FROM payroll_data;
    """)
    
    analysis = cursor.fetchone()
    total_records = analysis[0]
    gsau_records = analysis[1]
    total_companies = analysis[2]
    
    print(f"📊 Total registros: {total_records:,}")
    print(f"🎯 Registros GSAU: {gsau_records:,}")
    print(f"🏢 Empresas distintas: {total_companies}")
    
    # Estrategias recomendadas
    print("\n📋 ESTRATEGIAS RECOMENDADAS:")
    
    if gsau_records > 0:
        print("✅ ESTRATEGIA 1: Migración Selectiva")
        print("   • Migrar solo registros relacionados con GSAU")
        print("   • Filtrar por empresa que contenga 'GSAU'")
        print(f"   • Afectaría {gsau_records:,} registros")
    
    print("\n✅ ESTRATEGIA 2: Migración Completa")
    print("   • Migrar todos los datos históricos a GSAUDB")
    print(f"   • Afectaría {total_records:,} registros")
    print("   • Crear vista unificada para consultas")
    
    print("\n✅ ESTRATEGIA 3: Mantener Estructura Actual")
    print("   • Conservar datos en postgres.payroll_data")
    print("   • Actualizar backend para usar directamente payroll_data")
    print("   • Eliminar dependencia de GSAUDB vacío")
    
    return {
        'total_records': total_records,
        'gsau_records': gsau_records,
        'companies': total_companies
    }

def analyze_databases():
    """Analiza ambas bases de datos: postgres y GSAUDB"""
    databases = ['postgres', 'GSAUDB']
    results = {}
    
    for db_name in databases:
        print(f"\n🔍 ANALIZANDO BASE DE DATOS: {db_name}")
        print("=" * 50)
        
        conn = connect_to_database(db_name)
        if not conn:
            print(f"❌ No se pudo conectar a {db_name}")
            continue
        
        try:
            cursor = conn.cursor()
            
            # Listar todas las tablas
            cursor.execute("""
                SELECT table_name, 
                       (SELECT COUNT(*) FROM information_schema.columns 
                        WHERE table_name = t.table_name AND table_schema = 'public') as column_count
                FROM information_schema.tables t 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            
            tables = cursor.fetchall()
            print(f"📋 Tablas encontradas en {db_name}: {len(tables)}")
            
            # Analizar cada tabla
            for table_name, column_count in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                row_count = cursor.fetchone()[0]
                print(f"  • {table_name}: {row_count:,} registros ({column_count} columnas)")
            
            # Si encontramos payroll_data, hacer análisis detallado
            if any(table[0] == 'payroll_data' for table in tables):
                print(f"\n🎯 Análisis detallado de payroll_data en {db_name}:")
                has_sufficient_data = analyze_payroll_data(conn)
                is_compatible = check_data_structure_compatibility(conn)
                migration_info = generate_migration_recommendation(conn)
                
                results[db_name] = {
                    'has_payroll_data': True,
                    'sufficient_data': has_sufficient_data,
                    'compatible': is_compatible,
                    'migration_info': migration_info
                }
            else:
                results[db_name] = {'has_payroll_data': False}
            
        except Exception as e:
            print(f"❌ Error analizando {db_name}: {e}")
        finally:
            conn.close()
    
    return results

def main():
    print("🚀 ANÁLISIS COMPLETO DE DATOS HISTÓRICOS")
    print("=" * 60)
    print(f"⏰ Ejecutado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Analizar ambas bases de datos
        results = analyze_databases()
        
        # Resumen final
        print("\n🎯 RESUMEN EJECUTIVO")
        print("=" * 30)
        
        postgres_result = results.get('postgres', {})
        gsaudb_result = results.get('GSAUDB', {})
        
        if postgres_result.get('has_payroll_data'):
            print("✅ ENCONTRADOS DATOS en postgres.payroll_data")
            print(f"   - Datos suficientes: {'Sí' if postgres_result.get('sufficient_data') else 'No'}")
            print(f"   - Compatible: {'Sí' if postgres_result.get('compatible') else 'No'}")
            if postgres_result.get('migration_info'):
                info = postgres_result['migration_info']
                print(f"   - Total registros: {info.get('total_records', 0):,}")
                print(f"   - Registros GSAU: {info.get('gsau_records', 0):,}")
        else:
            print("❌ NO HAY DATOS en postgres.payroll_data")
        
        if not gsaudb_result.get('has_payroll_data'):
            print("❌ GSAUDB está vacío (como se esperaba)")
        
        # Recomendación final
        print("\n🎯 RECOMENDACIÓN PRINCIPAL:")
        if postgres_result.get('has_payroll_data'):
            if postgres_result.get('sufficient_data') and postgres_result.get('compatible'):
                print("   🚀 PROCEDER CON MIGRACIÓN desde postgres a GSAUDB")
            else:
                print("   🔄 MANTENER ESTRUCTURA ACTUAL en postgres")
                print("   📝 Actualizar backend para usar postgres.payroll_data directamente")
        else:
            print("   ⚠️  NO SE ENCONTRARON DATOS HISTÓRICOS ADECUADOS")
            print("   📝 Verificar ubicación de datos o cargar información histórica")
        
        return True
        
    except Exception as e:
        print(f"❌ Error durante el análisis: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
