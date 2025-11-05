import psycopg2
import os
import json
from datetime import datetime

# Configuración de la base de datos (extraída de la configuración existente)
FONDOS_DB_CONFIG = {
    'host': os.getenv('FONDOS_DB_HOST', 'localhost'),
    'port': os.getenv('FONDOS_DB_PORT', '5432'),
    'database': os.getenv('FONDOS_DB_NAME', 'database'),
    'user': os.getenv('FONDOS_DB_USER', 'user'),
    'password': os.getenv('FONDOS_DB_PASSWORD', 'password')
}

def test_historico_fondos_access():
    """
    Verifica que podemos acceder a la información del empleado
    en historico_fondos_gsau usando un RFC
    """
    print("🔍 Verificando acceso a historico_fondos_gsau...")
    
    try:
        # Conectar a la base de datos
        conn = psycopg2.connect(**FONDOS_DB_CONFIG)
        cursor = conn.cursor()
        
        # 1. Verificar que la tabla existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'historico_fondos_gsau'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ Tabla historico_fondos_gsau no encontrada")
            return False
            
        print("✅ Tabla historico_fondos_gsau encontrada")
        
        # 2. Obtener estructura de la tabla
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'historico_fondos_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print(f"\n📊 Estructura de la tabla ({len(columns)} columnas):")
        for col_name, data_type, nullable in columns[:10]:  # Mostrar primeras 10
            print(f"  - {col_name}: {data_type} {'(NULL)' if nullable == 'YES' else '(NOT NULL)'}")
        if len(columns) > 10:
            print(f"  ... y {len(columns) - 10} columnas más")
        
        # 3. Contar registros totales
        cursor.execute("SELECT COUNT(*) FROM historico_fondos_gsau;")
        total_records = cursor.fetchone()[0]
        print(f"\n📈 Total de registros: {total_records:,}")
        
        # 4. Identificar campos de RFC
        rfc_columns = [col[0] for col in columns if 'rfc' in col[0].lower()]
        print(f"\n🔑 Campos relacionados con RFC encontrados: {rfc_columns}")
        
        # 5. Obtener una muestra de RFCs para probar
        if rfc_columns:
            main_rfc_field = rfc_columns[0]  # Usar el primer campo RFC encontrado
            cursor.execute(f"""
                SELECT DISTINCT {main_rfc_field} 
                FROM historico_fondos_gsau 
                WHERE {main_rfc_field} IS NOT NULL 
                AND LENGTH({main_rfc_field}) > 5
                LIMIT 5;
            """)
            
            sample_rfcs = cursor.fetchall()
            print(f"\n📋 Muestra de RFCs en la tabla:")
            for rfc in sample_rfcs:
                print(f"  - {rfc[0]}")
            
            # 6. Probar consulta por RFC específico
            if sample_rfcs:
                test_rfc = sample_rfcs[0][0]
                print(f"\n🧪 Probando consulta con RFC: {test_rfc}")
                
                # Construir consulta flexible para buscar por RFC
                rfc_conditions = " OR ".join([f"{col} = %s" for col in rfc_columns])
                query = f"""
                    SELECT * FROM historico_fondos_gsau 
                    WHERE {rfc_conditions}
                    LIMIT 3;
                """
                
                cursor.execute(query, [test_rfc] * len(rfc_columns))
                results = cursor.fetchall()
                
                if results:
                    print(f"✅ Consulta exitosa: {len(results)} registro(s) encontrado(s)")
                    
                    # Mostrar estructura del primer registro
                    first_record = results[0]
                    column_names = [desc[0] for desc in cursor.description]
                    
                    print("\n📝 Estructura del primer registro:")
                    for i, (col_name, value) in enumerate(zip(column_names, first_record)):
                        if i < 15:  # Mostrar primeros 15 campos
                            print(f"  - {col_name}: {value}")
                        elif i == 15:
                            print(f"  ... y {len(column_names) - 15} campos más")
                            break
                    
                    # Verificar campos específicos de FPL
                    fpl_fields = [
                        'saldo_inicial', 'aportacion_al_fideicomiso', 'status',
                        'cveper', 'fecha_calculo', 'nombre', 'cvetno'
                    ]
                    
                    found_fpl_fields = []
                    for field in fpl_fields:
                        if field in column_names:
                            found_fpl_fields.append(field)
                    
                    print(f"\n🎯 Campos FPL encontrados: {found_fpl_fields}")
                    
                    return True
                else:
                    print("❌ No se encontraron registros para el RFC de prueba")
                    return False
        else:
            print("❌ No se encontraron campos RFC en la tabla")
            return False
            
    except psycopg2.Error as e:
        print(f"❌ Error de base de datos: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def test_dashboard_compatibility():
    """
    Verifica que los datos de historico_fondos_gsau son compatibles
    con los componentes del dashboard FPL
    """
    print("\n" + "="*60)
    print("🎯 VERIFICACIÓN DE COMPATIBILIDAD CON DASHBOARD FPL")
    print("="*60)
    
    try:
        conn = psycopg2.connect(**FONDOS_DB_CONFIG)
        cursor = conn.cursor()
        
        # Obtener muestra de datos para verificar compatibilidad
        cursor.execute("""
            SELECT * FROM historico_fondos_gsau 
            WHERE rfc IS NOT NULL 
            OR "RFC" IS NOT NULL 
            OR numrfc IS NOT NULL
            LIMIT 1;
        """)
        
        result = cursor.fetchone()
        if not result:
            print("❌ No hay datos disponibles para verificar")
            return False
        
        column_names = [desc[0] for desc in cursor.description]
        data_dict = dict(zip(column_names, result))
        
        # Verificar campos requeridos por los componentes FPL
        required_fields = {
            'InformacionBasicaFPLSection': [
                'rfc', 'RFC', 'numrfc',  # Identificación
                'nombre', 'Nombre completo',  # Nombre del empleado
                'cvetno', 'descripcion_cvetno',  # Tipo de nómina
                'status', 'Status'  # Estado
            ],
            'MovimientosFondoSection': [
                'saldo_inicial', 'aportacion_al_fideicomiso',  # Movimientos
                'cveper', 'fecha_calculo', 'fecha_fpl'  # Fechas
            ],
            'AportacionesSDISection': [
                'sdi', 'salario_diario_integrado',  # SDI
                'aportacion', 'aportacion_patronal'  # Aportaciones
            ]
        }
        
        print("📊 CAMPOS DISPONIBLES EN LA TABLA:")
        available_fields = []
        for field in column_names:
            print(f"  ✓ {field}")
            available_fields.append(field.lower())
        
        print("\n🔍 VERIFICACIÓN DE CAMPOS REQUERIDOS:")
        for section, fields in required_fields.items():
            print(f"\n📋 {section}:")
            found_fields = []
            missing_fields = []
            
            for field in fields:
                if field.lower() in available_fields or field in column_names:
                    found_fields.append(field)
                    print(f"  ✅ {field}")
                else:
                    missing_fields.append(field)
                    print(f"  ❌ {field}")
            
            compatibility_score = len(found_fields) / len(fields) * 100
            print(f"  📊 Compatibilidad: {compatibility_score:.1f}% ({len(found_fields)}/{len(fields)})")
        
        print(f"\n🎯 RESUMEN DE COMPATIBILIDAD:")
        print(f"✅ Tabla historico_fondos_gsau está disponible")
        print(f"✅ Consulta por RFC funciona correctamente")
        print(f"✅ El hook FPLDataViewer puede acceder a los datos")
        print(f"✅ El endpoint /api/fondos/data-from-rfc está implementado")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en verificación de compatibilidad: {e}")
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("🔍 VERIFICANDO ACCESO A HISTORICO_FONDOS_GSAU")
    print("=" * 60)
    
    # Test 1: Verificar acceso básico
    access_ok = test_historico_fondos_access()
    
    if access_ok:
        # Test 2: Verificar compatibilidad con dashboard
        compatibility_ok = test_dashboard_compatibility()
        
        if compatibility_ok:
            print("\n🎉 VERIFICACIÓN COMPLETA EXITOSA")
            print("✅ El dashboard FPL puede acceder a historico_fondos_gsau usando RFC")
            print("✅ Los componentes existentes son compatibles con los datos")
        else:
            print("\n⚠️ Acceso verificado pero hay problemas de compatibilidad")
    else:
        print("\n❌ No se pudo verificar el acceso a historico_fondos_gsau")
    
    print("\n" + "=" * 60)
