#!/usr/bin/env python3
"""
Script para generar mapeo completo de perfil de empleado
con todos los 104 campos disponibles en Historic
"""

import psycopg2
import json

def connect_historic():
    """Conectar a Historic (base correcta con datos reales)"""
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

def analyze_all_employee_fields():
    """Analizar todos los campos para perfil de empleado"""
    conn = connect_historic()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        
        print("🔍 ANÁLISIS COMPLETO DE PERFIL DE EMPLEADO")
        print("=" * 60)
        print("📊 Analizando 104 campos en Historic.historico_nominas_gsau")
        
        # Obtener todas las columnas con información detallada
        cursor.execute("""
            SELECT ordinal_position, column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        all_columns = cursor.fetchall()
        
        # Categorizar campos por tipo
        employee_profile = {
            'informacion_personal': [],
            'informacion_laboral': [],
            'percepciones': [],
            'deducciones': [],
            'calculos_nomina': [],
            'fechas': [],
            'otros': []
        }
        
        field_analysis = {}
        
        for pos, col_name, data_type in all_columns:
            print(f"\n🔍 Analizando campo {pos}: '{col_name}'")
            
            # Analizar si tiene datos
            try:
                cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL')
                total_count = cursor.fetchone()[0]
                
                cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL AND CAST("{col_name}" AS TEXT) != \'\'')
                non_empty_count = cursor.fetchone()[0]
                
                # Para campos numéricos, contar valores > 0
                if data_type in ['numeric', 'integer', 'double precision']:
                    cursor.execute(f'SELECT COUNT(*) FROM historico_nominas_gsau WHERE "{col_name}" > 0')
                    positive_count = cursor.fetchone()[0]
                else:
                    positive_count = non_empty_count
                
                # Obtener muestra de datos
                if positive_count > 0:
                    cursor.execute(f'SELECT "{col_name}" FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL AND CAST("{col_name}" AS TEXT) != \'\' LIMIT 3')
                    sample_data = cursor.fetchall()
                    samples = [str(r[0])[:20] for r in sample_data] if sample_data else []
                else:
                    samples = []
                
                # Clasificar campo
                category = classify_field(col_name, data_type)
                
                field_info = {
                    'position': pos,
                    'name': col_name,
                    'data_type': data_type,
                    'total_records': total_count,
                    'non_empty_records': non_empty_count,
                    'positive_records': positive_count,
                    'sample_data': samples,
                    'category': category,
                    'has_data': positive_count > 0
                }
                
                field_analysis[col_name] = field_info
                employee_profile[category].append(field_info)
                
                status = "✅" if positive_count > 0 else "❌"
                print(f"  {status} {category}: {positive_count:,} registros con datos")
                if samples:
                    print(f"    📊 Muestra: {samples}")
                
            except Exception as e:
                print(f"  ⚠️ Error analizando '{col_name}': {e}")
                field_analysis[col_name] = {
                    'name': col_name,
                    'data_type': data_type,
                    'error': str(e),
                    'has_data': False
                }
        
        return employee_profile, field_analysis
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        return {}, {}
    finally:
        conn.close()

def classify_field(field_name, data_type):
    """Clasificar campo según su propósito en el perfil de empleado"""
    field_lower = field_name.lower()
    
    # Información Personal
    personal_keywords = ['rfc', 'curp', 'nombre', 'sexo', 'imss']
    if any(keyword in field_lower for keyword in personal_keywords):
        return 'informacion_personal'
    
    # Información Laboral
    laboral_keywords = ['puesto', 'compañía', 'sucursal', 'clave', 'trabajador', 'status', 'periodicidad']
    if any(keyword in field_lower for keyword in laboral_keywords):
        return 'informacion_laboral'
    
    # Fechas
    if data_type == 'date' or 'fecha' in field_lower or 'antiguedad' in field_lower:
        return 'fechas'
    
    # Percepciones (ingresos)
    percepcion_keywords = ['sueldo', 'sdi', 'comision', 'bono', 'percep', 'ingreso', 'salario']
    if any(keyword in field_lower for keyword in percepcion_keywords):
        return 'percepciones'
    
    # Deducciones (descuentos)
    deduccion_keywords = ['descuento', 'deduccion', 'impuesto', 'ispt', 'imss', 'infonavit']
    if any(keyword in field_lower for keyword in deduccion_keywords):
        return 'deducciones'
    
    # Cálculos de Nómina
    calculo_keywords = ['total', 'neto', 'costo', 'facturar', 'ptu']
    if any(keyword in field_lower for keyword in calculo_keywords):
        return 'calculos_nomina'
    
    return 'otros'

def generate_employee_profile_mapping(employee_profile, field_analysis):
    """Generar mapeo completo para perfil de empleado"""
    print(f"\n📋 MAPEO COMPLETO DE PERFIL DE EMPLEADO")
    print("=" * 60)
    
    mapping = {}
    
    for category, fields in employee_profile.items():
        print(f"\n🏷️ {category.upper().replace('_', ' ')}")
        print("-" * 40)
        
        category_mapping = {}
        available_count = 0
        
        for field_info in fields:
            name = field_info['name']
            has_data = field_info['has_data']
            data_count = field_info.get('positive_records', 0)
            samples = field_info.get('sample_data', [])
            
            status = "✅" if has_data else "❌"
            
            # Crear nombre de campo para backend (camelCase)
            backend_name = create_backend_field_name(name)
            
            print(f"{status} {backend_name:<25} -> '{name}'")
            if has_data:
                print(f"    📊 {data_count:,} registros | Tipo: {field_info['data_type']}")
                if samples:
                    print(f"    💡 Ejemplo: {samples[0]}")
                available_count += 1
            else:
                print(f"    ⚠️  Sin datos | Tipo: {field_info['data_type']}")
            
            category_mapping[backend_name] = {
                'database_field': name,
                'data_type': field_info['data_type'],
                'has_data': has_data,
                'record_count': data_count,
                'sample_data': samples
            }
        
        mapping[category] = category_mapping
        print(f"\n📊 Resumen: {available_count}/{len(fields)} campos con datos")
    
    return mapping

def create_backend_field_name(db_field_name):
    """Convertir nombre de campo de DB a nombre de backend (camelCase)"""
    # Limpiar espacios y caracteres especiales
    cleaned = db_field_name.strip()
    
    # Casos específicos conocidos
    specific_mappings = {
        'RFC': 'rfc',
        'CURP': 'curp',
        'Nombre completo': 'nombreCompleto',
        'Compañía': 'empresa',
        'Puesto': 'puesto',
        'Status': 'status',
        'Mes': 'mes',
        'Periodicidad': 'periodicidad',
        ' SDI ': 'sdi',
        ' sdi_es ': 'sdiEspecial',
        ' SD ': 'salarioDiario',
        ' sdim ': 'salarioDiarioIntegrado',
        ' SUELDO CLIENTE ': 'sueldoCliente',
        'Fecha antigüedad': 'fechaAntiguedad',
        'Fecha baja': 'fechaBaja',
        'Número IMSS': 'numeroIMSS',
        'Clave trabajador': 'claveTrabajador'
    }
    
    if cleaned in specific_mappings:
        return specific_mappings[cleaned]
    
    # Conversión general
    # Remover espacios y convertir a camelCase
    words = cleaned.replace('  ', ' ').strip().split(' ')
    if not words:
        return cleaned.lower()
    
    # Primera palabra en minúsculas, resto con primera letra mayúscula
    result = words[0].lower()
    for word in words[1:]:
        if word:
            result += word[0].upper() + word[1:].lower()
    
    # Limpiar caracteres especiales
    result = ''.join(c for c in result if c.isalnum())
    
    return result

def generate_sql_queries(mapping):
    """Generar queries SQL para diferentes casos de uso"""
    print(f"\n🔧 QUERIES SQL PARA PERFIL DE EMPLEADO")
    print("=" * 50)
    
    # Query básica de perfil
    basic_fields = []
    for category, fields in mapping.items():
        for backend_name, field_info in fields.items():
            if field_info['has_data'] and category in ['informacion_personal', 'informacion_laboral']:
                basic_fields.append(f'"{field_info["database_field"]}" as {backend_name}')
    
    basic_query = f"""
-- PERFIL BÁSICO DE EMPLEADO
SELECT 
    {(',    ' + chr(10)).join(basic_fields[:10])}
FROM historico_nominas_gsau
WHERE "RFC" IS NOT NULL
ORDER BY "RFC", "Mes";
"""
    
    # Query completa de nómina
    nomina_fields = []
    for category, fields in mapping.items():
        if category in ['percepciones', 'calculos_nomina']:
            for backend_name, field_info in fields.items():
                if field_info['has_data']:
                    nomina_fields.append(f'"{field_info["database_field"]}" as {backend_name}')
    
    nomina_query = f"""
-- DATOS COMPLETOS DE NÓMINA
SELECT 
    "RFC" as rfc,
    "Mes" as mes,
    {(',    ' + chr(10)).join(nomina_fields[:15])}
FROM historico_nominas_gsau
WHERE "RFC" = :rfc AND "Mes" = :mes;
"""
    
    return {
        'perfil_basico': basic_query,
        'nomina_completa': nomina_query
    }

def save_mapping_to_files(mapping, queries):
    """Guardar mapeo y queries en archivos"""
    
    # Guardar mapeo JSON
    mapping_file = "C:\\Users\\alber\\Autonumerica\\Numerica\\MAPEO_PERFIL_EMPLEADO_COMPLETO.json"
    with open(mapping_file, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False, default=str)
    
    # Guardar queries SQL
    sql_file = "C:\\Users\\alber\\Autonumerica\\Numerica\\QUERIES_PERFIL_EMPLEADO.sql"
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- QUERIES PARA PERFIL DE EMPLEADO\n")
        f.write("-- Generado automáticamente desde Historic.historico_nominas_gsau\n")
        f.write("-- 104 campos analizados\n\n")
        
        for query_name, query in queries.items():
            f.write(f"-- {query_name.upper()}\n")
            f.write(query)
            f.write("\n\n")
    
    print(f"✅ Mapeo guardado en: {mapping_file}")
    print(f"✅ Queries guardadas en: {sql_file}")

def main():
    print("🎯 GENERANDO MAPEO COMPLETO DE PERFIL DE EMPLEADO")
    print("=" * 65)
    print("🌐 Base: Historic en dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com")
    print("📋 Tabla: historico_nominas_gsau (104 columnas)")
    
    # 1. Analizar todos los campos
    employee_profile, field_analysis = analyze_all_employee_fields()
    
    if not employee_profile:
        print("❌ No se pudo generar el análisis")
        return
    
    # 2. Generar mapeo
    mapping = generate_employee_profile_mapping(employee_profile, field_analysis)
    
    # 3. Generar queries SQL
    queries = generate_sql_queries(mapping)
    
    # 4. Guardar archivos
    save_mapping_to_files(mapping, queries)
    
    # 5. Resumen final
    total_fields = sum(len(fields) for fields in employee_profile.values())
    available_fields = sum(1 for category in employee_profile.values() 
                          for field in category if field['has_data'])
    
    print(f"\n🎉 MAPEO COMPLETO GENERADO")
    print("=" * 40)
    print(f"📊 Total campos analizados: {total_fields}")
    print(f"✅ Campos con datos: {available_fields}")
    print(f"❌ Campos sin datos: {total_fields - available_fields}")
    print(f"📋 Categorías: {len(employee_profile)}")
    
    for category, fields in employee_profile.items():
        available = sum(1 for f in fields if f['has_data'])
        print(f"  • {category}: {available}/{len(fields)} disponibles")

if __name__ == "__main__":
    main()
