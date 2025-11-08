#!/usr/bin/env python3
"""
Script para probar el flujo completo RFC → CURP → Aportaciones Patronales
"""

import requests
import json
from datetime import datetime

def test_endpoint_busqueda_empleados():
    """Probar el endpoint busqueda-empleados"""
    print("🧪 PROBANDO ENDPOINT: /busqueda-empleados")
    print("=" * 50)
    
    # RFC de prueba conocido
    test_rfc = "AAAA860220K76"  # Antonio Alvarez
    
    try:
        # Probar con RFC
        params = {
            'search': test_rfc,
            'pageSize': '5',
            'page': '1',
            'sortBy': 'cveper',
            'sortDir': 'desc'
        }
        
        response = requests.get('https://numerica-2.onrender.com/busqueda-empleados', params=params)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Respuesta exitosa para RFC {test_rfc}")
            print(f"   📊 Registros encontrados: {len(data.get('data', []))}")
            
            if data.get('data') and len(data['data']) > 0:
                empleado = data['data'][0]
                print(f"\n   👤 Primer empleado encontrado:")
                print(f"      Nombre: {empleado.get('nombre', 'N/A')}")
                print(f"      CURP: {empleado.get('curp', 'N/A')}")
                print(f"      RFC: {empleado.get('rfc', 'N/A')}")
                print(f"      Mes: {empleado.get('mes', 'N/A')}")
                
                # Campos de aportaciones que debería tener
                aportaciones_fields = [
                    ' IMSS PATRONAL ',
                    ' INFONAVIT ',
                    ' P.FPL ',
                    ' IMPUESTO SOBRE NÓMINA ',
                    'AYUDA FPL'
                ]
                
                print(f"\n   💰 Campos de aportaciones disponibles:")
                for field in aportaciones_fields:
                    value = empleado.get(field, 'NO ENCONTRADO')
                    if value != 'NO ENCONTRADO' and value:
                        print(f"      ✅ {field.strip()}: ${value:,.2f}" if isinstance(value, (int, float)) else f"      ✅ {field.strip()}: {value}")
                    else:
                        print(f"      ❌ {field.strip()}: NO DISPONIBLE")
                
                # Mostrar todos los campos disponibles para debug
                print(f"\n   🔍 TODOS LOS CAMPOS DISPONIBLES:")
                for key, value in empleado.items():
                    if isinstance(value, (int, float)) and value > 0:
                        print(f"      {key}: {value}")
                
                return empleado.get('curp'), empleado
            else:
                print("   ⚠️  No se encontraron registros")
                return None, None
        else:
            print(f"❌ Error HTTP: {response.status_code}")
            print(f"   Respuesta: {response.text[:200]}...")
            return None, None
            
    except Exception as e:
        print(f"❌ Error probando endpoint: {e}")
        return None, None

def test_aportaciones_component_data(curp, empleado_data):
    """Simular lo que hará el componente AportacionesPatronales"""
    print(f"\n🏛️ SIMULANDO COMPONENTE APORTACIONES PATRONALES")
    print("=" * 55)
    
    if not curp:
        print("❌ No hay CURP para probar el componente")
        return
    
    print(f"   🔑 CURP recibido: {curp}")
    
    # Simular mapeo del componente
    APORTACIONES_FIELDS = {
        'imssPatronal': ' IMSS PATRONAL ',
        'infonavit': ' INFONAVIT ',
        'pfpl': ' P.FPL ',
        'impuestoNomina': ' IMPUESTO SOBRE NÓMINA ',
        'apCompPrimasSeguro': ' AP COMP PRIMAS SEGURO ',
        'aportacionCompraPrestacion': ' APORTACION COMPRA PRESTACIÓN ',
        'ayudaPorIncapacidad': ' AYUDA POR INCAPACIDAD ',
        'ayudaFpl': 'AYUDA FPL',
        'costoNomina': ' COSTO DE NOMINA '
    }
    
    print(f"\n   📋 MAPEO DE CAMPOS DEL COMPONENTE:")
    
    datos_encontrados = {}
    campos_con_datos = 0
    
    for friendly_name, field_name in APORTACIONES_FIELDS.items():
        value = empleado_data.get(field_name, 0)
        
        if value and value != 0:
            datos_encontrados[friendly_name] = value
            campos_con_datos += 1
            print(f"      ✅ {friendly_name}: ${value:,.2f}")
        else:
            print(f"      ❌ {friendly_name}: SIN DATOS")
    
    print(f"\n   📊 RESUMEN:")
    print(f"      ✅ Campos con datos: {campos_con_datos}/{len(APORTACIONES_FIELDS)}")
    print(f"      📈 Porcentaje de éxito: {campos_con_datos/len(APORTACIONES_FIELDS)*100:.1f}%")
    
    if campos_con_datos > 0:
        print(f"      🎉 ¡COMPONENTE FUNCIONARÁ CORRECTAMENTE!")
        print(f"      💡 Mostrará {campos_con_datos} campos con datos reales")
    else:
        print(f"      ⚠️  COMPONENTE MOSTRARÁ TODOS LOS CAMPOS EN CERO")
        print(f"      🔧 Verificar mapeo o datos en la BD")

def test_server_status():
    """Verificar que el servidor esté corriendo"""
    print("🌐 VERIFICANDO ESTADO DEL SERVIDOR")
    print("=" * 40)
    
    try:
        response = requests.get('https://numerica-2.onrender.com/', timeout=5)
        print("✅ Servidor API corriendo correctamente")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Servidor API no está corriendo")
        print("💡 Inicia el servidor con: npm start")
        return False
    except Exception as e:
        print(f"❌ Error verificando servidor: {e}")
        return False

def main():
    print("🔧 DIAGNÓSTICO: COMPONENTE APORTACIONES PATRONALES")
    print("=" * 60)
    print("🎯 Probando flujo completo RFC → CURP → Datos\n")
    
    # 1. Verificar servidor
    if not test_server_status():
        return
    
    # 2. Probar endpoint
    curp, empleado_data = test_endpoint_busqueda_empleados()
    
    # 3. Simular componente
    if curp and empleado_data:
        test_aportaciones_component_data(curp, empleado_data)
    
    print(f"\n🏁 DIAGNÓSTICO COMPLETADO")
    print("=" * 30)
    
    if curp:
        print("✅ Flujo funcionando correctamente")
        print("🎯 El componente debería mostrar datos reales")
        print(f"💡 CURP obtenido: {curp}")
    else:
        print("❌ Problemas en el flujo detectados")
        print("🔧 Revisar servidor API y configuración")
    
    print(f"\n💡 PRÓXIMOS PASOS:")
    print("1. Verificar que el componente recibe el CURP correctamente")
    print("2. Confirmar que usa los campos de aportaciones mapeados")
    print("3. Probar en el navegador")

if __name__ == "__main__":
    main()
