#!/usr/bin/env python3
"""
Script para simular consulta manual como en pgAdmin4
"""

import psycopg2

def main():
    try:
        # Conexión exacta
        connection = psycopg2.connect(
        host='dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
            port=5432,
            database="GSAUDB",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        
        cursor = connection.cursor()
        
        print("🔍 CONSULTA MANUAL COMO PGADMIN4")
        print("=" * 50)
        
        # Consulta exacta como harías manualmente
        cursor.execute("""
            SELECT 
                "RFC",
                "Nombre completo", 
                cveper,
                "Mes",
                "Compañía"
            FROM historico_nominas_gsau
            ORDER BY cveper DESC
            LIMIT 50;
        """)
        
        records = cursor.fetchall()
        
        print(f"📋 PRIMEROS 50 REGISTROS (ordenados por cveper DESC):")
        print("-" * 70)
        print("RFC | Nombre | cveper | Mes | Empresa")
        print("-" * 70)
        
        unique_cveper_values = set()
        for rfc, nombre, cveper, mes, empresa in records:
            nombre_short = nombre[:20] + "..." if len(nombre) > 20 else nombre
            empresa_short = empresa[:15] + "..." if empresa and len(empresa) > 15 else empresa
            print(f"{rfc} | {nombre_short} | {cveper} | {mes} | {empresa_short}")
            unique_cveper_values.add(cveper)
        
        print(f"\n📊 En estos 50 registros:")
        print(f"   • Valores únicos de cveper: {len(unique_cveper_values)}")
        print(f"   • Fechas encontradas: {sorted(unique_cveper_values)}")
        
        # Verificar si hay más fechas en el resto de registros
        cursor.execute("SELECT COUNT(DISTINCT cveper) FROM historico_nominas_gsau")
        total_unique_cveper = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM historico_nominas_gsau")  
        total_records = cursor.fetchone()[0]
        
        print(f"\n📈 ESTADÍSTICAS COMPLETAS:")
        print(f"   • Total registros: {total_records:,}")
        print(f"   • Total fechas únicas en cveper: {total_unique_cveper}")
        
        # Mostrar TODAS las fechas únicas
        cursor.execute("SELECT DISTINCT cveper FROM historico_nominas_gsau ORDER BY cveper")
        all_unique_cveper = cursor.fetchall()
        
        print(f"\n📅 TODAS LAS FECHAS ÚNICAS EN CVEPER:")
        for (fecha,) in all_unique_cveper:
            print(f"   • {fecha}")
        
        connection.close()
        
        # Conclusión final
        print(f"\n🎯 CONCLUSIÓN FINAL:")
        if total_unique_cveper > 1:
            print(f"✅ HAY {total_unique_cveper} fechas diferentes en cveper")
            print(f"✅ Campo cveper PUEDE usarse como Periodo")
        else:
            print(f"❌ Solo hay 1 fecha en cveper")
            print(f"📝 Lo que ves en pgAdmin4 puede ser:")
            print(f"   • Vista diferente o con filtros")
            print(f"   • Otra tabla o base de datos")
            print(f"   • Configuración de formato específica")
        
        return total_unique_cveper, total_records
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0, 0

if __name__ == "__main__":
    unique_dates, total = main()
    print(f"\n🎯 RESULTADO: {unique_dates} fechas únicas en cveper de {total:,} registros totales")
