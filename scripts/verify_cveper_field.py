#!/usr/bin/env python3
"""
Script específico para verificar el campo cveper en detalle
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
        
        print("🔍 VERIFICACIÓN ESPECÍFICA DEL CAMPO CVEPER")
        print("=" * 60)
        
        # 1. Verificar si el campo cveper existe
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            AND LOWER(column_name) = 'cveper'
        """)
        
        cveper_info = cursor.fetchone()
        
        if cveper_info:
            print(f"✅ CAMPO CVEPER ENCONTRADO:")
            print(f"   • Nombre: {cveper_info[0]}")
            print(f"   • Tipo: {cveper_info[1]}")
            print(f"   • Nullable: {cveper_info[2]}")
        else:
            print("❌ Campo cveper NO ENCONTRADO")
            
            # Buscar campos similares
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = 'historico_nominas_gsau'
                AND (
                    LOWER(column_name) LIKE '%cveper%' OR
                    LOWER(column_name) LIKE '%fecha%' OR
                    LOWER(column_name) LIKE '%periodo%' OR
                    LOWER(column_name) LIKE '%date%'
                )
                ORDER BY column_name;
            """)
            
            similar_fields = cursor.fetchall()
            print("🔍 Campos similares encontrados:")
            for field, dtype in similar_fields:
                print(f"   • {field}: {dtype}")
            
            return False
        
        # 2. Analizar contenido del campo cveper
        cursor.execute("""
            SELECT 
                cveper,
                "Mes",
                COUNT(*) as registros
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY cveper, "Mes"
            ORDER BY cveper DESC, "Mes"
            LIMIT 20;
        """)
        
        cveper_data = cursor.fetchall()
        
        print(f"\n📊 CONTENIDO DEL CAMPO CVEPER:")
        print("-" * 40)
        for cveper, mes, registros in cveper_data:
            print(f"   {cveper} ({mes}): {registros:,} registros")
        
        # 3. Verificar valores únicos de cveper
        cursor.execute("""
            SELECT 
                cveper,
                COUNT(*) as frecuencia
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY cveper
            ORDER BY cveper DESC;
        """)
        
        unique_cveper = cursor.fetchall()
        
        print(f"\n📅 VALORES ÚNICOS DE CVEPER:")
        print("-" * 30)
        for cveper, freq in unique_cveper:
            print(f"   {cveper}: {freq:,} registros")
        
        # 4. Muestra de registros con cveper
        cursor.execute("""
            SELECT 
                "RFC",
                "Nombre completo",
                cveper,
                "Mes",
                "Compañía"
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            ORDER BY cveper DESC
            LIMIT 5;
        """)
        
        sample_data = cursor.fetchall()
        
        print(f"\n📋 MUESTRA DE REGISTROS CON CVEPER:")
        print("-" * 50)
        for rfc, nombre, cveper, mes, empresa in sample_data:
            print(f"   RFC: {rfc}")
            print(f"   Nombre: {nombre}")
            print(f"   cveper: {cveper}")
            print(f"   Mes: {mes}")
            print(f"   Empresa: {empresa}")
            print(f"   ---")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    found = main()
    if found:
        print(f"\n✅ CAMPO CVEPER VERIFICADO")
        print(f"📝 Puede ser usado como campo 'Periodo' en el dashboard")
    else:
        print(f"\n❌ PROBLEMA CON CAMPO CVEPER")
        print(f"📝 Necesita investigación adicional")
