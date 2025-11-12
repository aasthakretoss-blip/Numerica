import React, { useState, useEffect } from 'react';

const DebugCampos = ({ rfc, selectedCveper }) => {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!rfc) return;

      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 DEBUG - Cargando datos para RFC:', rfc, 'CVEPER:', selectedCveper);
        
        const params = new URLSearchParams({
          search: rfc,
          pageSize: '1000',
          page: '1',
          sortBy: 'cveper',
          sortDir: 'desc'
        });
        
        const response = await fetch(`http://numericaapi.kretosstechnology.com:3001/busqueda-empleados?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar datos');
        }

        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          throw new Error('No se encontraron datos');
        }

        const registrosEmpleado = result.data;
        let datosCompletos;
        
        if (selectedCveper) {
          datosCompletos = registrosEmpleado.find(registro => 
            registro.cveper === selectedCveper || registro.mes === selectedCveper
          );
          
          if (!datosCompletos) {
            datosCompletos = registrosEmpleado[0];
          }
        } else {
          let ultimoCveper = null;
          let ultimoRegistro = null;
          
          for (const registro of registrosEmpleado) {
            const cveperActual = registro.cveper || registro.mes;
            if (cveperActual) {
              const timestampActual = new Date(cveperActual).getTime();
              if (!ultimoCveper || timestampActual > ultimoCveper) {
                ultimoCveper = timestampActual;
                ultimoRegistro = registro;
              }
            }
          }
          
          datosCompletos = ultimoRegistro || registrosEmpleado[0];
        }
        
        console.log('📊 DEBUG - Datos completos recibidos:', datosCompletos);
        setDatos(datosCompletos);
        
        // DEBUG ESPECÍFICO PARA PERCEPCIONES
        if (datosCompletos) {
          console.log('💰 DEBUG PERCEPCIONES - Analizando estructura...');
          
          // Buscar campos relacionados con percepciones
          const camposPercepciones = Object.keys(datosCompletos).filter(key => 
            key.toLowerCase().includes('percep') || 
            key.toLowerCase().includes('sueldo') ||
            key.toLowerCase().includes('salario') ||
            key.toLowerCase().includes('prima') ||
            key.toLowerCase().includes('aguinaldo') ||
            key.toLowerCase().includes('compensacion')
          );
          
          console.log('💰 Campos relacionados con percepciones encontrados:', camposPercepciones);
          
          camposPercepciones.forEach(campo => {
            console.log(`💰 ${campo}:`, datosCompletos[campo], typeof datosCompletos[campo]);
          });
          
          // Listar TODOS los campos con valores no nulos/cero
          const camposConValor = Object.entries(datosCompletos)
            .filter(([key, value]) => value !== null && value !== undefined && value !== 0 && value !== '')
            .map(([key, value]) => ({ campo: key, valor: value }));
            
          console.log('✅ TODOS LOS CAMPOS CON VALOR:', camposConValor);
          
          // Buscar específicamente campos de nómina
          const camposNomina = Object.keys(datosCompletos).filter(key =>
            key.toLowerCase().includes('total') ||
            key.toLowerCase().includes('neto') ||
            key.toLowerCase().includes('bruto') ||
            key.toLowerCase().includes('deduc') ||
            key.toLowerCase().includes('aport')
          );
          
          console.log('📋 Campos de nómina encontrados:', camposNomina);
          camposNomina.forEach(campo => {
            console.log(`📋 ${campo}:`, datosCompletos[campo]);
          });
        }
        
      } catch (err) {
        console.error('❌ DEBUG - Error cargando datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [rfc, selectedCveper]);

  if (loading) return <div style={{ padding: '1rem', background: '#fffbf0', border: '1px solid #ffc107', borderRadius: '8px', margin: '1rem' }}>⏳ Cargando debug...</div>;
  if (error) return <div style={{ padding: '1rem', background: '#f8d7da', border: '1px solid #dc3545', borderRadius: '8px', margin: '1rem' }}>❌ Error: {error}</div>;
  if (!datos) return <div style={{ padding: '1rem', background: '#f8f9fa', border: '1px solid #6c757d', borderRadius: '8px', margin: '1rem' }}>⏳ Sin datos</div>;

  // Lista específica de campos de percepciones que busca el componente Percepciones
  const camposPercepciones = [
    'sueldo_base', 'compensacion', 'sobresueldo', 'prima_vacacional',
    'aguinaldo', 'prima_dominical', 'horas_extra', 'comision',
    'destajo', 'gratificacion', 'prima_antiguedad', 'pagos_separacion',
    'acciones', 'viaticos', 'jubilaciones_pensiones_retiro',
    'ingresos_acumulables', 'otros_ingresos'
  ];

  const camposConValor = Object.entries(datos)
    .filter(([key, value]) => value !== null && value !== undefined && value !== 0 && value !== '')
    .map(([key, value]) => ({ campo: key, valor: value }));

  return (
    <div style={{ 
      background: '#f0f8ff', 
      border: '2px solid #007bff', 
      padding: '1rem', 
      margin: '1rem',
      borderRadius: '8px',
      fontFamily: 'monospace'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#007bff' }}>🔍 DEBUG - Análisis de Datos (RFC: {rfc})</h3>
      
      {/* SECCIÓN ESPECÍFICA DE PERCEPCIONES */}
      <div style={{ 
        background: '#e8f5e8', 
        border: '1px solid #28a745', 
        borderRadius: '6px', 
        padding: '0.75rem', 
        marginBottom: '1rem' 
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#28a745' }}>💰 PERCEPCIONES - Campos Específicos:</h4>
        <div style={{ fontSize: '11px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '4px' }}>
          {camposPercepciones.map(campo => {
            const valor = datos[campo];
            const tieneValor = valor !== null && valor !== undefined && valor !== 0;
            return (
              <div key={campo} style={{
                background: tieneValor ? '#d4edda' : '#f8d7da',
                border: `1px solid ${tieneValor ? '#c3e6cb' : '#f5c6cb'}`,
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <strong>{campo}:</strong>
                <span>{tieneValor ? `${valor} ✅` : `${valor || 'undefined'} ❌`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CAMPOS CON VALOR */}
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffc107', 
        borderRadius: '6px', 
        padding: '0.75rem', 
        marginBottom: '1rem' 
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>✅ TODOS LOS CAMPOS CON VALOR ({camposConValor.length}):</h4>
        <div style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto' }}>
          {camposConValor.map(({ campo, valor }, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e0e0e0',
              padding: '2px 0'
            }}>
              <strong style={{ color: '#856404' }}>{campo}:</strong>
              <span>{typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TODOS LOS CAMPOS */}
      <div style={{ 
        background: 'white', 
        border: '1px solid #6c757d', 
        borderRadius: '6px', 
        padding: '0.75rem' 
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#6c757d' }}>📋 TODOS LOS CAMPOS DISPONIBLES:</h4>
        <div style={{ fontSize: '10px', maxHeight: '200px', overflow: 'auto' }}>
          {Object.entries(datos).map(([key, value]) => (
            <div key={key} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              borderBottom: '1px solid #eee',
              padding: '1px 0',
              backgroundColor: (value !== null && value !== undefined && value !== 0 && value !== '') ? '#e8f5e8' : 'transparent'
            }}>
              <strong>{key}:</strong> 
              <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DebugCampos;
