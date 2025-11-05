#!/usr/bin/env python3
"""
Script simple para leer cveper correctamente
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
        
        print("🔍 LECTURA SIMPLE DE CVEPER")
        print("=" * 40)
        
        # 1. Conteo total
        cursor.execute("SELECT COUNT(*) FROM historico_nominas_gsau")
        total = cursor.fetchone()[0]
        print(f"📊 Total registros: {total:,}")
        
        # 2. Leer cveper y Mes directamente
        cursor.execute('''
            SELECT 
                cveper,
                "Mes",
                COUNT(*) as registros
            FROM historico_nominas_gsau
            GROUP BY cveper, "Mes"
            ORDER BY cveper DESC, "Mes"
        ''')
        
        data = cursor.fetchall()
        
        print(f"\n📅 CVEPER Y MES (todos los registros):")
        print("-" * 50)
        
        unique_dates = set()
        for cveper, mes, registros in data:
            print(f"   {cveper} | {mes} | {registros:,} registros")
            unique_dates.add(cveper)
        
        print(f"\n📊 RESUMEN:")
        print(f"   • Fechas únicas en cveper: {len(unique_dates)}")
        print(f"   • Fechas encontradas: {sorted(unique_dates)}")
        
        # 3. Verificar valores distintos de cveper específicamente
        cursor.execute("SELECT DISTINCT cveper FROM historico_nominas_gsau ORDER BY cveper")
        distinct_cveper = cursor.fetchall()
        
        print(f"\n📅 VALORES DISTINTOS DE CVEPER:")
        for (fecha,) in distinct_cveper:
            print(f"   • {fecha}")
        
        # 4. Si tienes razón y hay fechas diferentes, mostrar distribución por año
        cursor.execute('''
            SELECT 
                EXTRACT(YEAR FROM cveper) as año,
                COUNT(*) as registros,
                COUNT(DISTINCT "Mes") as meses_distintos
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY EXTRACT(YEAR FROM cveper)
            ORDER BY año DESC
        ''')
        
        year_distribution = cursor.fetchall()
        
        print(f"\n📈 DISTRIBUCIÓN POR AÑO:")
        print("-" * 30)
        for año, registros, meses in year_distribution:
            print(f"   {int(año)}: {registros:,} registros, {meses} meses")
        
        connection.close()
        
        # Respuesta final
        print(f"\n🎯 RESPUESTA SOBRE CVEPER:")
        if len(unique_dates) > 1:
            print(f"✅ SÍ hay fechas diferentes en cveper: {len(unique_dates)} únicas")
        else:
            print(f"❌ Solo hay 1 fecha en cveper: {list(unique_dates)[0] if unique_dates else 'N/A'}")
            print(f"📝 Puede ser que pgAdmin4 muestre diferente por:")
            print(f"   • Configuración de zona horaria")
            print(f"   • Formato de visualización")
            print(f"   • Filtros aplicados en pgAdmin4")
        
        return len(unique_dates), total
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0, 0

if __name__ == "__main__":
    unique_dates, total = main()
    print(f"\n✅ CAMPO CVEPER: {unique_dates} fechas únicas de {total:,} registros")
