import React, { useState, useEffect, useCallback } from 'react';
import InformacionGeneralSection from './sections/InformacionGeneralSection';
import InformacionSalarialSection from './sections/InformacionSalarialSection';
import PercepcionesAdicionalesSection from './sections/PercepcionesAdicionalesSection';
import BeneficiosAjustesSection from './sections/BeneficiosAjustesSection';
import TotalesCostosSection from './sections/TotalesCostosSection';
import DeduccionesSection from './sections/DeduccionesSection';
import { authenticatedFetch } from '../../services/authenticatedFetch';
import { buildApiUrl } from '../../config/apiConfig';

const PayrollDataViewer = ({ curp, selectedPeriod }) => {
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [periodMapping, setPeriodMapping] = useState(new Map()); // Mapeo período limpio → formato original

  const fetchPayrollData = useCallback(async (curpValue, periodValue) => {
    if (!curpValue) {
      console.log('Missing CURP, clearing data');
      setPayrollData(null);
      return;
    }

    // Si no hay período, cargar datos sin filtro de período
    console.log('📋 Cargando datos para CURP:', curpValue, 'Period:', periodValue || 'TODOS');

    setLoading(true);
    setError(null);

    try {
      console.log('🚨 INICIANDO CARGA DE DATOS');
      console.log('🔍 CURP solicitada:', curpValue);
      console.log('📅 Período solicitado:', periodValue);
      
      // ✅ FIXED: Use search parameter to filter by CURP and request fullData to get all fields
      // Format: GET /api/payroll?search=CURP&pageSize=1000&page=1&fullData=true&cveper=2025-06-30T00:00:00.000Z
      const params = new URLSearchParams({
        search: curpValue, // Use search instead of curp for better filtering
        pageSize: '1000',
        page: '1',
        fullData: 'true', // Request all fields from database
        includeAllFields: 'true' // Additional flag to ensure all fields are returned
      });
      
      if (periodValue) {
        let cveperValue = Array.isArray(periodValue) ? periodValue[0] : periodValue;
        
        // Convert cveper to timestamp format (ISO string) like AWS endpoint
        if (cveperValue) {
          try {
            let date;
            // If it's already a timestamp, use it
            if (cveperValue.includes && cveperValue.includes('T')) {
              date = new Date(cveperValue);
            } else if (cveperValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // If it's YYYY-MM-DD format, convert to timestamp
              date = new Date(cveperValue + 'T00:00:00.000Z');
            } else {
              // Try to parse as date
              date = new Date(cveperValue);
            }
            
            if (!isNaN(date.getTime())) {
              // Convert to ISO string format: 2025-06-30T00:00:00.000Z
              cveperValue = date.toISOString();
            }
          } catch (error) {
            console.warn('⚠️ Error normalizando cveper:', error);
          }
        }
        
        // Add cveper in timestamp format
        params.append('cveper', cveperValue);
        console.log('📅 ✅ Agregando cveper en formato timestamp:', cveperValue);
      } else {
        console.log('📅 Cargando datos sin filtro de período específico');
      }
      
      const urlFinal = `${buildApiUrl('/api/payroll')}?${params.toString()}`;
      
      console.log('🌐 URL COMPLETA DE LA API:', urlFinal);
      
      // USAR EL MISMO ENDPOINT QUE BusquedaEmpleados (que funciona)
      const response = await authenticatedFetch(urlFinal);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos del empleado');
      }
      
      const result = await response.json();
      
      console.log('📦 RESPUESTA RAW DE LA API:', {
        success: result.success,
        totalRegistros: result.data?.length || 0,
        datosPresentes: !!result.data
      });
      
      if (!result.success || !result.data || result.data.length === 0) {
        console.warn('❌ No se encontraron datos para el empleado con CURP:', curpValue);
        setPayrollData(null);
        setError('No se encontraron datos para este empleado en el período seleccionado');
        return;
      }
      
      // 🗺️ CREAR MAPEO DE PERÍODOS LIMPIOS A FORMATOS ORIGINALES
      const nuevoMapeo = new Map();
      result.data.forEach(record => {
        if (record.cveper) {
          let formatoLimpio = record.cveper;
          const formatoOriginal = record.cveper;
          
          // Convertir a formato limpio (igual que en el dropdown)
          try {
            if (formatoLimpio.includes('T')) {
              const date = new Date(formatoLimpio);
              if (!isNaN(date.getTime())) {
                formatoLimpio = date.toISOString().split('T')[0];
              }
            }
          } catch (error) {
            console.warn('⚠️ Error limpiando período:', formatoLimpio);
          }
          
          // Guardar mapeo: período limpio → formato original
          if (!nuevoMapeo.has(formatoLimpio)) {
            nuevoMapeo.set(formatoLimpio, formatoOriginal);
          }
        }
      });
      
      setPeriodMapping(nuevoMapeo);
      console.log('🗺️ Mapeo de períodos creado:', Object.fromEntries(nuevoMapeo));
      
      console.log('🔍 VERIFICANDO DATOS OBTENIDOS:');
      result.data.forEach((registro, index) => {
        console.log(`📊 Registro ${index + 1}:`, {
          curp: registro.curp || registro.CURP,
          cveper: registro.cveper,
          nombre: registro.nombre || registro['Nombre completo'],
          esElCURPCorrecto: (registro.curp || registro.CURP) === curpValue,
          esElPeriodoCorrecto: periodValue ? registro.cveper === periodValue : 'NO_FILTRADO_POR_PERIODO',
          periodicidad: registro.Periodicidad,
          compania: registro.Compañía
        });
      });
      
      // 🔍 ANÁLISIS ESPECÍFICO DEL PROBLEMA
      console.log('🚨 ANÁLISIS DEL PROBLEMA:');
      console.log('- CURP solicitada:', curpValue);
      console.log('- Período solicitado:', periodValue);
      console.log('- Total registros encontrados:', result.data.length);
      
      const registrosConCURPCorrecta = result.data.filter(r => (r.curp || r.CURP) === curpValue);
      console.log('- Registros con CURP correcta:', registrosConCURPCorrecta.length);
      
      if (periodValue) {
        // 🗺️ USAR EL MAPEO PARA ENCONTRAR EL FORMATO ORIGINAL
        const formatoOriginalCompleto = nuevoMapeo.get(periodValue);
        
        console.log('🚨 ANÁLISIS CON MAPEO:');
        console.log('- Período limpio del dropdown:', periodValue);
        console.log('- Formato original mapeado:', formatoOriginalCompleto);
        
        if (formatoOriginalCompleto) {
          // Buscar con el formato original exacto de la BD
          const registrosConPeriodoCorrecto = result.data.filter(r => r.cveper === formatoOriginalCompleto);
          console.log('- Registros con período correcto (mapeado):', registrosConPeriodoCorrecto.length);
          
          const registrosConAmbosCorrectos = result.data.filter(r => 
            (r.curp || r.CURP) === curpValue && r.cveper === formatoOriginalCompleto
          );
          console.log('- Registros con CURP Y período correctos (mapeado):', registrosConAmbosCorrectos.length);
          
          if (registrosConAmbosCorrectos.length > 0) {
            console.log('✅ ÉXITO: Encontrados registros con mapeo!');
            console.log('🎯 Primer registro correcto:', {
              curp: registrosConAmbosCorrectos[0].curp || registrosConAmbosCorrectos[0].CURP,
              cveper: registrosConAmbosCorrectos[0].cveper,
              nombre: registrosConAmbosCorrectos[0].nombre || registrosConAmbosCorrectos[0]['Nombre completo']
            });
            
          } else {
            console.log('❌ No se encontraron registros con CURP y período específicos');
          }
        } else {
          console.log('❌ No se pudo mapear el período limpio al formato original');
        }
      }
      
      // 🎯 ESTRATEGIA EFICIENTE: El dropdown YA confirmó que el datapoint existe
      let empleadoData = null;
      
      if (periodValue) {
        console.log('🚨 BÚSQUEDA EFICIENTE CON MAPEO:');
        console.log('- Período limpio seleccionado:', periodValue);
        
        // 1. Usar el mapeo para encontrar el formato original
        const formatoOriginalCompleto = nuevoMapeo.get(periodValue);
        console.log('- Formato original mapeado:', formatoOriginalCompleto);
        
        if (formatoOriginalCompleto) {
          // 2. Búsqueda DIRECTA con ambos criterios
          empleadoData = result.data.find(registro => {
            const curpMatch = (registro.curp || registro.CURP) === curpValue;
            const periodoMatch = registro.cveper === formatoOriginalCompleto;
            
            if (curpMatch && periodoMatch) {
              console.log('✅ DATAPOINT ENCONTRADO:', {
                curp: registro.curp || registro.CURP,
                cveper: registro.cveper,
                nombre: registro.nombre || registro['Nombre completo'],
                periodicidad: registro.periodicidad || registro.Periodicidad
              });
              return true;
            }
            return false;
          });
        }
        
        // 3. Si no encontramos con mapeo, buscar solo por CURP como fallback
        if (!empleadoData) {
          console.log('⚠️ Fallback: Buscando solo por CURP');
          empleadoData = result.data.find(r => (r.curp || r.CURP) === curpValue);
        }
      } else {
        // Sin período, tomar el primer registro de la CURP
        empleadoData = result.data.find(r => (r.curp || r.CURP) === curpValue);
      }
      
      // 4. Último fallback - primer registro
      if (!empleadoData) {
        console.log('❌ FALLBACK FINAL: Usando primer registro disponible');
        empleadoData = result.data[0];
      }
      
      console.log('🎯 REGISTRO FINAL SELECCIONADO:');
      console.log('- CURP:', empleadoData.curp || empleadoData.CURP);
      console.log('- cveper:', empleadoData.cveper);
      console.log('- Nombre:', empleadoData.nombre || empleadoData['Nombre completo']);
      console.log('- ¿Es la CURP correcta?', (empleadoData.curp || empleadoData.CURP) === curpValue);
      
      console.log('🎯 DATOS DEL REGISTRO SELECCIONADO:');
      console.log('- CURP del registro:', empleadoData.curp || empleadoData.CURP);
      console.log('- CURP solicitada:', curpValue);
      console.log('- ¿Coinciden?', (empleadoData.curp || empleadoData.CURP) === curpValue);
      console.log('- Período del registro:', empleadoData.cveper);
      console.log('- Período solicitado:', periodValue);
      console.log('- Nombre en registro:', empleadoData.nombre || empleadoData['Nombre completo']);
      
      console.log('📊 Datos del empleado obtenidos:', {
        curp: curpValue,
        totalRegistros: result.data.length,
        cveper: empleadoData.cveper,
        nombreCompleto: empleadoData.nombre
      });
      
      console.log('🔍 Campos principales encontrados:', {
        rfc: empleadoData.rfc,
        curp: empleadoData.curp,
        nombre: empleadoData.nombre,
        puesto: empleadoData.puesto,
        sucursal: empleadoData.sucursal,
        cveper: empleadoData.cveper
      });
      
      // SOLUCIÓN: El endpoint /api/payroll con SELECT * ya devuelve TODOS los campos de historico_nominas_gsau
      // Las secciones esperan los nombres exactos de columnas de la base de datos
      // NO necesitamos mapear - pasar directamente los datos raw que ya contienen todos los campos
      
      console.log('🔍 TODOS los campos disponibles del empleado:', Object.keys(empleadoData));
      console.log('📊 Muestra de campos importantes:', {
        'RFC': empleadoData['RFC'],
        'CURP': empleadoData['CURP'],
        'Nombre completo': empleadoData['Nombre completo'],
        'Compañía': empleadoData['Compañía'],
        'cveper': empleadoData['cveper'],
        'Puesto': empleadoData['Puesto'],
        'Status': empleadoData['Status'],
        'Mes': empleadoData['Mes'],
        ' SUELDO CLIENTE ': empleadoData[' SUELDO CLIENTE '],
        ' BONO ': empleadoData[' BONO '],
        ' AGUINALDO ': empleadoData[' AGUINALDO '],
        ' VALES DESPENSA NETO ': empleadoData[' VALES DESPENSA NETO '],
        'cvecia': empleadoData['cvecia'],
        'cvetno': empleadoData['cvetno']
      });
      
      // 🚨 DEBUG CRÍTICO: Verificar si los campos con espacios están llegando
      console.log('🚨 CAMPOS DISPONIBLES EN BACKEND:', Object.keys(empleadoData));
      console.log('📊 TOTAL DE CAMPOS:', Object.keys(empleadoData).length);
      
      // 🔍 BUSCAR ESPECÍFICAMENTE CAMPOS CON ESPACIOS
      console.log('🔍 BUSCANDO CAMPOS CON ESPACIOS EN LOS DATOS:');
      const camposConEspacios = [
        ' SUELDO CLIENTE ', ' SUELDO ', ' COMISIONES ', ' BONO ', ' AGUINALDO ',
        'CURP', 'Nombre completo', 'RFC', 'Compañía', 'Sucursal',
        ' DESTAJO INFORMADO ', ' PREMIO PUNTUALIDAD ', ' ISR ', ' DESCUENTO IMSS '
      ];
      
      camposConEspacios.forEach(campo => {
        const existe = empleadoData.hasOwnProperty(campo);
        const valor = empleadoData[campo];
        console.log(`${existe ? '✅' : '❌'} "${campo}" = ${valor}`);
      });
      
      // 🔍 MOSTRAR TODOS LOS CAMPOS PARA VERIFICAR ESTRUCTURA COMPLETA
      console.log('🔍 LISTADO COMPLETO DE TODAS LAS PROPIEDADES:');
      Object.keys(empleadoData).forEach((key, index) => {
        console.log(`${index + 1}. "${key}" = ${empleadoData[key]}`);
      });
      
      // ⚠️ DIAGNÓSTICO
      if (Object.keys(empleadoData).length <= 20) {
        console.log('⚠️ PROBLEMA DETECTADO: El backend solo devuelve campos básicos');
        console.log('🔧 SOLUCIÓN NECESARIA: El backend debe usar SELECT * FROM historico_nominas_gsau');
        console.log('📋 CAMPOS ESPERADOS: Deberían haber 100+ campos con espacios como " SUELDO CLIENTE "');
      } else {
        console.log('✅ BACKEND PARECE COMPLETO: Devolviendo muchos campos');
      }
      
      console.log('🔍 VERIFICANDO CAMPOS ESPECÍFICOS QUE BUSCAN LAS SECCIONES:');
      console.log('- cvecia:', empleadoData['cvecia']);
      console.log('- Compañía:', empleadoData['Compañía']);
      console.log('- cvetno:', empleadoData['cvetno']);
      console.log('- Descripción cvetno:', empleadoData['Descripción cvetno']);
      console.log('- CVETRABJR:', empleadoData['CVETRABJR']);
      console.log('- NOMTRABJR:', empleadoData['NOMTRABJR']);
      console.log('- Fecha ingreso:', empleadoData['Fecha ingreso']);
      console.log('- Número IMSS:', empleadoData['Número IMSS']);
      
      // Pasar directamente empleadoData sin mapeo - contiene todos los campos de historico_nominas_gsau
      const mappedData = empleadoData;
      
      // Pasar los datos mapeados a los componentes
      setPayrollData(mappedData);
      
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      setError(`Error al cargar datos: ${error.message}`);
      setPayrollData(null);
    } finally {
      setLoading(false);
    }
  }, []);


  // Cargar datos cuando cambian CURP o período
  useEffect(() => {
    if (curp) {
      fetchPayrollData(curp, selectedPeriod);
    }
  }, [curp, selectedPeriod, fetchPayrollData]);

  if (!curp) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        color: 'rgba(255, 255, 255, 0.7)' 
      }}>
        CURP no disponible
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Component A - Información General */}
      <InformacionGeneralSection 
        data={payrollData} 
        loading={loading}
        selectedPeriod={selectedPeriod}
      />
      
      {/* Component B - Información Salarial Básica */}
      <InformacionSalarialSection 
        data={payrollData} 
        loading={loading}
        selectedPeriod={selectedPeriod}
      />
      
      {/* Component C - Percepciones Adicionales */}
      <PercepcionesAdicionalesSection 
        data={payrollData} 
        loading={loading} 
      />
      
      {/* Component D - Beneficios y Ajustes */}
      <BeneficiosAjustesSection 
        data={payrollData} 
        loading={loading} 
      />
      
      {/* Component E - Totales y Costos */}
      <TotalesCostosSection 
        data={payrollData} 
        loading={loading} 
      />
      
      {/* Component F - Deducciones */}
      <DeduccionesSection 
        data={payrollData} 
        loading={loading} 
      />
    </div>
  );
};

export default PayrollDataViewer;
