#!/usr/bin/env python3
"""
Script para verificar nombres exactos de columnas en historico_nominas_gsau
"""

import psycopg2

def main():
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="GSAUDB",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        
        cursor = connection.cursor()
        
        print("🔍 NOMBRES EXACTOS DE COLUMNAS EN historico_nominas_gsau")
        print("=" * 60)
        
        # Obtener estructura completa
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print("📋 TODAS LAS COLUMNAS:")
        for i, (col_name, data_type, nullable) in enumerate(columns, 1):
            print(f"{i:2d}. '{col_name}' ({data_type}) {'NULL' if nullable == 'YES' else 'NOT NULL'}")
        
        # Buscar específicamente las columnas de dinero
        money_columns = []
        date_columns = []
        
        for col_name, data_type, nullable in columns:
            if 'sueldo' in col_name.lower() or 'cliente' in col_name.lower() or 'percepciones' in col_name.lower() or 'deducciones' in col_name.lower():
                money_columns.append(col_name)
            if 'cveper' in col_name.lower() or 'fecha' in col_name.lower() or 'date' in col_name.lower():
                date_columns.append(col_name)
        
        print(f"\n💰 COLUMNAS DE DINERO ENCONTRADAS:")
        for col in money_columns:
            print(f"   • '{col}'")
        
        print(f"\n📅 COLUMNAS DE FECHA ENCONTRADAS:")
        for col in date_columns:
            print(f"   • '{col}'")
        
        connection.close()
        return columns
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

if __name__ == "__main__":
    cols = main()
    print(f"\n✅ {len(cols)} columnas encontradas en historico_nominas_gsau")
