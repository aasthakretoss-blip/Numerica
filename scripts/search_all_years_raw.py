#!/usr/bin/env python3
"""
Script para buscar datos de todos los años (2021-2025) en formato RAW
"""

import psycopg2

def main():
    try:
        connection = psycopg2.connect(
        host='dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
            port=5432,
            database="GSAUDB",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        
        cursor = connection.cursor()
        
        print("🔍 BÚSQUEDA RAW DE DATOS 2021-2025")
        print("=" * 60)
        
        # 1. Contar TODOS los registros primero
        cursor.execute("SELECT COUNT(*) FROM historico_nominas_gsau")
        total = cursor.fetchone()[0]
        print(f"📊 TOTAL REGISTROS EN GSAUDB: {total:,}")
        
        # 2. Buscar por diferentes patrones de año en campo Mes
        years_to_search = ['21_', '22_', '23_', '24_', '25_']
        
        print(f"\n🔍 BÚSQUEDA POR AÑOS EN CAMPO 'Mes':")
        print("-" * 50)
        
        total_by_year = {}
        
        for year_pattern in years_to_search:
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM historico_nominas_gsau 
                WHERE "Mes" LIKE '{year_pattern}%'
            """)
            
            count = cursor.fetchone()[0]
            year = 2000 + int(year_pattern[:2])
            total_by_year[year] = count
            
            if count > 0:
                print(f"✅ {year}: {count:,} registros (patrón '{year_pattern}')")
            else:
                print(f"❌ {year}: 0 registros")
        
        # 3. Buscar en cveper por diferentes años
        print(f"\n🔍 BÚSQUEDA POR AÑOS EN CAMPO 'cveper':")
        print("-" * 50)
        
        for year in [2021, 2022, 2023, 2024, 2025]:
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM historico_nominas_gsau 
                WHERE EXTRACT(YEAR FROM cveper) = {year}
            """)
            
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"✅ {year}: {count:,} registros en cveper")
            else:
                print(f"❌ {year}: 0 registros en cveper")
        
        # 4. Analizar todos los valores únicos de cveper RAW
        cursor.execute("""
            SELECT 
                cveper,
                COUNT(*) as frecuencia,
                MIN("Mes") as primer_mes,
                MAX("Mes") as ultimo_mes
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY cveper
            ORDER BY cveper;
        """)
        
        all_cveper = cursor.fetchall()
        
        print(f"\n📅 TODOS LOS VALORES DE CVEPER:")
        print("-" * 50)
        for cveper, freq, primer_mes, ultimo_mes in all_cveper:
            print(f"   {cveper}: {freq:,} registros ({primer_mes} a {ultimo_mes})")
        
        # 5. Buscar en todas las columnas que pueden tener fechas
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            AND (
                data_type LIKE '%date%' OR
                data_type LIKE '%time%' OR
                LOWER(column_name) LIKE '%fecha%' OR
                LOWER(column_name) LIKE '%date%' OR
                LOWER(column_name) LIKE '%periodo%'
            )
            ORDER BY column_name;
        """)
        
        date_fields = cursor.fetchall()
        
        print(f"\n📅 TODOS LOS CAMPOS DE FECHA DISPONIBLES:")
        print("-" * 50)
        for field, dtype in date_fields:
            print(f"   • {field}: {dtype}")
            
            # Verificar contenido de cada campo de fecha
            try:
                cursor.execute(f"""
                    SELECT 
                        {field},
                        COUNT(*) as registros
                    FROM historico_nominas_gsau
                    WHERE {field} IS NOT NULL
                    GROUP BY {field}
                    ORDER BY {field}
                    LIMIT 10;
                """)
                
                field_data = cursor.fetchall()
                print(f"     Valores únicos en {field}:")
                for value, count in field_data:
                    print(f"       {value}: {count:,} registros")
                    
            except Exception as e:
                print(f"     ❌ Error leyendo {field}: {e}")
        
        # 6. Verificar si hay otros campos que puedan contener años históricos
        cursor.execute("""
            SELECT 
                "Mes",
                COUNT(*) as registros,
                COUNT(DISTINCT "RFC") as empleados
            FROM historico_nominas_gsau
            GROUP BY "Mes"
            ORDER BY "Mes";
        """)
        
        all_months = cursor.fetchall()
        
        print(f"\n📊 TODOS LOS MESES DISPONIBLES:")
        print("-" * 40)
        for mes, registros, empleados in all_months:
            print(f"   {mes}: {registros:,} registros, {empleados:,} empleados")
        
        # 7. Resumen final
        total_years_found = sum(1 for count in total_by_year.values() if count > 0)
        
        print(f"\n🎯 RESUMEN FINAL:")
        print("-" * 30)
        print(f"📊 Total registros: {total:,}")
        print(f"📅 Años con datos: {total_years_found}/5")
        print(f"🗓️ Campo cveper existe: ✅")
        print(f"📈 Valores únicos en cveper: {len(all_cveper)}")
        
        if len(all_cveper) == 1:
            print(f"⚠️  TODOS los cveper tienen la misma fecha: {all_cveper[0][0]}")
            print(f"📝 Esto puede indicar un problema en la carga de datos")
        
        connection.close()
        return total, total_years_found
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0, 0

if __name__ == "__main__":
    total, years = main()
    print(f"\n✅ VERIFICACIÓN COMPLETADA")
    print(f"📊 REGISTROS TOTALES: {total:,}")
    print(f"📅 AÑOS CON DATOS: {years}/5")
