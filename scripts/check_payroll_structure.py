#!/usr/bin/env python3
"""
Script simple para revisar la estructura de payroll_data
"""

import psycopg2

def main():
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="postgres",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        
        cursor = connection.cursor()
        
        # Ver estructura de payroll_data
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'payroll_data'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("📋 ESTRUCTURA DE payroll_data:")
        for col, dtype, nullable in columns:
            print(f"  • {col}: {dtype} ({'NULL' if nullable == 'YES' else 'NOT NULL'})")
        
        # Ver algunos registros de muestra
        cursor.execute("SELECT * FROM payroll_data LIMIT 3")
        sample_data = cursor.fetchall()
        
        print("\n📊 MUESTRA DE DATOS:")
        if sample_data:
            # Obtener nombres de columnas
            col_names = [desc[0] for desc in cursor.description]
            for i, record in enumerate(sample_data):
                print(f"\nRegistro {i+1}:")
                for j, value in enumerate(record):
                    print(f"  {col_names[j]}: {value}")
        
        connection.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
