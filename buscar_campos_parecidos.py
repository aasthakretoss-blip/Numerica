#!/usr/bin/env python3
"""
Script para buscar campos parecidos agregando espacios y buscando similitudes
"""

import psycopg2
import re
from difflib import SequenceMatcher

def connect_gsaudb():
    """Conectar a GSAUDB"""
    try:
        connection = psycopg2.connect(
            host="gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            port=5432,
            database="GSAUDB",
            user="postgres",
            password="SanNicolasTotolapan23_Gloria5!",
            sslmode='require'
        )
        return connection
    except Exception as e:
        print(f"❌ Error conectando a GSAUDB: {e}")
        return None

def get_all_columns():
    """Obtener todas las columnas de historico_nominas_gsau"""
    conn = connect_gsaudb()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'historico_nominas_gsau'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        return columns
        
    except Exception as e:
        print(f"❌ Error obteniendo columnas: {e}")
        return []
    finally:
        conn.close()

def similarity(a, b):
    """Calcular similitud entre dos strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def generate_space_variations(field_name):
    """Generar variaciones con espacios para un campo"""
    variations = []
    
    # Variación 1: Agregar espacios al inicio y final
    variations.append(f" {field_name} ")
    
    # Variación 2: Solo espacio al inicio
    variations.append(f" {field_name}")
    
    # Variación 3: Solo espacio al final
    variations.append(f"{field_name} ")
    
    # Variación 4: Convertir camelCase a espacios
    # RFC -> RFC, sueldoCliente -> SUELDO CLIENTE
    spaced = re.sub(r'([a-z])([A-Z])', r'\1 \2', field_name).upper()
    variations.extend([
        spaced,
        f" {spaced} ",
        f" {spaced}",
        f"{spaced} "
    ])
    
    # Variación 5: Palabras clave específicas
    keyword_mapping = {
        'sueldo': 'SUELDO',
        'cliente': 'CLIENTE', 
        'comisiones': 'COMISIONES',
        'total': 'TOTAL',
        'percepciones': 'PERCEPCIONES',
        'deducciones': 'DEDUCCIONES',
        'neto': 'NETO',
        'antes': 'ANTES',
        'vales': 'VALES',
        'pagar': 'PAGAR',
        'cargo': 'COSTO',
        'carga': 'COSTO',
        'social': 'NOMINA',
        'nomina': 'NOMINA'
    }
    
    for original, replacement in keyword_mapping.items():
        if original in field_name.lower():
            new_field = field_name.lower().replace(original, replacement)
            variations.extend([
                new_field,
                f" {new_field} ",
                f" {new_field}",
                f"{new_field} "
            ])
    
    return list(set(variations))  # Eliminar duplicados

def find_matching_fields():
    """Buscar campos coincidentes con diferentes estrategias"""
    
    # Campos que buscamos de postgres
    target_fields = [
        'RFC', 'rfc',
        'mes', 'Mes', 'MES',
        'cargaSocial', 'carga_social', 'CARGA_SOCIAL', 'COSTO_NOMINA', 'COSTO DE NOMINA',
        'uploadBatch', 'upload_batch', 'BATCH', 'LOTE',
        'dataHash', 'data_hash', 'HASH',
        'createdAt', 'created_at', 'FECHA_CREACION', 'fechaCreacion',
        'updatedAt', 'updated_at', 'FECHA_ACTUALIZACION', 'fechaActualizacion',
        'puestoCategorizado', 'puesto_categorizado', 'PUESTO_CATEGORIZADO',
        'claveEmpresa', 'clave_empresa', 'CLAVE_EMPRESA',
        'tiposNomina', 'tipos_nomina', 'TIPOS_NOMINA', 'TIPO_NOMINA'
    ]
    
    print("🔍 BUSCANDO CAMPOS CON ESPACIOS Y SIMILITUDES")
    print("=" * 60)
    
    # Obtener todas las columnas reales
    all_columns = get_all_columns()
    if not all_columns:
        print("❌ No se pudieron obtener las columnas")
        return
    
    print(f"📋 Total de columnas en GSAUDB: {len(all_columns)}")
    
    found_matches = {}
    potential_matches = {}
    
    for target_field in target_fields:
        print(f"\n🎯 Buscando: '{target_field}'")
        
        best_match = None
        best_similarity = 0
        exact_matches = []
        
        # Generar variaciones del campo objetivo
        variations = generate_space_variations(target_field)
        
        for col_name, col_type in all_columns:
            # Búsqueda exacta (incluyendo variaciones)
            if col_name == target_field or col_name in variations:
                exact_matches.append((col_name, col_type))
                print(f"  ✅ COINCIDENCIA EXACTA: '{col_name}' ({col_type})")
                
            # Búsqueda por similitud
            sim = similarity(target_field, col_name)
            if sim > best_similarity and sim > 0.6:  # 60% de similitud mínima
                best_similarity = sim
                best_match = (col_name, col_type, sim)
        
        if exact_matches:
            found_matches[target_field] = exact_matches
        elif best_match:
            potential_matches[target_field] = best_match
            sim_percent = int(best_match[2] * 100)
            print(f"  🔍 SIMILITUD {sim_percent}%: '{best_match[0]}' ({best_match[1]})")
        else:
            print(f"  ❌ NO ENCONTRADO")
    
    return found_matches, potential_matches

def test_field_queries(found_matches):
    """Probar queries con los campos encontrados"""
    print(f"\n🚀 PROBANDO CONSULTAS CON CAMPOS ENCONTRADOS")
    print("=" * 60)
    
    conn = connect_gsaudb()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        for target_field, matches in found_matches.items():
            print(f"\n🎯 Campo objetivo: {target_field}")
            
            for col_name, col_type in matches:
                try:
                    # Construir query de prueba
                    query = f'SELECT "{col_name}" FROM historico_nominas_gsau WHERE "{col_name}" IS NOT NULL LIMIT 3'
                    
                    cursor.execute(query)
                    results = cursor.fetchall()
                    
                    print(f"  ✅ '{col_name}': {len(results)} registros")
                    
                    if results:
                        print(f"     Muestra: {results[0][0]}")
                        
                except Exception as e:
                    print(f"  ❌ Error con '{col_name}': {e}")
    
    except Exception as e:
        print(f"❌ Error general: {e}")
    finally:
        conn.close()

def generate_complete_mapping():
    """Generar mapeo completo incluyendo campos encontrados"""
    print(f"\n📋 MAPEO COMPLETO DE CAMPOS")
    print("=" * 60)
    
    # Mapeo conocido + nuevos hallazgos
    complete_mapping = {
        # Campos monetarios (ya conocidos)
        'sueldoCliente': '" SUELDO CLIENTE "',
        'comisionesCliente': '" COMISIONES CLIENTE "',
        'totalPercepciones': '" TOTAL DE PERCEPCIONES "',
        'totalDeducciones': '" TOTAL DEDUCCIONES "',
        'netoAntesVales': '" NETO ANTES DE VALES "',
        'netoDespuesVales': '" NETO A PAGAR "',
        'sd': '" SD "',
        'sdi': '" SDI "',
        
        # Campos de información
        'rfc': '"RFC"',
        'nombreCompleto': '"Nombre completo"',
        'empresa': '"Compañía"',
        'puesto': '"Puesto"',
        'curp': '"CURP"',
        'mes': '"Mes"',
        
        # Campos de fechas
        'fechaAntiguedad': '"Fecha antigüedad"',
        'fechaBaja': '"Fecha baja"',
        'cveper': '"cveper"',
        
        # Campos adicionales encontrados
        'sucursal': '"Sucursal"',
        'localidad': '"Localidad"',
        'periodicidad': '"Periodicidad"',
        'claveTrabajador': '"Clave trabajador"',
        'sexo': '"Sexo"',
        'numeroIMSS': '"Número IMSS"',
        'status': '"Status"',
        'periodo': '"Periodo"',
        'tipo': '" tipo "',
        'ptu': '"PTU"',
        
        # Campos adicionales con espacios
        'sueldo': '" SUELDO "',
        'costoNomina': '" COSTO DE NOMINA "',
        'totalFacturar': '" TOTAL A FACTURAR "',
    }
    
    print("Postgres -> GSAUDB")
    print("-" * 40)
    for pg_field, gsau_field in complete_mapping.items():
        print(f"{pg_field:<25} -> {gsau_field}")
    
    return complete_mapping

def main():
    print("🔍 BÚSQUEDA AVANZADA DE CAMPOS CON ESPACIOS")
    print("=" * 60)
    
    # 1. Buscar campos con similitudes y espacios
    found_matches, potential_matches = find_matching_fields()
    
    # 2. Probar consultas con campos encontrados
    if found_matches:
        test_field_queries(found_matches)
    
    # 3. Generar mapeo completo
    complete_mapping = generate_complete_mapping()
    
    # 4. Resumen final
    print(f"\n🎯 RESUMEN FINAL")
    print("=" * 30)
    print(f"✅ Campos con coincidencia exacta: {len(found_matches)}")
    print(f"🔍 Campos con similitud probable: {len(potential_matches)}")
    print(f"📋 Mapeo total disponible: {len(complete_mapping)}")
    
    if potential_matches:
        print(f"\n🔍 CAMPOS CON SIMILITUD PROBABLE:")
        for target, match in potential_matches.items():
            sim_percent = int(match[2] * 100)
            print(f"  {target} -> '{match[0]}' ({sim_percent}% similar)")

if __name__ == "__main__":
    main()
