#!/usr/bin/env python3
"""
Script para leer cveper en múltiples formatos de fecha
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
        
        print("🔍 LECTURA DE CVEPER EN MÚLTIPLES FORMATOS")
        print("=" * 60)
        
        # 1. Leer cveper como texto sin conversión
        cursor.execute("""
            SELECT 
                cveper::text as cveper_texto,
                "Mes",
                "RFC",
                "Nombre completo"
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            ORDER BY "RFC"
            LIMIT 20;
        """)
        
        cveper_as_text = cursor.fetchall()
        
        print("📅 CVEPER COMO TEXTO (sin conversión):")
        print("-" * 50)
        for cveper_txt, mes, rfc, nombre in cveper_as_text:
            print(f"   {cveper_txt} | {mes} | {rfc} | {nombre[:30]}...")
        
        # 2. Leer usando diferentes formatos de fecha
        cursor.execute("""
            SELECT 
                cveper,
                TO_CHAR(cveper, 'YYYY-MM-DD') as formato_iso,
                TO_CHAR(cveper, 'DD/MM/YYYY') as formato_slash,
                TO_CHAR(cveper, 'Month YYYY') as formato_mes_año,
                EXTRACT(YEAR FROM cveper) as año,
                EXTRACT(MONTH FROM cveper) as mes_num,
                EXTRACT(DAY FROM cveper) as dia,
                "Mes"
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY cveper, "Mes"
            ORDER BY cveper DESC
            LIMIT 15;
        """)
        
        formatted_dates = cursor.fetchall()
        
        print(f"\n📊 CVEPER EN DIFERENTES FORMATOS:")
        print("-" * 70)
        print("Original | ISO | Slash | Mes-Año | Año | Mes# | Día | Campo Mes")
        print("-" * 70)
        
        for cveper, iso, slash, mes_año, año, mes_num, dia, campo_mes in formatted_dates:
            print(f"{cveper} | {iso} | {slash} | {mes_año} | {año} | {mes_num} | {dia} | {campo_mes}")
        
        # 3. Verificar si hay variación en las fechas
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT cveper) as fechas_unicas,
                COUNT(DISTINCT TO_CHAR(cveper, 'YYYY-MM-DD')) as fechas_iso_unicas,
                COUNT(DISTINCT EXTRACT(YEAR FROM cveper)) as años_unicos,
                COUNT(DISTINCT EXTRACT(MONTH FROM cveper)) as meses_unicos,
                MIN(cveper) as fecha_min,
                MAX(cveper) as fecha_max
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL;
        """)
        
        stats = cursor.fetchone()
        
        print(f"\n📈 ESTADÍSTICAS DE CVEPER:")
        print("-" * 30)
        print(f"   Fechas únicas: {stats[0]}")
        print(f"   Fechas ISO únicas: {stats[1]}")
        print(f"   Años únicos: {stats[2]}")
        print(f"   Meses únicos: {stats[3]}")
        print(f"   Fecha mínima: {stats[4]}")
        print(f"   Fecha máxima: {stats[5]}")
        
        # 4. Intentar diferentes interpretaciones del campo
        cursor.execute("""
            SELECT 
                cveper,
                "Mes",
                COUNT(*) as registros,
                STRING_AGG(DISTINCT "RFC", ', ') as sample_rfcs
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY cveper, "Mes"
            ORDER BY cveper, "Mes"
            LIMIT 20;
        """)
        
        detailed_data = cursor.fetchall()
        
        print(f"\n🔍 ANÁLISIS DETALLADO POR FECHA Y MES:")
        print("-" * 60)
        for cveper, mes, registros, sample_rfcs in detailed_data:
            # Mostrar solo algunos RFCs de muestra
            rfcs_sample = sample_rfcs[:50] + "..." if len(sample_rfcs) > 50 else sample_rfcs
            print(f"   {cveper} | {mes} | {registros} reg | RFCs: {rfcs_sample}")
        
        # 5. Verificar si cveper corresponde a diferentes períodos reales
        cursor.execute("""
            SELECT 
                "Mes",
                cveper,
                COUNT(*) as registros,
                COUNT(DISTINCT "RFC") as empleados_unicos
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
            GROUP BY "Mes", cveper
            ORDER BY "Mes";
        """)
        
        month_cveper_map = cursor.fetchall()
        
        print(f"\n🗓️ MAPEO MES vs CVEPER:")
        print("-" * 40)
        for mes, cveper, registros, empleados in month_cveper_map:
            print(f"   {mes} → {cveper} | {registros} reg, {empleados} emp")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print(f"\n✅ ANÁLISIS DE CVEPER COMPLETADO")
        print(f"📝 Si ves fechas diferentes en pgAdmin4, puede ser:")
        print(f"   • Formato de visualización diferente")
        print(f"   • Zona horaria")
        print(f"   • Precisión de timestamp vs date")
    else:
        print(f"\n❌ No se pudo analizar cveper")
