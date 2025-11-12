import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrar los componentes de Chart.js que necesitamos
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ChartContainer = styled.div`
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  margin-bottom: 1rem;
`;

const ChartTitle = styled.h3`
  color: #1a365d;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChartWrapper = styled.div`
  position: relative;
  height: 640px;
  width: 100%;
  
  canvas {
    border-radius: 12px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: #ff6b6b;
  font-size: 1rem;
  text-align: center;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
`;

// Función para formatear fechas eliminando timestamps y devolver formato YYYY-MM-DD
const formatearFechaSinHora = (fecha) => {
  if (!fecha) return 'N/A';
  
  try {
    // Si es un timestamp ISO, extraer solo la parte de la fecha
    if (typeof fecha === 'string' && fecha.includes('T')) {
      return fecha.split('T')[0]; // Devolver formato YYYY-MM-DD
    }
    
    // Si ya tiene formato YYYY-MM-DD, devolverlo tal como está
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    
    // Si es formato YYYYMMDD (número), convertirlo a YYYY-MM-DD
    if (typeof fecha === 'string' && /^\d{8}$/.test(fecha)) {
      const year = fecha.substring(0, 4);
      const month = fecha.substring(4, 6);
      const day = fecha.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    
    // Si tiene más de 6 caracteres, intentar extraer año y período
    if (typeof fecha === 'string' && fecha.length >= 6) {
      const year = fecha.substring(0, 4);
      const period = fecha.substring(4);
      // Si el período tiene 4 dígitos (MMDD), formatear como YYYY-MM-DD
      if (period.length === 4) {
        const month = period.substring(0, 2);
        const day = period.substring(2, 4);
        return `${year}-${month}-${day}`;
      }
      return `${year}-${period}`;
    }
    
    return fecha.toString();
  } catch (error) {
    console.warn('Error formateando fecha:', fecha, error);
    return fecha ? fecha.toString() : 'N/A';
  }
};

// Función para convertir fecha a timestamp para ordenamiento
const fechaATimestamp = (fecha) => {
  try {
    if (!fecha || fecha === 'N/A') return 0;
    
    // Si ya es formato YYYY-MM-DD, crear Date directamente
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return new Date(fecha + 'T12:00:00').getTime();
    }
    
    // Si es timestamp ISO
    if (typeof fecha === 'string' && fecha.includes('T')) {
      return new Date(fecha).getTime();
    }
    
    // Si es formato YYYYMMDD
    if (typeof fecha === 'string' && /^\d{8}$/.test(fecha)) {
      const year = fecha.substring(0, 4);
      const month = fecha.substring(4, 6);
      const day = fecha.substring(6, 8);
      return new Date(`${year}-${month}-${day}T12:00:00`).getTime();
    }
    
    // Fallback
    return new Date(fecha).getTime() || 0;
  } catch (error) {
    console.warn('Error convirtiendo fecha a timestamp:', fecha, error);
    return 0;
  }
};

const FondosHistoricoChart = ({ rfc, onPeriodClick }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!rfc) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('📈 [FondosChart] Cargando datos FPL para RFC:', rfc);
        
        // PASO 1: Obtener todas las fechas FPL calculadas usando el mismo endpoint que el dropdown
        const fechasResponse = await fetch(`http://numericaapi.kretosstechnology.com/api/payroll/fecpla-from-rfc?rfc=${encodeURIComponent(rfc)}`);
        
        if (!fechasResponse.ok) {
          throw new Error(`Error obteniendo fechas FPL: ${fechasResponse.status}`);
        }
        
        const fechasResult = await fechasResponse.json();
        
        if (!fechasResult.success || !fechasResult.data || fechasResult.data.length === 0) {
          throw new Error('No se encontraron fechas FPL calculadas para este RFC');
        }
        
        const fechasFPL = fechasResult.data;
        console.log('📅 [FondosChart] Procesando', fechasFPL.length, 'fechas FPL');
        
        // PASO 2: Obtener datos de todas las fechas FPL en paralelo (OPTIMIZADO)
        const dataPromises = fechasFPL.map(async (fechaFPL, index) => {
          const { value: fechaCalculada, metadata } = fechaFPL;
          
          try {
            const dataUrl = `http://numericaapi.kretosstechnology.com/api/fpl/data-from-rfc?rfc=${encodeURIComponent(rfc)}&originalFecpla=${encodeURIComponent(metadata.originalFecpla)}&originalAntiguedad=${encodeURIComponent(metadata.originalAntiguedad)}`;
            const dataResponse = await fetch(dataUrl);
            
            if (dataResponse.ok) {
              const dataResult = await dataResponse.json();
              
              if (dataResult.success && dataResult.data) {
                return {
                  fechaFPL: fechaCalculada,
                  metadata: metadata,
                  data: dataResult.data,
                  index: index
                };
              }
            }
            return null;
          } catch (error) {
            console.warn(`Error obteniendo datos para fecha ${fechaCalculada}:`, error.message);
            return null;
          }
        });
        
        // Esperar a que todas las promesas se resuelvan
        const dataResults = await Promise.all(dataPromises);
        const allDataPoints = dataResults.filter(result => result !== null);
        
        console.log('📊 [FondosChart] Datos obtenidos:', allDataPoints.length, '/', fechasFPL.length, 'fechas');
        
        if (allDataPoints.length === 0) {
          throw new Error('No se pudieron obtener datos históricos para ninguna fecha FPL');
        }
        
        // PASO 3: Procesar los datos para la gráfica
        const processedData = processChartDataFromFPLSeries(allDataPoints);
        setChartData(processedData);
        
        console.log('✅ [FondosChart] Completado exitosamente');
        
      } catch (error) {
        console.error('❌ [FondosChart] Error obteniendo datos históricos:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistoricalData();
  }, [rfc]);

  // NUEVA FUNCIÓN: Procesar datos de serie temporal FPL
  const processChartDataFromFPLSeries = (allDataPoints) => {
    // Procesar cada punto de datos
    const processedPoints = [];
    
    allDataPoints.forEach((dataPoint, index) => {
      const { fechaFPL, metadata, data } = dataPoint;
      
      if (data) {
        // Extraer saldos de los datos obtenidos
        const saldoFinal = parseFloat(data.saldo_final || 0);
        const saldoFinal2 = parseFloat(data.saldo_final_1 || data.saldo_final_2 || 0);
        
        processedPoints.push({
          fechaFPL: fechaFPL,
          saldoFinal: saldoFinal,
          saldoFinal2: saldoFinal2,
          metadata: metadata,
          originalData: data,
          dataPointIndex: index
        });
      }
    });
    
    // Ordenar cronológicamente por fecha FPL
    const sortedPoints = processedPoints.sort((a, b) => {
      const timestampA = fechaATimestamp(a.fechaFPL);
      const timestampB = fechaATimestamp(b.fechaFPL);
      return timestampA - timestampB;
    });
    
    // Preparar datos para Chart.js
    const labels = sortedPoints.map(point => point.fechaFPL);
    const saldoFinalData = sortedPoints.map(point => point.saldoFinal);
    const saldoFinal2Data = sortedPoints.map(point => point.saldoFinal2);
    
    // Calcular valores mínimo y máximo para escalado automático
    const allValues = [...saldoFinalData, ...saldoFinal2Data].filter(val => !isNaN(val) && val > 0);
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1000;
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const range = maxValue - minValue;
    
    console.log('📊 [FondosChart] Serie temporal creada:', {
      puntos: sortedPoints.length,
      rango: `${sortedPoints[0]?.fechaFPL} - ${sortedPoints[sortedPoints.length - 1]?.fechaFPL}`,
      valores: { minValue, maxValue }
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'SALDO FINAL',
          data: saldoFinalData,
          borderColor: '#1a365d', // Color del sidebar - azul marino Numerica
          backgroundColor: 'rgba(26, 54, 93, 0.1)', // Fondo translúcido del mismo color
          borderWidth: 3,
          pointBackgroundColor: '#1a365d', // Puntos del mismo color
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false, // Sin relleno para mejor visibilidad
          tension: 0.4,
        },
        {
          label: 'SALDO FINAL 2',
          data: saldoFinal2Data,
          borderColor: '#8B0000', // Color granate/rojo oscuro
          backgroundColor: 'rgba(139, 0, 0, 0.1)', // Fondo translúcido granate
          borderWidth: 3,
          pointBackgroundColor: '#8B0000', // Puntos granate
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false, // Sin relleno
          tension: 0.4,
        }
      ],
      // Metadatos para configurar las escalas y navegación
      metadata: {
        maxValue,
        minValue,
        range,
        periods: sortedPoints.map(point => point.fechaFPL),
        temporalData: sortedPoints,
        // Referencias a los datos originales por índice para navegación
        originalRecords: sortedPoints.map(point => point.originalData),
        metadataReferences: sortedPoints.map(point => point.metadata)
      }
    };
  };

  const processChartData = (data) => {
    console.log('🎆 [DEBUG FONDOS] ========== INICIO PROCESAMIENTO ==========');
    console.log('🎆 [DEBUG FONDOS] Datos recibidos:', data.length, 'registros');
    console.log('🎆 [DEBUG FONDOS] Primer registro:', data[0]);
    
    // Procesar diferentes tipos de datos: FPL, nómina histórica, etc.
    const processedData = [];
    
    data.forEach((record, recordIndex) => {
      // Log detallado de campos de fecha disponibles
      const fechasDisponibles = {
        value: record.value,
        cveper: record.cveper,
        fecha: record.fecha,
        period: record.period,
        fecpla: record.fecpla,
        fecant: record.fecant,
        fechalt: record.fechalt,
        fecbaj: record.fecbaj,
        antiguedad_en_fondo: record.antiguedad_en_fondo
      };
      
      console.log(`🎆 [DEBUG ${recordIndex + 1}/${data.length}] Registro:`, record);
      console.log(`🎆 [DEBUG ${recordIndex + 1}/${data.length}] Campos fecha:`, fechasDisponibles);
      
      // Determinar la fecha del período calculando FPL basado en antigüedad en fondo
      let fechaPeriodo;
      let campoUsado;
      
      if (record.value) {
        // Datos tipo FPL calculado
        fechaPeriodo = record.value;
        campoUsado = 'value';
      } else if (record.cveper) {
        // Datos de nómina histórica
        fechaPeriodo = formatearFechaSinHora(record.cveper);
        campoUsado = 'cveper';
      } else if (record.antiguedad_en_fondo && (record.fecpla || record.fecant || record.fechalt)) {
        // 🎯 CALCULAR FECHA FPL usando antigüedad en fondo (misma lógica que dropdown)
        const antiguedadEnFondo = parseFloat(record.antiguedad_en_fondo);
        let fechaBase;
        
        // Usar la mejor fecha base disponible
        if (record.fecpla) {
          fechaBase = new Date(record.fecpla);
        } else if (record.fecant) {
          fechaBase = new Date(record.fecant);
        } else if (record.fechalt) {
          fechaBase = new Date(record.fechalt);
        }
        
        if (fechaBase && !isNaN(fechaBase.getTime()) && antiguedadEnFondo >= 0) {
          // Calcular fecha FPL: fecpla + (antiguedad_anos * 365.25 días) - IGUAL QUE EN DROPDOWN
          const fechaFPLCalculada = new Date(fechaBase);
          const diasASumar = Math.floor(antiguedadEnFondo * 365.25); // SUMAR no restar
          fechaFPLCalculada.setDate(fechaFPLCalculada.getDate() + diasASumar);
          
          // AJUSTE: Si la fecha cae en días 28-31, moverla al día 1 del mes siguiente
          const diaDelMes = fechaFPLCalculada.getDate();
          if (diaDelMes >= 28) {
            // Mover al primer día del mes siguiente
            fechaFPLCalculada.setMonth(fechaFPLCalculada.getMonth() + 1);
            fechaFPLCalculada.setDate(1);
          }
          
          fechaPeriodo = formatearFechaSinHora(fechaFPLCalculada.toISOString());
          campoUsado = 'antiguedad_en_fondo_calculado';
          
          console.log('🔢 [FondosChart] Cálculo FPL (corregido):', {
            antiguedadEnFondo,
            fechaBase: fechaBase.toISOString(),
            diasASumar,
            fechaFPLCalculada: fechaFPLCalculada.toISOString(),
            fechaPeriodo,
            ajusteFinMes: diaDelMes >= 28 ? 'Aplicado' : 'No necesario'
          });
        } else {
          fechaPeriodo = 'Sin período';
          campoUsado = 'calculo_fallido';
        }
      } else if (record.fecha) {
        // Datos con campo fecha genérico
        fechaPeriodo = formatearFechaSinHora(record.fecha);
        campoUsado = 'fecha';
      } else if (record.period) {
        // Datos con campo period
        fechaPeriodo = record.period;
        campoUsado = 'period';
      } else if (record.fecpla) {
        // Fecha de planilla (común en datos de fondos)
        fechaPeriodo = formatearFechaSinHora(record.fecpla);
        campoUsado = 'fecpla';
      } else if (record.fecant) {
        // Fecha de antigüedad (puede usarse como referencia temporal)
        fechaPeriodo = formatearFechaSinHora(record.fecant);
        campoUsado = 'fecant';
      } else if (record.fechalt) {
        // Fecha de alta
        fechaPeriodo = formatearFechaSinHora(record.fechalt);
        campoUsado = 'fechalt';
      } else if (record.fecbaj) {
        // Fecha de baja
        fechaPeriodo = formatearFechaSinHora(record.fecbaj);
        campoUsado = 'fecbaj';
      } else {
        fechaPeriodo = 'Sin período';
        campoUsado = 'ninguno';
      }
      
      console.log(`🎆 [DEBUG ${recordIndex + 1}] Fecha procesada:`, {
        campoUsado,
        valorOriginal: fechasDisponibles[campoUsado] || 'N/A',
        fechaPeriodo,
        esValida: fechaPeriodo !== 'Sin período'
      });
      
      // Los datos de saldo pueden estar en diferentes ubicaciones
      const metadata = record.metadata || record;
      
      // Buscar saldo_final en diferentes ubicaciones posibles
      const saldoFinalRaw = metadata.saldo_final || metadata['saldo_final'] || 
                           record.saldo_final || record['saldo_final'] || 
                           metadata.SALDO_FINAL || metadata['SALDO_FINAL'] ||
                           // Buscar en campos de movimientos de fondo
                           metadata.movimientos_fondo?.saldo_final ||
                           record.movimientos_fondo?.saldo_final ||
                           // Usar totalPercepciones como fallback si no hay saldos
                           record.totalPercepciones || 0;
      
      // Buscar saldo_final_1 o saldo_final_2 en diferentes ubicaciones
      const saldoFinal2Raw = metadata.saldo_final_1 || metadata['saldo_final_1'] || 
                            record.saldo_final_1 || record['saldo_final_1'] || 
                            metadata.SALDO_FINAL_1 || metadata['SALDO_FINAL_1'] ||
                            metadata.saldo_final_2 || metadata['saldo_final_2'] ||
                            // Buscar en movimientos de fondo
                            metadata.movimientos_fondo?.saldo_final_2 ||
                            record.movimientos_fondo?.saldo_final_2 ||
                            // Usar sueldoCliente como fallback si no hay segundo saldo
                            record.sueldoCliente || 0;
      
      const saldoFinal = parseFloat(saldoFinalRaw || 0);
      const saldoFinal2 = parseFloat(saldoFinal2Raw || 0);
      
      console.log(`🔍 [DIAGNÓSTICO ${recordIndex + 1}/${data.length}] Saldos:`, {
        fechaPeriodo,
        saldoFinalRaw,
        saldoFinal2Raw,
        saldoFinal,
        saldoFinal2,
        seráIncluido: fechaPeriodo !== 'Sin período'
      });
      
      // Solo procesar registros con fechas válidas
      if (fechaPeriodo !== 'Sin período') {
        processedData.push({
          fechaFPL: fechaPeriodo,
          saldoFinal,
          saldoFinal2,
          originalRecord: record,
          recordIndex
        });
        console.log(`✅ [DEBUG] Registro ${recordIndex + 1} INCLUIDO - Fecha: ${fechaPeriodo}, Saldo: ${saldoFinal}`);
      } else {
        console.log(`❌ [DEBUG] Registro ${recordIndex + 1} EXCLUIDO - Sin fecha válida`);
      }
    });
    
    console.log('🎆 [DEBUG FONDOS] ========== RESUMEN PROCESAMIENTO ==========');
    console.log('🎆 [DEBUG FONDOS] Datos procesados inicialmente:', processedData.length, 'registros');
    console.log('🎆 [DEBUG FONDOS] Fechas encontradas:', processedData.map(item => item.fechaFPL));
    
    // Agrupar por fecha FPL calculada para crear serie temporal continua
    const groupedByFecha = new Map();
    
    processedData.forEach((item, index) => {
      const fechaKey = formatearFechaSinHora(item.fechaFPL);
      
      console.log(`🔍 [DIAGNÓSTICO AGRUPACIÓN ${index + 1}] Procesando:`, {
        fechaOriginal: item.fechaFPL,
        fechaKey: fechaKey,
        saldoFinal: item.saldoFinal,
        saldoFinal2: item.saldoFinal2
      });
      
      if (!groupedByFecha.has(fechaKey)) {
        groupedByFecha.set(fechaKey, {
          fechaFPL: fechaKey,
          saldoFinal: 0,
          saldoFinal2: 0,
          count: 0,
          originalRecords: []
        });
        console.log(`🆕 [DIAGNÓSTICO] Nueva fecha creada: ${fechaKey}`);
      } else {
        console.log(`🔁 [DIAGNÓSTICO] Fecha existente: ${fechaKey}`);
      }
      
      const grupo = groupedByFecha.get(fechaKey);
      // Tomar el valor más reciente para esa fecha (último saldo registrado)
      grupo.saldoFinal = item.saldoFinal;
      grupo.saldoFinal2 = item.saldoFinal2;
      grupo.count++;
      grupo.originalRecords.push(item.originalRecord);
      
      console.log(`🔍 [DIAGNÓSTICO] Grupo actualizado para ${fechaKey}:`, grupo);
    });
    
    // Convertir a array y ordenar cronológicamente
    const sortedData = Array.from(groupedByFecha.values())
      .sort((a, b) => {
        const timestampA = fechaATimestamp(a.fechaFPL);
        const timestampB = fechaATimestamp(b.fechaFPL);
        return timestampA - timestampB;
      });

    console.log('🎆 [DEBUG FONDOS] ========== RESULTADO FINAL ==========');
    console.log('🎆 [DEBUG FONDOS] Fechas únicas agrupadas:', groupedByFecha.size);
    console.log('🎆 [DEBUG FONDOS] Mapa de fechas:', Array.from(groupedByFecha.entries()));
    console.log('🎆 [DEBUG FONDOS] Serie temporal creada:', sortedData.length, 'puntos únicos');
    console.log('🎆 [DEBUG FONDOS] Datos finales:', sortedData);
    console.log('🎆 [DEBUG FONDOS] Rango temporal:', {
      inicio: sortedData[0]?.fechaFPL,
      fin: sortedData[sortedData.length - 1]?.fechaFPL
    });

    // Preparar datos para Chart.js como serie temporal
    const labels = sortedData.map(item => item.fechaFPL);
    const saldoFinalData = sortedData.map(item => item.saldoFinal);
    const saldoFinal2Data = sortedData.map(item => item.saldoFinal2);
    
    // Calcular valores mínimo y máximo para escalado automático
    const allValues = [...saldoFinalData, ...saldoFinal2Data];
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const range = maxValue - minValue;
    
    console.log('📊 [FondosChart] Rango de valores:', { minValue, maxValue, range });
    
    return {
      labels,
      datasets: [
        {
          label: 'SALDO FINAL',
          data: saldoFinalData,
          borderColor: '#1a365d', // Color del sidebar - azul marino Numerica
          backgroundColor: 'rgba(26, 54, 93, 0.1)', // Fondo translúcido del mismo color
          borderWidth: 2,
          pointBackgroundColor: '#1a365d', // Puntos del mismo color
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          pointRadius: 4, // Puntos más pequeños para línea continua
          pointHoverRadius: 6,
          fill: false, // Sin relleno para mejor visibilidad
          tension: 0.3, // Línea más suave
        },
        {
          label: 'SALDO FINAL 2',
          data: saldoFinal2Data,
          borderColor: '#8B0000', // Color granate/rojo oscuro
          backgroundColor: 'rgba(139, 0, 0, 0.1)', // Fondo translúcido granate
          borderWidth: 2,
          pointBackgroundColor: '#8B0000', // Puntos granate
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          pointRadius: 4, // Puntos más pequeños para línea continua
          pointHoverRadius: 6,
          fill: false, // Sin relleno
          tension: 0.3, // Línea más suave
        }
      ],
      // Metadatos para configurar las escalas
      metadata: {
        maxValue,
        minValue,
        range,
        periods: sortedData.map(item => item.fechaFPL),
        temporalData: sortedData,
        // Mantenemos una referencia directa a los registros originales por índice
        originalRecords: sortedData.map(item => item.originalRecords[0]) // Primer registro del grupo
      }
    };
  };

  // Generar opciones dinámicas basadas en los datos
  const generateChartOptions = (data) => {
    if (!data || !data.metadata) {
      return getDefaultChartOptions();
    }

    const { maxValue, minValue, range, periods } = data.metadata;
    
    // Calcular escalado automático del eje Y
    const padding = range * 0.1; // 10% de padding
    const yMin = Math.max(0, minValue - padding);
    const yMax = maxValue + padding;
    
    // Calcular número de divisiones para el eje Y
    const ySteps = Math.min(10, Math.max(5, Math.ceil(range / (maxValue * 0.1))));
    const yStepSize = (yMax - yMin) / ySteps;
    
    // Detectar años únicos para delimitaciones temporales
    const uniqueYears = [...new Set(
      periods.map(period => {
        if (typeof period === 'string' && period.length >= 4) {
          return period.substring(0, 4);
        }
        return null;
      }).filter(Boolean)
    )].sort();
    
    console.log('📊 [FondosChart] Configuración de escalas:', {
      yMin, yMax, yStepSize, ySteps, uniqueYears
    });

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      onClick: (event, activeElements) => {
        if (activeElements.length > 0 && onPeriodClick) {
          const datasetIndex = activeElements[0].datasetIndex;
          const index = activeElements[0].index;
          
          // Obtener el período exacto correspondiente al índice clickeado
          const period = data.metadata.periods[index];
          const temporalData = data.metadata.temporalData[index];
          const originalRecord = data.metadata.originalRecords[index];
          const labelClicked = data.labels[index];
          
          console.log('👆 [FondosChart] Click detallado:', {
            index,
            datasetIndex,
            period,
            labelClicked,
            temporalData,
            originalRecord,
            saldoFinal: temporalData?.saldoFinal,
            saldoFinal2: temporalData?.saldoFinal2
          });
          
          if (period && typeof onPeriodClick === 'function') {
            onPeriodClick(period);
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#000000', // Negro para máximo contraste
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: 20,
            usePointStyle: false, // Mantener recuadro tradicional
            boxWidth: 25,
            boxHeight: 15
          },
          align: 'center'
        },
        title: {
          display: true,
          text: 'Histórico de Fondos por Período',
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 16,
            weight: '700'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#1a365d',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: function(context) {
              return `Período: ${context[0].label}`;
            },
            label: function(context) {
              const value = context.parsed.y;
              const datasetLabel = context.dataset.label;
              return `${datasetLabel}: $${value.toLocaleString('es-MX', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          display: true,
          position: 'bottom',
          grid: {
            display: true,
            drawBorder: true,
            drawOnChartArea: true,
            drawTicks: true,
            color: '#413f3f4b',
            lineWidth: 1,
            borderColor: '#ff0000',
            borderWidth: 5
          },
          ticks: {
            display: true,
            color: '#000000',
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: 5
          },
          title: {
            display: true,
            text: 'PERIODOS',
            color: '#373737ff',
            font: {
              size: 20,
              weight: 'bold'
            }
          },
          border: {
            display: true,
            color: '#ffffff',
            width: 2
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            display: true,
            drawBorder: true,
            drawOnChartArea: true,
            drawTicks: true,
            color: '#3f3f3fff',
            lineWidth: 1,
            borderColor: '#0000ff',
            borderWidth: 5
          },
          ticks: {
            display: true,
            color: '#000000',
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: 5,
            callback: function(value) {
              if (value >= 1000000) {
                return '$' + (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return '$' + (value / 1000).toFixed(0) + 'K';
              }
              return '$' + Math.round(value).toLocaleString('es-MX');
            }
          },
          title: {
            display: true,
            text: 'FONDOS',
            color: '#3f3f3fff',
            font: {
              size: 20,
              weight: 'bold'
            }
          },
          border: {
            display: true,
            color: '#ffffff',
            width: 2
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      onHover: (event, activeElements) => {
        // Cambiar cursor cuando hover sobre puntos clickeables
        event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      },
      elements: {
        point: {
          hoverBackgroundColor: '#ffffff',
          hoverBorderColor: '#1a365d',
        }
      }
    };
  };

  // Opciones por defecto para cuando no hay datos
  const getDefaultChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          display: false
        }
      }
    };
  };

  if (loading) {
    return (
      <ChartContainer>
        <ChartTitle>Histórico de Fondos</ChartTitle>
        <LoadingContainer>
          Cargando datos históricos de fondos...
        </LoadingContainer>
      </ChartContainer>
    );
  }

  if (error) {
    return (
      <ChartContainer>
        <ChartTitle>Histórico de Fondos</ChartTitle>
        <ErrorContainer>
          {error}
        </ErrorContainer>
      </ChartContainer>
    );
  }

  if (!chartData) {
    return (
      <ChartContainer>
        <ChartTitle>Histórico de Fondos</ChartTitle>
        <LoadingContainer>
          No hay datos para mostrar
        </LoadingContainer>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <ChartTitle>Histórico de Fondos</ChartTitle>
      <ChartWrapper>
        <Line
          data={chartData}
          options={generateChartOptions(chartData)}
        />
      </ChartWrapper>
    </ChartContainer>
  );
};

export default FondosHistoricoChart;
