import psycopg2
import os
from datetime import datetime

# Configuración de la base de datos fondos
FONDOS_DB_CONFIG = {
    'host': os.getenv('FONDOS_DB_HOST', 'localhost'),
    'port': os.getenv('FONDOS_DB_PORT', '5432'),
    'database': os.getenv('FONDOS_DB_NAME', 'database'),
    'user': os.getenv('FONDOS_DB_USER', 'user'),
    'password': os.getenv('FONDOS_DB_PASSWORD', 'password')
}

def analyze_date_columns():
    """
    Analiza las columnas de fecha en historico_fondos_gsau
    para entender sus formatos y contenido
    """
    print("🗓️ ANÁLISIS DE COLUMNAS DE FECHA EN historico_fondos_gsau")
    print("=" * 70)
    
    try:
        conn = psycopg2.connect(**FONDOS_DB_CONFIG)
        cursor = conn.cursor()
        
        # 1. Obtener todas las columnas de la tabla
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'historico_fondos_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print(f"📊 Total de columnas en la tabla: {len(columns)}")
        
        # 2. Identificar columnas que pueden contener fechas
        date_related_columns = []
        for col_name, data_type, nullable, default in columns:
            col_lower = col_name.lower()
            
            # Buscar por tipo de dato
            if data_type in ['date', 'timestamp', 'timestamp without time zone', 'timestamp with time zone']:
                date_related_columns.append((col_name, data_type, 'tipo'))
            
            # Buscar por nombre que contenga palabras relacionadas con fechas
            elif any(keyword in col_lower for keyword in ['fecha', 'date', 'fec', 'per', 'periodo']):
                date_related_columns.append((col_name, data_type, 'nombre'))
        
        print(f"\n🔍 Columnas relacionadas con fechas encontradas: {len(date_related_columns)}")
        for col_name, data_type, reason in date_related_columns:
            print(f"  - {col_name} ({data_type}) - detectada por {reason}")
        
        # 3. Analizar contenido de cada columna de fecha
        for col_name, data_type, reason in date_related_columns:
            print(f"\n📅 ANÁLISIS DE COLUMNA: {col_name}")
            print("-" * 50)
            
            try:
                # Obtener muestra de valores únicos
                cursor.execute(f"""
                    SELECT DISTINCT "{col_name}"
                    FROM historico_fondos_gsau 
                    WHERE "{col_name}" IS NOT NULL
                    ORDER BY "{col_name}" DESC
                    LIMIT 10;
                """)
                
                sample_values = cursor.fetchall()
                print(f"Muestra de valores (últimos 10 únicos):")
                for i, (value,) in enumerate(sample_values, 1):
                    print(f"  {i:2d}. {value} (tipo: {type(value).__name__})")
                
                # Obtener estadísticas básicas
                cursor.execute(f"""
                    SELECT 
                        COUNT(*) as total_registros,
                        COUNT("{col_name}") as registros_con_valor,
                        MIN("{col_name}") as valor_minimo,
                        MAX("{col_name}") as valor_maximo
                    FROM historico_fondos_gsau;
                """)
                
                stats = cursor.fetchone()
                total, with_value, min_val, max_val = stats
                
                print(f"Estadísticas:")
                print(f"  - Total registros: {total:,}")
                print(f"  - Con valor: {with_value:,} ({with_value/total*100:.1f}%)")
                print(f"  - Valor mínimo: {min_val}")
                print(f"  - Valor máximo: {max_val}")
                
            except Exception as e:
                print(f"  ❌ Error analizando columna {col_name}: {e}")
        
        # 4. Buscar específicamente las columnas que usa el código actual
        print(f"\n🎯 ANÁLISIS DE COLUMNAS ESPECÍFICAS USADAS EN EL CÓDIGO")
        print("-" * 60)
        
        expected_columns = ['cveper', 'fecha_calculo', 'fecha_fpl', 'fecha', 'Fecha']
        
        for expected_col in expected_columns:
            # Verificar si la columna existe
            column_exists = any(col[0] == expected_col for col in columns)
            
            if column_exists:
                print(f"\n✅ Columna '{expected_col}' encontrada")
                try:
                    cursor.execute(f"""
                        SELECT DISTINCT "{expected_col}"
                        FROM historico_fondos_gsau 
                        WHERE "{expected_col}" IS NOT NULL
                        ORDER BY "{expected_col}" DESC
                        LIMIT 5;
                    """)
                    
                    values = cursor.fetchall()
                    print(f"   Valores de muestra:")
                    for value, in values:
                        print(f"     • {value}")
                        
                except Exception as e:
                    print(f"   ❌ Error consultando: {e}")
            else:
                print(f"❌ Columna '{expected_col}' NO encontrada")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error conectando a la base de datos: {e}")

def generate_date_format_recommendations():
    """
    Genera recomendaciones para homologar formatos de fecha
    """
    print(f"\n💡 RECOMENDACIONES PARA HOMOLOGACIÓN DE FECHAS")
    print("=" * 60)
    
    print("""
1. 📝 FORMATOS COMUNES ESPERADOS:
   - Frontend envía: YYYY-MM-DD (ej: '2025-06-30')
   - PostgreSQL date: YYYY-MM-DD
   - PostgreSQL timestamp: YYYY-MM-DD HH:MM:SS[.fff]
   
2. 🔧 ESTRATEGIAS DE HOMOLOGACIÓN:

   A) Si la columna es tipo DATE:
      WHERE DATE(columna_fecha) = DATE($1)
   
   B) Si la columna es tipo TIMESTAMP:
      WHERE DATE(columna_fecha) = $1
      -- O más específico:
      WHERE columna_fecha::date = $1::date
   
   C) Si la columna es tipo TEXT con fechas:
      WHERE TO_DATE(columna_fecha, 'YYYY-MM-DD') = $1::date
   
   D) Comparación flexible:
      WHERE DATE_TRUNC('day', columna_fecha) = DATE_TRUNC('day', $1::timestamp)

3. 🛠️ CÓDIGO RECOMENDADO PARA fondosService.js:
   
   // Normalizar fecha de entrada
   let fechaValue = cveper;
   if (typeof fechaValue === 'string' && fechaValue.includes('T')) {
     fechaValue = fechaValue.split('T')[0];
   }
   
   // Usar comparación por fecha (no timestamp)
   whereConditions.push(`(
     DATE(cveper) = $${paramIndex}::date OR 
     DATE(fecha_calculo) = $${paramIndex}::date OR 
     DATE(fecha_fpl) = $${paramIndex}::date OR 
     DATE("Fecha") = $${paramIndex}::date
   )`);
   
4. 🧪 PRUEBAS RECOMENDADAS:
   - Probar con fecha: '2025-06-30'
   - Probar con timestamp: '2025-06-30T00:00:00'
   - Verificar timezone handling
   """)

def test_date_queries():
    """
    Prueba diferentes formatos de consulta de fecha
    """
    print(f"\n🧪 PRUEBAS DE CONSULTAS DE FECHA")
    print("=" * 50)
    
    test_rfc = "AOHM980311PY9"  # RFC del ejemplo
    test_date = "2025-06-30"    # Fecha del ejemplo
    
    try:
        conn = psycopg2.connect(**FONDOS_DB_CONFIG)
        cursor = conn.cursor()
        
        # Identificar la columna de fecha principal
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'historico_fondos_gsau'
            AND (column_name ILIKE '%fecha%' OR column_name ILIKE '%date%' 
                 OR column_name = 'cveper' OR data_type LIKE '%date%' 
                 OR data_type LIKE '%timestamp%')
            ORDER BY ordinal_position;
        """)
        
        date_columns = cursor.fetchall()
        print(f"Columnas de fecha a probar: {[col[0] for col in date_columns]}")
        
        for col_name, data_type in date_columns:
            print(f"\n🔍 Probando consulta en columna '{col_name}' ({data_type})")
            
            try:
                # Estrategia 1: Comparación directa
                cursor.execute(f"""
                    SELECT COUNT(*) as total
                    FROM historico_fondos_gsau 
                    WHERE "{col_name}" = %s;
                """, (test_date,))
                
                direct_count = cursor.fetchone()[0]
                print(f"   Comparación directa: {direct_count} registros")
                
                # Estrategia 2: Usando DATE()
                cursor.execute(f"""
                    SELECT COUNT(*) as total
                    FROM historico_fondos_gsau 
                    WHERE DATE("{col_name}") = %s::date;
                """, (test_date,))
                
                date_count = cursor.fetchone()[0]
                print(f"   Usando DATE(): {date_count} registros")
                
                # Estrategia 3: Cast a date
                cursor.execute(f"""
                    SELECT COUNT(*) as total
                    FROM historico_fondos_gsau 
                    WHERE "{col_name}"::date = %s::date;
                """, (test_date,))
                
                cast_count = cursor.fetchone()[0]
                print(f"   Usando ::date: {cast_count} registros")
                
                if max(direct_count, date_count, cast_count) > 0:
                    print(f"   ✅ Columna '{col_name}' tiene datos para la fecha {test_date}")
                
            except Exception as e:
                print(f"   ❌ Error probando columna {col_name}: {e}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error en pruebas de fecha: {e}")

if __name__ == "__main__":
    analyze_date_columns()
    generate_date_format_recommendations()
    test_date_queries()
