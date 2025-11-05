#!/usr/bin/env python3
"""
Script para verificar si las consultas del dashboard deben usar CURP en lugar de RFC
"""

import psycopg2
from dotenv import load_dotenv
import os

def load_env():
    """Cargar configuración"""
    env_path = "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\.env"
    load_dotenv(env_path)

def connect_historic():
    """Conectar a Historic"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('PGHOST'),
            dbname=os.getenv('PGDATABASE'),
            user=os.getenv('PGUSER'), 
            password=os.getenv('PGPASSWORD'),
            port=int(os.getenv('PGPORT', '5432')),
            connect_timeout=3,
        )
        return conn
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return None

def analyze_rfc_vs_curp():
    """Analizar diferencias entre RFC y CURP como identificadores"""
    print("🔍 ANÁLISIS RFC vs CURP COMO IDENTIFICADORES")
    print("=" * 60)
    
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # 1. Verificar cuántos registros únicos hay por RFC vs CURP
        print("📊 COMPARACIÓN DE IDENTIFICADORES:")
        
        cursor.execute('SELECT COUNT(DISTINCT "RFC") FROM historico_nominas_gsau')
        unique_rfc = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(DISTINCT "CURP") FROM historico_nominas_gsau')
        unique_curp = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM historico_nominas_gsau')
        total_records = cursor.fetchone()[0]
        
        print(f"  📋 Total de registros: {total_records:,}")
        print(f"  🆔 RFCs únicos: {unique_rfc:,}")
        print(f"  🆔 CURPs únicos: {unique_curp:,}")
        
        # 2. Verificar si hay registros con RFC pero sin CURP o viceversa
        cursor.execute('SELECT COUNT(*) FROM historico_nominas_gsau WHERE "RFC" IS NOT NULL AND "CURP" IS NULL')
        rfc_without_curp = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM historico_nominas_gsau WHERE "RFC" IS NULL AND "CURP" IS NOT NULL')
        curp_without_rfc = cursor.fetchone()[0]
        
        print(f"\n📊 COMPLETITUD DE DATOS:")
        print(f"  🔍 RFC sin CURP: {rfc_without_curp:,}")
        print(f"  🔍 CURP sin RFC: {curp_without_rfc:,}")
        
        # 3. Obtener ejemplos de registros para ver la estructura
        print(f"\n📋 MUESTRA DE REGISTROS (RFC vs CURP):")
        cursor.execute('SELECT "RFC", "CURP", "Nombre completo" FROM historico_nominas_gsau LIMIT 5')
        samples = cursor.fetchall()
        
        for rfc, curp, nombre in samples:
            print(f"  👤 {nombre}")
            print(f"     RFC:  {rfc}")
            print(f"     CURP: {curp}")
            print()
        
        return {
            'unique_rfc': unique_rfc,
            'unique_curp': unique_curp,
            'rfc_without_curp': rfc_without_curp,
            'curp_without_rfc': curp_without_rfc
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None
    finally:
        conn.close()

def test_dashboard_queries_with_curp():
    """Probar las consultas del dashboard usando CURP en lugar de RFC"""
    print(f"\n🧪 PROBANDO CONSULTAS CON CURP")
    print("=" * 40)
    
    conn = connect_historic()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Obtener un CURP de ejemplo que tenga datos en el dashboard
        cursor.execute("""
            SELECT DISTINCT "CURP", "RFC", "Nombre completo", "Mes"
            FROM historico_nominas_gsau 
            WHERE (" BONO " > 0 OR " AGUINALDO " > 0 OR " PRIMA VACACIONAL " > 0)
            AND "CURP" IS NOT NULL
            LIMIT 3
        """)
        
        employees = cursor.fetchall()
        
        if employees:
            print(f"✅ Encontrados empleados con datos usando CURP:")
            
            for curp, rfc, nombre, mes in employees:
                print(f"\n👤 {nombre}")
                print(f"   CURP: {curp}")
                print(f"   RFC:  {rfc}")
                print(f"   Mes:  {mes}")
                
                # Probar query con CURP
                cursor.execute("""
                    SELECT 
                        " BONO ",
                        " AGUINALDO ", 
                        " PRIMA VACACIONAL ",
                        " GRATIFICACION "
                    FROM historico_nominas_gsau 
                    WHERE "CURP" = %s AND "Mes" = %s
                """, [curp, mes])
                
                curp_data = cursor.fetchone()
                
                # Probar query con RFC
                cursor.execute("""
                    SELECT 
                        " BONO ",
                        " AGUINALDO ",
                        " PRIMA VACACIONAL ",
                        " GRATIFICACION "
                    FROM historico_nominas_gsau 
                    WHERE "RFC" = %s AND "Mes" = %s
                """, [rfc, mes])
                
                rfc_data = cursor.fetchone()
                
                # Comparar resultados
                print(f"   📊 RESULTADOS POR CURP:")
                fields = ['BONO', 'AGUINALDO', 'PRIMA VACACIONAL', 'GRATIFICACIÓN']
                
                if curp_data:
                    for i, field in enumerate(fields):
                        if curp_data[i] and curp_data[i] > 0:
                            print(f"      💵 {field}: ${curp_data[i]:,.2f}")
                
                print(f"   📊 RESULTADOS POR RFC:")
                if rfc_data:
                    for i, field in enumerate(fields):
                        if rfc_data[i] and rfc_data[i] > 0:
                            print(f"      💵 {field}: ${rfc_data[i]:,.2f}")
                
                # Verificar si los resultados son iguales
                if curp_data == rfc_data:
                    print(f"   ✅ Los resultados por CURP y RFC son idénticos")
                else:
                    print(f"   ⚠️  Los resultados por CURP y RFC son diferentes!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def generate_correct_dashboard_queries():
    """Generar consultas corregidas para el dashboard usando CURP"""
    print(f"\n🔧 GENERANDO CONSULTAS CORREGIDAS CON CURP")
    print("=" * 50)
    
    # Query corregida usando CURP
    curp_query = """
-- QUERY CORREGIDA PARA DASHBOARD (usando CURP)
SELECT 
    "CURP" as curp,
    "RFC" as rfc,
    "Nombre completo" as nombre_completo,
    "Mes" as mes,
    " VALES DESPENSA NETO " as vales_despensa_neto,
    " BONO " as bono,
    " AGUINALDO " as aguinaldo,
    " GRATIFICACION " as gratificacion,
    " PRIMA VACACIONAL " as prima_vacacional,
    " COMPENSACION " as compensacion,
    " SEPTIMO DIA " as septimo_dia,
    " HORAS EXTRA DOBLE " as horas_extra_doble,
    " SUBSIDIO AL EMPLEO " as subsidio_al_empleo,
    " SUELDO X DIAS AC VACACIONES " as sueldo_x_dias_vacaciones,
    " VACACIONES FINIQUITO " as vacaciones_finiquito
FROM historico_nominas_gsau
WHERE "CURP" = :curp AND "Mes" = :mes;
"""
    
    print("📝 Query usando CURP:")
    print(curp_query)
    
    # Guardar query corregida
    with open("C:\\Users\\alber\\Autonumerica\\Numerica\\DASHBOARD_QUERIES_CURP.sql", 'w', encoding='utf-8') as f:
        f.write("-- QUERIES CORREGIDAS PARA DASHBOARD USANDO CURP\n")
        f.write("-- Base: Historic.historico_nominas_gsau\n\n")
        f.write(curp_query)
        f.write("\n\n-- Query individual por campo:\n")
        
        dashboard_fields = [
            "VALES DESPENSA NETO", "BONO", "AGUINALDO", "GRATIFICACION",
            "PRIMA VACACIONAL", "COMPENSACION", "SEPTIMO DIA"
        ]
        
        for field in dashboard_fields:
            f.write(f"\n-- {field}\n")
            f.write(f'SELECT " {field} " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;\n')
    
    print(f"✅ Queries guardadas en: DASHBOARD_QUERIES_CURP.sql")

def find_backend_references_to_rfc():
    """Buscar referencias a RFC en el código del backend"""
    print(f"\n🔍 BUSCANDO REFERENCIAS A RFC EN EL BACKEND")
    print("=" * 50)
    
    backend_files = [
        "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\src\\main.py",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\src\\db.py",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\src\\models.py"
    ]
    
    for file_path in backend_files:
        if os.path.exists(file_path):
            print(f"\n📄 Analizando: {os.path.basename(file_path)}")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Buscar referencias a RFC
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if 'RFC' in line.upper() and ('SELECT' in line.upper() or 'WHERE' in line.upper() or 'rfc' in line.lower()):
                        print(f"  📍 Línea {i}: {line.strip()}")
                        
            except Exception as e:
                print(f"  ❌ Error leyendo {file_path}: {e}")
        else:
            print(f"❌ No encontrado: {file_path}")

def main():
    print("🎯 VERIFICACIÓN: ¿EL DASHBOARD USA CURP EN LUGAR DE RFC?")
    print("=" * 65)
    print("💡 Investigando si las consultas deben usar CURP como identificador")
    
    load_env()
    
    # 1. Analizar RFC vs CURP
    stats = analyze_rfc_vs_curp()
    
    # 2. Probar consultas con CURP
    test_dashboard_queries_with_curp()
    
    # 3. Generar consultas corregidas
    generate_correct_dashboard_queries()
    
    # 4. Buscar referencias en el backend
    find_backend_references_to_rfc()
    
    print(f"\n🎯 CONCLUSIÓN:")
    print("=" * 20)
    if stats:
        if stats['unique_rfc'] == stats['unique_curp']:
            print("✅ RFC y CURP tienen la misma cantidad de valores únicos")
            print("💡 Probablemente ambos funcionan como identificadores")
        else:
            print("⚠️  RFC y CURP tienen diferente cantidad de valores únicos")
            print("💡 Es importante usar el identificador correcto")
    
    print("\n🔧 ACCIÓN REQUERIDA:")
    print("1. Verificar si el frontend/dashboard envía CURP o RFC")
    print("2. Actualizar todas las queries para usar el identificador correcto")
    print("3. Usar las queries de DASHBOARD_QUERIES_CURP.sql si es necesario")

if __name__ == "__main__":
    main()
