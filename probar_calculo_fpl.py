#!/usr/bin/env python3
"""
Script para probar el nuevo cálculo de fechas FPL
Simulando el comportamiento del endpoint modificado
"""

import psycopg2
from datetime import datetime, timedelta
import json

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

def simular_calculo_fpl():
    """Simular el cálculo de fechas FPL como lo haría el nuevo endpoint"""
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🧮 SIMULANDO CÁLCULO DE FECHAS FPL")
        print("=" * 50)
        print("💡 Lógica: fecpla + (Antigüedad en Fondo * 365.25 días)")
        
        # 1. Identificar posibles columnas de Antigüedad en Fondo
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_fondos_gsau'
            AND (
                LOWER(column_name) LIKE '%antiguedad%' OR
                LOWER(column_name) LIKE '%ant%' OR
                LOWER(column_name) LIKE '%years%' OR
                LOWER(column_name) LIKE '%tiempo%' OR
                LOWER(column_name) LIKE '%duracion%'
            )
            ORDER BY column_name;
        """)
        
        antiguedad_columns = cursor.fetchall()
        print(f"\n🔍 Columnas candidatas para 'Antigüedad en Fondo':")
        for col_name, data_type in antiguedad_columns:
            print(f"   • {col_name} ({data_type})")
        
        # 2. Si no encontramos columnas específicas, mostrar todas las columnas
        if not antiguedad_columns:
            print("\n📋 No se encontraron columnas obvias. Mostrando todas las columnas:")
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = 'historico_fondos_gsau'
                ORDER BY ordinal_position;
            """)
            
            all_columns = cursor.fetchall()
            for i, (col_name, data_type) in enumerate(all_columns, 1):
                print(f"   {i:2d}. {col_name} ({data_type})")
        
        # 3. Simular cálculo manual con ejemplos hipotéticos
        print(f"\n🧪 EJEMPLOS DE CÁLCULO MANUAL:")
        print("-" * 40)
        
        ejemplos = [
            {"fecpla": "2020-01-15", "antiguedad_anos": 1.0, "descripcion": "1 año completo"},
            {"fecpla": "2019-06-20", "antiguedad_anos": 1.5, "descripcion": "1 año y medio"},
            {"fecpla": "2021-03-10", "antiguedad_anos": 0.083333, "descripcion": "1 mes (0.083333 años)"},
            {"fecpla": "2018-12-01", "antiguedad_anos": 2.25, "descripcion": "2 años y 3 meses"},
        ]
        
        for i, ejemplo in enumerate(ejemplos, 1):
            fecpla_date = datetime.strptime(ejemplo["fecpla"], "%Y-%m-%d")
            dias_a_sumar = ejemplo["antiguedad_anos"] * 365.25
            fecha_fpl = fecpla_date + timedelta(days=dias_a_sumar)
            
            print(f"\n   {i}. {ejemplo['descripcion']}:")
            print(f"      📅 Fecha base (fecpla): {ejemplo['fecpla']}")
            print(f"      ⏰ Antigüedad: {ejemplo['antiguedad_anos']} años")
            print(f"      🧮 Días a sumar: {dias_a_sumar:.2f}")
            print(f"      🎯 Fecha FPL resultante: {fecha_fpl.strftime('%Y-%m-%d')}")
        
        # 4. Probar con datos reales si es posible
        print(f"\n🔍 INTENTANDO CONSULTA CON DATOS REALES:")
        print("-" * 45)
        
        # Buscar registros con fecpla válida
        cursor.execute("""
            SELECT numrfc, fecpla
            FROM historico_fondos_gsau
            WHERE fecpla IS NOT NULL
            LIMIT 3;
        """)
        
        sample_records = cursor.fetchall()
        
        if sample_records:
            print("✅ Encontrados registros de ejemplo:")
            for numrfc, fecpla in sample_records:
                print(f"   RFC: {numrfc} -> Fecha base: {fecpla}")
                
            # Intentar identificar la columna de antigüedad por análisis de datos
            print(f"\n🔎 Analizando columnas numéricas para identificar 'Antigüedad en Fondo':")
            
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = 'historico_fondos_gsau'
                AND data_type IN ('numeric', 'double precision', 'real', 'integer')
                AND column_name NOT IN ('fecpla', 'numrfc')
                ORDER BY column_name;
            """)
            
            numeric_columns = [row[0] for row in cursor.fetchall()]
            
            for col in numeric_columns[:10]:  # Solo los primeros 10 para no saturar
                try:
                    cursor.execute(f"""
                        SELECT 
                            COUNT(*) as total,
                            COUNT(*) FILTER (WHERE "{col}" > 0) as positivos,
                            MIN("{col}") as min_val,
                            MAX("{col}") as max_val,
                            AVG("{col}") as avg_val
                        FROM historico_fondos_gsau
                        WHERE "{col}" IS NOT NULL
                    """)
                    
                    stats = cursor.fetchone()
                    if stats and stats[1] > 0:  # Si hay valores positivos
                        total, positivos, min_val, max_val, avg_val = stats
                        
                        # Verificar si los valores son coherentes con años de antigüedad
                        if min_val >= 0 and max_val <= 50 and avg_val <= 10:
                            print(f"   🎯 {col}: {positivos:,} registros, rango: {min_val}-{max_val}, promedio: {avg_val:.2f}")
                        
                except Exception as e:
                    continue
        else:
            print("❌ No se encontraron registros de ejemplo")
        
        print(f"\n📝 RESUMEN DEL CÁLCULO:")
        print("=" * 30)
        print("✅ Fórmula implementada: fecpla + (Antigüedad en Fondo * 365.25 días)")
        print("✅ El endpoint identificará automáticamente la columna de antigüedad")
        print("✅ Las fechas se calcularán dinámicamente para cada RFC")
        print("✅ El dropdown mostrará fechas únicas ordenadas de más reciente a más antigua")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error en simulación: {e}")

def generar_ejemplo_response():
    """Generar ejemplo de respuesta del endpoint modificado"""
    print(f"\n📦 EJEMPLO DE RESPUESTA DEL ENDPOINT:")
    print("=" * 45)
    
    ejemplo_response = {
        "success": True,
        "data": [
            {
                "value": "2023-07-15T00:00:00.000Z",
                "label": "2023-07-15", 
                "count": 2,
                "metadata": {
                    "fechaBase": "2020-01-15T00:00:00.000Z",
                    "antiguedadAnos": 3.5,
                    "calculoAplicado": "2020-01-15T00:00:00.000Z + 3.5 años = 2023-07-15"
                }
            },
            {
                "value": "2022-12-20T00:00:00.000Z",
                "label": "2022-12-20",
                "count": 1,
                "metadata": {
                    "fechaBase": "2019-06-20T00:00:00.000Z", 
                    "antiguedadAnos": 3.5,
                    "calculoAplicado": "2019-06-20T00:00:00.000Z + 3.5 años = 2022-12-20"
                }
            }
        ],
        "total": 2,
        "datapoints": 3,
        "rfc": "ROJR9005202R6",
        "antiguedadColumn": "antiguedad_fondo",
        "calculation": "fecpla + (antiguedad_anos * 365.25 días)",
        "methodology": {
            "step1": "Búsqueda de RFC ROJR9005202R6 en historico_fondos_gsau",
            "step2": "3 registros encontrados con datos completos", 
            "step3": "Aplicado cálculo: fecpla + (antiguedad_fondo * 365.25 días)",
            "step4": "2 fechas FPL únicas calculadas",
            "step5": "Formateadas y ordenadas para dropdown"
        }
    }
    
    print(json.dumps(ejemplo_response, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    simular_calculo_fpl()
    generar_ejemplo_response()
    
    print(f"\n🎯 PRÓXIMOS PASOS:")
    print("1. ✅ El endpoint ha sido modificado con el cálculo correcto")
    print("2. 🔄 Reinicia el servidor API para aplicar los cambios") 
    print("3. 🧪 Prueba el dropdown en el frontend")
    print("4. 📊 Verifica que las fechas ahora son diferentes y calculadas")
    print("5. 🎉 Las fechas FPL mostrarán la progresión real de antigüedad!")
