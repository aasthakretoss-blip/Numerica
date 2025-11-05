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

const PercepcionesHistoricoChart = ({ curp, onPeriodClick }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!curp) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('📊 [Chart] Obteniendo datos históricos para CURP:', curp);
        
        const params = new URLSearchParams({
          curp: curp,
          pageSize: '1000', // Obtener todos los registros disponibles
          page: '1'
        });
        
        const response = await fetch(`https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com/prod/api/percepciones?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al obtener datos históricos');
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          throw new Error('No se encontraron datos históricos para este empleado');
        }
        
        console.log('📊 [Chart] Datos obtenidos:', result.data.length, 'registros');
        
        // Procesar los datos para la gráfica
        const processedData = processChartData(result.data);
        setChartData(processedData);
        
      } catch (error) {
        console.error('❌ [Chart] Error obteniendo datos históricos:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistoricalData();
  }, [curp]);

  const processChartData = (data) => {
    // Agrupar por cveper y sumar las percepciones para cada período
    const groupedData = {};
    
    data.forEach(record => {
      const cveper = record.cveper || record['cveper'] || 'Sin período';
      const totalPercepciones = parseFloat(record[' TOTAL DE PERCEPCIONES '] || 0);
      const sueldoCliente = parseFloat(record['SUELDO CLIENTE'] || record[' SUELDO CLIENTE '] || record['SUELDO_CLIENTE'] || 0);
      
      // Buscar campos de comisiones en diferentes variaciones
      const comisionesCliente = parseFloat(
        record['COMISIONES CLIENTE'] || 
        record[' COMISIONES CLIENTE '] || 
        record['COMISIONES_CLIENTE'] ||
        record['COMISION CLIENTE'] ||
        record[' COMISION CLIENTE '] || 0
      );
      
      const comisionesFacturadas = parseFloat(
        record['COMISIONES FACTURADAS'] || 
        record[' COMISIONES FACTURADAS '] || 
        record['COMISIONES_FACTURADAS'] ||
        record['COMISION FACTURADAS'] ||
        record[' COMISION FACTURADAS '] || 0
      );
      
      const totalComisiones = comisionesCliente + comisionesFacturadas;
      
      console.log('🔍 [Chart] Registro:', {
        cveper,
        totalPercepciones,
        sueldoCliente,
        comisionesCliente,
        comisionesFacturadas,
        totalComisiones,
        camposComisiones: Object.keys(record).filter(key => key.toLowerCase().includes('comision')).slice(0, 10)
      });
      
      if (!groupedData[cveper]) {
        groupedData[cveper] = {
          cveper,
          totalPercepciones: 0,
          sueldoCliente: 0,
          comisionesCliente: 0,
          comisionesFacturadas: 0,
          totalComisiones: 0,
          count: 0
        };
      }
      
      groupedData[cveper].totalPercepciones += totalPercepciones;
      groupedData[cveper].sueldoCliente += sueldoCliente;
      groupedData[cveper].comisionesCliente += comisionesCliente;
      groupedData[cveper].comisionesFacturadas += comisionesFacturadas;
      groupedData[cveper].totalComisiones += totalComisiones;
      groupedData[cveper].count += 1;
    });
    
    // Convertir a array y ordenar cronológicamente
    const sortedData = Object.values(groupedData)
      .sort((a, b) => {
        // Usar la función de timestamp para ordenamiento cronológico
        const timestampA = fechaATimestamp(a.cveper);
        const timestampB = fechaATimestamp(b.cveper);
        
        console.log('⏰ [Chart] Ordenando:', {
          cveperA: a.cveper,
          timestampA,
          fechaA: new Date(timestampA).toISOString().split('T')[0],
          cveperB: b.cveper,
          timestampB,
          fechaB: new Date(timestampB).toISOString().split('T')[0],
          comparacion: timestampA - timestampB
        });
        
        // Ordenamiento cronológico (fechas más antiguas primero)
        return timestampA - timestampB;
      });
    
    console.log('📊 [Chart] Datos procesados:', sortedData);
    
    // Preparar datos para Chart.js con etiquetas temporales limpias (sin timestamps)
    const labels = sortedData.map(item => {
      const cveper = item.cveper;
      console.log('🏷️ [Chart] Formateando etiqueta:', cveper, 'Tipo:', typeof cveper);
      
      // Aplicar formateo limpio de fechas
      const fechaFormateada = formatearFechaSinHora(cveper);
      console.log('🏷️ [Chart] Resultado formateo:', fechaFormateada);
      
      return fechaFormateada;
    });
    
    const percepcionesData = sortedData.map(item => item.totalPercepciones);
    const sueldoClienteData = sortedData.map(item => item.sueldoCliente);
    const comisionesTotalesData = sortedData.map(item => item.totalComisiones);
    
    // Calcular valores mínimo y máximo para escalado automático (considerando todas las líneas)
    const allValues = [...percepcionesData, ...sueldoClienteData, ...comisionesTotalesData];
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const range = maxValue - minValue;
    
    console.log('📊 [Chart] Rango de valores:', { minValue, maxValue, range });
    
    return {
      labels,
      datasets: [
        {
          label: 'TOTAL PERCEPCIONES',
          data: percepcionesData,
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
          label: 'SUELDO CLIENTE',
          data: sueldoClienteData,
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
        },
        {
          label: 'COMISIONES TOTALES',
          data: comisionesTotalesData,
          borderColor: '#228B22', // Color verde bosque
          backgroundColor: 'rgba(34, 139, 34, 0.1)', // Fondo translúcido verde
          borderWidth: 3,
          pointBackgroundColor: '#228B22', // Puntos verdes
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false, // Sin relleno
          tension: 0.4,
        }
      ],
      // Metadatos para configurar las escalas
      metadata: {
        maxValue,
        minValue,
        range,
        periods: sortedData.map(item => item.cveper),
        temporalData: sortedData,
        comisionesDetalle: sortedData.map(item => ({
          periodo: item.cveper,
          comisionesCliente: item.comisionesCliente,
          comisionesFacturadas: item.comisionesFacturadas,
          totalComisiones: item.totalComisiones
        }))
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
    
    console.log('📊 [Chart] Configuración de escalas:', {
      yMin, yMax, yStepSize, ySteps, uniqueYears
    });

    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, activeElements) => {
        if (activeElements.length > 0 && onPeriodClick) {
          const dataIndex = activeElements[0].index;
          const periods = data.metadata?.periods || [];
          const clickedPeriod = periods[dataIndex];
          
          if (clickedPeriod) {
            console.log('👆 [Chart] Click en período:', clickedPeriod);
            onPeriodClick(clickedPeriod);
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
          text: 'Histórico de Percepciones por Período',
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
          displayColors: true, // Mostrar colores para diferenciar líneas
          callbacks: {
            title: function(context) {
              // El tooltip ya recibe la etiqueta formateada (sin timestamp)
              return `Período: ${context[0].label}`;
            },
            label: function(context) {
              const value = context.parsed.y;
              const datasetLabel = context.dataset.label;
              const dataIndex = context.dataIndex;
              
              // Si es la línea de comisiones, mostrar desglose detallado
              if (datasetLabel === 'COMISIONES TOTALES' && data.metadata.comisionesDetalle) {
                const detalle = data.metadata.comisionesDetalle[dataIndex];
                if (detalle) {
                  return [
                    `${datasetLabel}: $${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    `  • Comisiones Cliente: $${detalle.comisionesCliente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    `  • Comisiones Facturadas: $${detalle.comisionesFacturadas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ];
                }
              }
              
              // Para otras líneas, mostrar formato estándar
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
            text: 'PERCEPCIONES',
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
  
  // Opciones por defecto cuando no hay metadatos
  const getDefaultChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, activeElements) => {
      if (activeElements.length > 0 && onPeriodClick) {
        const dataIndex = activeElements[0].index;
        // Para opciones por defecto, usar los labels como períodos
        const clickedPeriod = chartData?.labels?.[dataIndex];
        
        if (clickedPeriod) {
          console.log('👆 [Chart] Click en período (default):', clickedPeriod);
          onPeriodClick(clickedPeriod);
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
        text: 'Histórico de Percepciones por Período',
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
        displayColors: true, // Mostrar colores para diferenciar líneas
        callbacks: {
          title: function(context) {
            // El tooltip ya recibe la etiqueta formateada (sin timestamp)
            return `Período: ${context[0].label}`;
          },
          label: function(context) {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            
            // Para opciones por defecto, mostrar formato estándar
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
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12,
            weight: '500'
          },
          maxRotation: 45,
          minRotation: 0
        },
        title: {
          display: true,
          text: 'Períodos de Nómina',
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 14,
            weight: '600'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12,
            weight: '500'
          },
          callback: function(value) {
            return '$' + value.toLocaleString('es-MX');
          }
        },
        title: {
          display: true,
          text: 'Total de Percepciones (MXN)',
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 14,
            weight: '600'
          }
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
  });

  if (loading) {
    return (
      <ChartContainer>
        <ChartTitle>Histórico de Percepciones</ChartTitle>
        <LoadingContainer>
          Cargando datos históricos...
        </LoadingContainer>
      </ChartContainer>
    );
  }

  if (error) {
    return (
      <ChartContainer>
        <ChartTitle>Histórico de Percepciones</ChartTitle>
        <ErrorContainer>
          {error}
        </ErrorContainer>
      </ChartContainer>
    );
  }

  if (!chartData) {
    return (
      <ChartContainer>
        <ChartTitle>Histórico de Percepciones</ChartTitle>
        <LoadingContainer>
          No hay datos disponibles
        </LoadingContainer>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <ChartTitle>Histórico de Percepciones por Período</ChartTitle>
      <ChartWrapper>
        <Line data={chartData} options={generateChartOptions(chartData)} />
      </ChartWrapper>
    </ChartContainer>
  );
};

export default PercepcionesHistoricoChart;
