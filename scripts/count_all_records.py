#!/usr/bin/env python3
"""
Script SIMPLE para contar TODOS los registros en AWS
"""

import psycopg2

def connect_and_count(database_name):
    """Conecta y cuenta registros en una base de datos"""
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database=database_name,
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        
        cursor = connection.cursor()
        
        print(f"\n🔍 BASE DE DATOS: {database_name}")
        print("=" * 40)
        
        # Obtener todas las tablas
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        db_total = 0
        
        for (table_name,) in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            
            if count > 0:
                print(f"📊 {table_name}: {count:,} registros")
                db_total += count
            else:
                print(f"📊 {table_name}: 0 registros")
        
        print(f"\n✅ SUBTOTAL {database_name}: {db_total:,} registros")
        
        connection.close()
        return db_total
        
    except Exception as e:
        print(f"❌ Error en {database_name}: {e}")
        return 0

def main():
    print("🚀 CONTEO TOTAL DE REGISTROS EN AWS")
    print("=" * 60)
    
    # Contar en postgres
    postgres_total = connect_and_count("postgres")
    
    # Contar en GSAUDB  
    gsaudb_total = connect_and_count("GSAUDB")
    
    # Total general
    grand_total = postgres_total + gsaudb_total
    
    print(f"\n🎯 RESUMEN FINAL")
    print("=" * 30)
    print(f"📊 postgres: {postgres_total:,} registros")
    print(f"📊 GSAUDB: {gsaudb_total:,} registros")
    print(f"📊 TOTAL EN AWS: {grand_total:,} registros")
    
    # Cálculo para dashboard
    if postgres_total > 0:
        pages = (postgres_total + 49) // 50
        print(f"\n📱 CONFIGURACIÓN DASHBOARD:")
        print(f"   • Tabla principal: postgres.payroll_data")
        print(f"   • Total registros: {postgres_total:,}")
        print(f"   • Páginas (50 por página): {pages:,}")
        
        if postgres_total >= 200000:
            print(f"   ✅ PROBABLE: Datos de 4+ años")
        elif postgres_total >= 100000:
            print(f"   ⚠️  POSIBLE: Datos de 2-3 años")
        else:
            print(f"   ❌ LIMITADO: Solo 1 año de datos")
    
    return grand_total

if __name__ == "__main__":
    total = main()
    print(f"\n✅ REGISTROS TOTALES EN TU SISTEMA AWS: {total:,}")
