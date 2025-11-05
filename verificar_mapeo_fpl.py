#!/usr/bin/env python3
"""
Script para verificar el mapeo del dropdown FPL
Confirmando que columna usa para las fechas
"""

import psycopg2

def connect_historic():
    """Conectar a Historic"""
    try:
        connection = psycopg2.connect(
            host="dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="Historic",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        return connection
    except Exception as e:
        print(f"❌ Error conectando a Historic: {e}")
        return None

def verify_fpl_dropdown_mapping():
    """Verificar el mapeo del dropdown FPL"""
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO MAPEO DEL DROPDOWN PERFIL FPL")
        print("=" * 60)
        
        # 1. Verificar estructura de la tabla historico_fondos_gsau
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_fondos_gsau'
            AND column_name IN ('fecpla', 'numrfc', 'FECPLA', 'NUMRFC')
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("📊 COLUMNAS RELEVANTES EN historico_fondos_gsau:")
        for col_name, data_type in columns:
            print(f"   • {col_name} ({data_type})")
        
        # 2. Verificar si hay datos en fecpla
        cursor.execute("SELECT COUNT(*) FROM historico_fondos_gsau WHERE fecpla IS NOT NULL")
        fecpla_count = cursor.fetchone()[0]
        print(f"\n📈 REGISTROS CON FECPLA: {fecpla_count:,}")
        
        # 3. Mostrar muestra de datos de fecpla
        cursor.execute("SELECT DISTINCT fecpla FROM historico_fondos_gsau WHERE fecpla IS NOT NULL ORDER BY fecpla DESC LIMIT 5")
        sample_dates = cursor.fetchall()
        print("\n📅 MUESTRA DE FECHAS FECPLA (más recientes):")
        for i, (fecpla,) in enumerate(sample_dates, 1):
            print(f"   {i}. {fecpla}")
        
        # 4. Verificar rango de RFC disponibles
        cursor.execute("SELECT COUNT(DISTINCT numrfc) FROM historico_fondos_gsau WHERE numrfc IS NOT NULL")
        rfc_count = cursor.fetchone()[0]
        print(f"\n👥 RFC ÚNICOS EN historico_fondos_gsau: {rfc_count:,}")
        
        # 5. Prueba específica: buscar fechas para un RFC de prueba
        cursor.execute("""
            SELECT numrfc, fecpla
            FROM historico_fondos_gsau
            WHERE numrfc IS NOT NULL 
            AND fecpla IS NOT NULL
            LIMIT 3
        """)
        
        test_results = cursor.fetchall()
        print("\n🧪 PRUEBA DE CONSULTA (primeros 3 registros):")
        for numrfc, fecpla in test_results:
            print(f"   RFC: {numrfc} -> Fecha: {fecpla}")
        
        # 6. Simular la consulta exacta del dropdown
        print("\n🎯 SIMULANDO CONSULTA DEL DROPDOWN:")
        print("API Endpoint: /api/payroll/fecpla-from-rfc")
        print("Consulta SQL:")
        print("""
        SELECT fecpla
        FROM historico_fondos_gsau
        WHERE numrfc = $1
        AND fecpla IS NOT NULL
        ORDER BY fecpla DESC
        """)
        
        # Probar con RFC real
        if test_results:
            test_rfc = test_results[0][0]
            print(f"\n🔍 Probando con RFC: {test_rfc}")
            
            cursor.execute("""
                SELECT fecpla
                FROM historico_fondos_gsau
                WHERE numrfc = %s
                AND fecpla IS NOT NULL
                ORDER BY fecpla DESC
            """, [test_rfc])
            
            rfc_dates = cursor.fetchall()
            print(f"✅ Fechas encontradas para RFC {test_rfc}: {len(rfc_dates)}")
            
            if rfc_dates:
                print("📅 Primeras 5 fechas:")
                for i, (fecpla,) in enumerate(rfc_dates[:5], 1):
                    print(f"   {i}. {fecpla}")
        
        print(f"\n📋 RESUMEN DEL MAPEO:")
        print("=" * 30)
        print("✅ TABLA: historico_fondos_gsau")
        print("✅ COLUMNA FECHAS: fecpla")
        print("✅ COLUMNA RFC: numrfc")
        print("✅ ENDPOINT: /api/payroll/fecpla-from-rfc")
        print(f"✅ DATOS DISPONIBLES: {fecpla_count:,} registros")
        print(f"✅ RFC ÚNICOS: {rfc_count:,}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error verificando mapeo: {e}")

if __name__ == "__main__":
    verify_fpl_dropdown_mapping()
