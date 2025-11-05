#!/usr/bin/env python3
"""
Script para identificar campos de aportaciones patronales en la base de datos
"""

import psycopg2
from dotenv import load_dotenv
import os
import re

def load_env():
    """Cargar configuración"""
    env_path = "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\.env"
    if os.path.exists(env_path):
        load_dotenv(env_path)
        return True
    return False

def connect_historic():
    """Conectar a Historic"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('PGHOST', 'dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com'),
            dbname=os.getenv('PGDATABASE', 'Historic'),
            user=os.getenv('PGUSER'),
            password=os.getenv('PGPASSWORD'),
            port=int(os.getenv('PGPORT', '5432')),
            connect_timeout=5,
        )
        return conn
    except Exception as e:
        print(f"❌ Error conectando a Historic: {e}")
        return None

def identify_patronal_fields():
    """Identificar campos relacionados con aportaciones patronales"""
    print("🔍 IDENTIFICANDO CAMPOS DE APORTACIONES PATRONALES")
    print("=" * 60)
    
    if not load_env():
        print("❌ No se pudo cargar el archivo .env")
        return False
    
    conn = connect_historic()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # 1. Obtener todos los nombres de columnas
        cursor.execute('''
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY column_name
        ''')
        
        all_columns = [row[0] for row in cursor.fetchall()]
        
        # 2. Filtrar campos relacionados con aportaciones patronales
        patronal_keywords = [
            'IMSS', 'INFONAVIT', 'FPL', 'PATRONAL', 'APORTACION', 'CUOTA',
            'INCAPACIDAD', 'SEGURO', 'PRIMA', 'NOMINA', 'IMPUESTO', 'AYUDA',
            'OBLIGACION', 'CONTRIBUCION'
        ]
        
        patronal_fields = []
        
        for column in all_columns:
            column_upper = column.upper()
            for keyword in patronal_keywords:
                if keyword in column_upper:
                    patronal_fields.append(column)
                    break
        
        print(f"📊 CAMPOS POTENCIALES DE APORTACIONES PATRONALES:")
        print(f"   Total de columnas en la tabla: {len(all_columns)}")
        print(f"   Campos relacionados con patronales: {len(patronal_fields)}")
        
        # 3. Analizar cada campo encontrado
        fields_with_data = {}
        
        for field in patronal_fields:
            try:
                cursor.execute(f'''
                    SELECT 
                        COUNT(*) as total_registros,
                        COUNT(*) FILTER (WHERE "{field}" > 0) as registros_con_datos,
                        COUNT(*) FILTER (WHERE "{field}" IS NOT NULL) as registros_no_null,
                        ROUND(AVG("{field}"), 2) as promedio,
                        MIN("{field}") as minimo,
                        MAX("{field}") as maximo
                    FROM historico_nominas_gsau
                    WHERE "{field}" IS NOT NULL
                ''')
                
                total, con_datos, no_null, promedio, minimo, maximo = cursor.fetchone()
                
                percentage = (con_datos / total * 100) if total > 0 else 0
                
                fields_with_data[field] = {
                    'total': total,
                    'con_datos': con_datos,
                    'no_null': no_null,
                    'porcentaje': percentage,
                    'promedio': float(promedio) if promedio else 0,
                    'minimo': float(minimo) if minimo else 0,
                    'maximo': float(maximo) if maximo else 0
                }
                
                status = "✅" if con_datos > 100 else "⚠️" if con_datos > 0 else "❌"
                print(f"\n   {status} {field}:")
                print(f"      🔢 Registros con datos > 0: {con_datos:,} ({percentage:.1f}%)")
                print(f"      💰 Rango: ${minimo:,.2f} - ${maximo:,.2f}")
                if promedio > 0:
                    print(f"      📊 Promedio: ${promedio:,.2f}")
                    
            except Exception as e:
                print(f"   ❌ Error analizando {field}: {e}")
        
        # 4. Identificar campos más importantes (con más datos)
        important_fields = {k: v for k, v in fields_with_data.items() 
                          if v['con_datos'] > 100 and v['maximo'] > 0}
        
        important_fields_sorted = sorted(important_fields.items(), 
                                       key=lambda x: x[1]['con_datos'], 
                                       reverse=True)
        
        print(f"\n🎯 CAMPOS IMPORTANTES PARA APORTACIONES PATRONALES:")
        print(f"   (Con más de 100 registros con datos)")
        
        mapping_info = {}
        
        for field, info in important_fields_sorted:
            print(f"\n   🏆 {field}")
            print(f"      📊 {info['con_datos']:,} registros con datos ({info['porcentaje']:.1f}%)")
            print(f"      💰 Máximo: ${info['maximo']:,.2f}")
            print(f"      📈 Promedio: ${info['promedio']:,.2f}")
            
            mapping_info[field] = {
                'registros_con_datos': info['con_datos'],
                'porcentaje': info['porcentaje'],
                'promedio': info['promedio'],
                'maximo': info['maximo']
            }
        
        # 5. Generar ejemplos de datos reales
        print(f"\n📋 EJEMPLOS DE DATOS REALES:")
        
        if important_fields_sorted:
            # Tomar los 5 campos más importantes
            top_fields = [field for field, _ in important_fields_sorted[:5]]
            
            fields_sql = ', '.join([f'"{field}"' for field in top_fields])
            
            cursor.execute(f'''
                SELECT 
                    "CURP",
                    "Nombre completo",
                    {fields_sql}
                FROM historico_nominas_gsau
                WHERE {' OR '.join([f'"{field}" > 0' for field in top_fields])}
                LIMIT 3
            ''')
            
            examples = cursor.fetchall()
            
            if examples:
                print("   Empleados con datos de aportaciones patronales:")
                
                for i, row in enumerate(examples, 1):
                    curp, nombre = row[0], row[1]
                    values = row[2:]
                    
                    print(f"\n   👤 {i}. {nombre} (CURP: {curp})")
                    
                    for j, field in enumerate(top_fields):
                        value = values[j] if j < len(values) else 0
                        if value and value > 0:
                            print(f"      💰 {field}: ${value:,.2f}")
        
        # 6. Guardar mapeo para el componente
        component_mapping = {}
        friendly_names = {
            'IMSS': 'IMSS Patronal',
            'INFONAVIT': 'Infonavit',
            'FPL': 'Fondo de Productividad Laboral',
            'INCAPACIDAD': 'Ayuda por Incapacidad',
            'PRIMA': 'Primas de Seguro',
            'IMPUESTO': 'Impuesto sobre Nómina',
            'CUOTA': 'Cuotas Patronales',
            'APORTACION': 'Aportaciones'
        }
        
        for field, info in important_fields_sorted:
            # Buscar nombre amigable
            friendly_name = field
            for keyword, name in friendly_names.items():
                if keyword.upper() in field.upper():
                    friendly_name = name
                    break
            
            component_mapping[field] = {
                'friendly_name': friendly_name,
                'field_name': field,
                'has_data': info['con_datos'] > 0,
                'data_count': info['con_datos']
            }
        
        return component_mapping, important_fields_sorted
        
    except Exception as e:
        print(f"❌ Error identificando campos: {e}")
        return None, None
    finally:
        conn.close()

def generate_component_update(mapping, important_fields):
    """Generar código actualizado para el componente"""
    print(f"\n🔧 GENERANDO CÓDIGO ACTUALIZADO PARA EL COMPONENTE")
    print("=" * 55)
    
    if not mapping or not important_fields:
        print("❌ No hay campos válidos para generar el componente")
        return
    
    # Tomar los 8 campos más importantes
    top_8_fields = important_fields[:8]
    
    print("📝 Campos seleccionados para el componente:")
    for field, info in top_8_fields:
        print(f"   ✅ {field}: {info['con_datos']:,} registros")
    
    # Generar mapeo de campos
    field_mapping_js = "// Mapeo de campos de aportaciones patronales\n"
    field_mapping_js += "const APORTACIONES_FIELDS = {\n"
    
    for field, _ in top_8_fields:
        clean_name = field.replace(' ', '').replace('"', '')
        field_mapping_js += f'  {clean_name.lower()}: "{field}",\n'
    
    field_mapping_js += "};\n"
    
    print(f"\n📋 Mapeo de campos generado:")
    print(field_mapping_js)
    
    return field_mapping_js, [field for field, _ in top_8_fields]

def main():
    print("🏛️ ANÁLISIS DE APORTACIONES PATRONALES")
    print("=" * 50)
    print("🎯 Identificando campos reales en la base de datos\n")
    
    # 1. Identificar campos
    mapping, important_fields = identify_patronal_fields()
    
    if not mapping:
        print("❌ No se pudieron identificar campos válidos")
        return
    
    # 2. Generar actualización del componente
    field_mapping, selected_fields = generate_component_update(mapping, important_fields)
    
    # 3. Mostrar resumen final
    print(f"\n🎯 RESUMEN FINAL:")
    print("=" * 20)
    print(f"✅ Campos identificados: {len(mapping)}")
    print(f"✅ Campos con datos significativos: {len(important_fields)}")
    print(f"✅ Campos seleccionados para componente: {len(selected_fields)}")
    
    print(f"\n🔧 PRÓXIMOS PASOS:")
    print("1. Actualizar componente AportacionesPatronales.jsx")
    print("2. Cambiar RFC → CURP")
    print("3. Usar campos reales en lugar de valores hardcoded")
    print("4. Implementar mapeo de campos identificados")

if __name__ == "__main__":
    main()
