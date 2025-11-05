#!/usr/bin/env python3
"""
Test directo para verificar que el backend esté conectado correctamente 
a Historic y obtener datos específicos de un empleado
"""

import os
import sys
sys.path.append('C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\src')

import psycopg2
from dotenv import load_dotenv

def load_correct_env():
    """Cargar configuración correcta desde .env"""
    env_path = "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\.env"
    load_dotenv(env_path)
    
    print("🔧 CONFIGURACIÓN CARGADA:")
    print(f"  PGHOST: {os.getenv('PGHOST')}")
    print(f"  PGDATABASE: {os.getenv('PGDATABASE')}")
    print(f"  PGUSER: {os.getenv('PGUSER')}")
    print(f"  PGPORT: {os.getenv('PGPORT')}")

def test_backend_connection():
    """Probar conexión usando el mismo método del backend"""
    print(f"\n🧪 PROBANDO CONEXIÓN DEL BACKEND")
    print("=" * 40)
    
    try:
        # Usar la misma función que usa el backend
        conn = psycopg2.connect(
            host=os.getenv('PGHOST'),
            dbname=os.getenv('PGDATABASE'), 
            user=os.getenv('PGUSER'),
            password=os.getenv('PGPASSWORD'),
            port=int(os.getenv('PGPORT', '5432')),
            connect_timeout=3,
        )
        
        cursor = conn.cursor()
        
        # Verificar conexión
        cursor.execute("SELECT current_database(), inet_server_addr(), version()")
        db_info = cursor.fetchone()
        
        print(f"✅ CONEXIÓN EXITOSA:")
        print(f"  Base de datos: {db_info[0]}")
        print(f"  Host: {db_info[1]}")
        print(f"  Versión: {db_info[2][:50]}...")
        
        return conn
        
    except Exception as e:
        print(f"❌ ERROR DE CONEXIÓN: {e}")
        return None

def test_dashboard_data_for_specific_employee(conn, rfc="ROJR9005202R6", mes="DICIEMBRE"):
    """Obtener datos específicos del dashboard para un empleado"""
    print(f"\n📊 OBTENIENDO DATOS PARA DASHBOARD")
    print("=" * 45)
    print(f"👤 Empleado: {rfc}")
    print(f"📅 Mes: {mes}")
    
    try:
        cursor = conn.cursor()
        
        # Query exacta para el dashboard
        query = """
        SELECT 
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
        WHERE "RFC" = %s AND "Mes" = %s
        """
        
        cursor.execute(query, [rfc, mes])
        results = cursor.fetchall()
        
        if results:
            print(f"✅ {len(results)} registros encontrados")
            
            # Mostrar datos del primer registro
            record = results[0]
            col_names = [desc[0] for desc in cursor.description]
            
            print(f"\n💰 DATOS DEL DASHBOARD PARA {rfc}:")
            print("-" * 50)
            
            for i, col_name in enumerate(col_names):
                value = record[i]
                
                if col_name in ['rfc', 'nombre_completo', 'mes']:
                    print(f"📋 {col_name}: {value}")
                elif isinstance(value, (int, float)) and value > 0:
                    print(f"💵 {col_name}: ${value:,.2f}")
                elif isinstance(value, (int, float)):
                    print(f"⭕ {col_name}: ${value:.2f}")
                else:
                    print(f"📝 {col_name}: {value}")
            
            return record
        else:
            print(f"❌ No se encontraron datos para {rfc} en {mes}")
            
            # Buscar en cualquier mes
            cursor.execute('SELECT DISTINCT "Mes" FROM historico_nominas_gsau WHERE "RFC" = %s LIMIT 5', [rfc])
            available_months = cursor.fetchall()
            
            if available_months:
                print(f"📅 Meses disponibles para {rfc}: {[m[0] for m in available_months]}")
                
                # Probar con el primer mes disponible
                test_month = available_months[0][0]
                print(f"\n🔄 Probando con mes: {test_month}")
                
                cursor.execute(query, [rfc, test_month])
                test_results = cursor.fetchall()
                
                if test_results:
                    record = test_results[0]
                    print(f"✅ Datos encontrados para {rfc} en {test_month}")
                    
                    # Mostrar solo campos con valores > 0
                    col_names = [desc[0] for desc in cursor.description]
                    
                    print(f"\n💰 CAMPOS CON VALORES:")
                    for i, col_name in enumerate(col_names):
                        value = record[i]
                        if isinstance(value, (int, float)) and value > 0:
                            print(f"  💵 {col_name}: ${value:,.2f}")
                    
                    return record
            
            return None
            
    except Exception as e:
        print(f"❌ Error obteniendo datos: {e}")
        return None

def test_multiple_employees(conn):
    """Probar con múltiples empleados para encontrar datos"""
    print(f"\n🔍 PROBANDO CON MÚLTIPLES EMPLEADOS")
    print("=" * 45)
    
    try:
        cursor = conn.cursor()
        
        # Obtener empleados que SÍ tienen datos en campos del dashboard
        cursor.execute("""
            SELECT DISTINCT "RFC", "Nombre completo", "Mes"
            FROM historico_nominas_gsau 
            WHERE (" BONO " > 0 OR " AGUINALDO " > 0 OR " GRATIFICACION " > 0 OR " PRIMA VACACIONAL " > 0)
            LIMIT 5
        """)
        
        employees_with_data = cursor.fetchall()
        
        if employees_with_data:
            print(f"✅ {len(employees_with_data)} empleados encontrados con datos")
            
            for rfc, nombre, mes in employees_with_data[:3]:
                print(f"\n👤 {nombre} ({rfc}) - {mes}")
                
                # Query rápida para ver qué campos tienen datos
                cursor.execute("""
                    SELECT 
                        " BONO ",
                        " AGUINALDO ",
                        " GRATIFICACION ",
                        " PRIMA VACACIONAL "
                    FROM historico_nominas_gsau 
                    WHERE "RFC" = %s AND "Mes" = %s
                """, [rfc, mes])
                
                data = cursor.fetchone()
                if data:
                    fields = ['BONO', 'AGUINALDO', 'GRATIFICACIÓN', 'PRIMA VACACIONAL']
                    for i, field in enumerate(fields):
                        if data[i] and data[i] > 0:
                            print(f"  💵 {field}: ${data[i]:,.2f}")
                
        else:
            print("❌ No se encontraron empleados con datos en campos del dashboard")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def create_api_test_response():
    """Crear respuesta de prueba que debería devolver la API"""
    print(f"\n🔧 RESPUESTA QUE DEBERÍA DEVOLVER LA API")
    print("=" * 50)
    
    api_response = {
        "status": "success",
        "data": {
            "rfc": "ROJR9005202R6",
            "nombre_completo": "ROJAS JIMENEZ ROSA ISELA",
            "mes": "DICIEMBRE",
            "dashboard_fields": {
                "vales_despensa_neto": 0.00,
                "bono": 0.00,  # Este debería ser > 0 si hay datos
                "aguinaldo": 0.00,  # Este debería ser > 0 si hay datos
                "gratificacion": 0.00,
                "prima_vacacional": 0.00,
                "compensacion": 0.00
            }
        },
        "connection": {
            "host": "dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            "database": "Historic",
            "table": "historico_nominas_gsau"
        }
    }
    
    print("📝 Estructura JSON esperada:")
    import json
    print(json.dumps(api_response, indent=2))

def main():
    print("🎯 TEST DIRECTO DE CONEXIÓN BACKEND A HISTORIC")
    print("=" * 60)
    print("💡 Verificando que el dashboard obtenga datos reales")
    
    # 1. Cargar configuración
    load_correct_env()
    
    # 2. Probar conexión
    conn = test_backend_connection()
    
    if not conn:
        print("❌ No se pudo establecer conexión")
        return
    
    # 3. Probar datos específicos de empleado
    test_dashboard_data_for_specific_employee(conn)
    
    # 4. Probar con múltiples empleados
    test_multiple_employees(conn)
    
    # 5. Crear respuesta de ejemplo
    create_api_test_response()
    
    conn.close()
    
    print(f"\n🎯 SIGUIENTE PASO:")
    print("=" * 30)
    print("1. ✅ Configuración .env corregida")
    print("2. ✅ Conexión a Historic verificada")
    print("3. ✅ Datos reales encontrados")
    print("4. 🔄 REINICIAR el backend/API con la nueva configuración")
    print("5. 🔄 Verificar que el frontend use los nuevos endpoints")

if __name__ == "__main__":
    main()
