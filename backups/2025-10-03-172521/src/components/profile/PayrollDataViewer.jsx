import React, { useState, useEffect, useCallback } from 'react';
import InformacionGeneralSection from './sections/InformacionGeneralSection';
import InformacionSalarialSection from './sections/InformacionSalarialSection';
import PercepcionesAdicionalesSection from './sections/PercepcionesAdicionalesSection';
import BeneficiosAjustesSection from './sections/BeneficiosAjustesSection';
import TotalesCostosSection from './sections/TotalesCostosSection';
import DeduccionesSection from './sections/DeduccionesSection';

const PayrollDataViewer = ({ curp, selectedPeriod }) => {
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayrollData = useCallback(async (curpValue, periodValue) => {
    if (!curpValue) {
      console.log('Missing CURP, clearing data');
      setPayrollData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Cargando datos para CURP:', curpValue, 'Period:', periodValue);
      
      // USAR EL MISMO MÉTODO QUE DatosEmpleado.jsx
      const params = new URLSearchParams({
        curp: curpValue, // El parámetro CURP
        pageSize: '1000',
        page: '1'
      });
      
      // Si hay cveper seleccionado, agregarlo
      if (periodValue) {
        // Si es un arreglo, tomar el primer elemento
        const cveperValue = Array.isArray(periodValue) ? periodValue[0] : periodValue;
        params.append('cveper', cveperValue);
        console.log('📅 Agregando filtro cveper:', cveperValue);
      }
      
      // USAR EL MISMO ENDPOINT QUE DatosEmpleado
      const response = await fetch(`http://localhost:3001/api/percepciones?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos del empleado');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data || result.data.length === 0) {
        console.warn('No se encontraron datos para el empleado con CURP:', curpValue);
        setPayrollData(null);
        setError('No se encontraron datos para este empleado en el período seleccionado');
        return;
      }
      
      // Tomar el primer registro (ya filtrado por CURP y cveper si se especificó)
      const empleadoData = result.data[0];
      
      console.log('📊 Datos del empleado obtenidos:', {
        curp: curpValue,
        totalRegistros: result.data.length,
        cveper: empleadoData.cveper || empleadoData['cveper'],
        nombreCompleto: empleadoData['Nombre completo']
      });
      
      console.log('🔍 Campos principales encontrados:', {
        rfc: empleadoData['RFC'],
        curp: empleadoData['CURP'],
        nombre: empleadoData['Nombre completo'],
        puesto: empleadoData['Puesto'],
        compania: empleadoData['Compañía'],
        cveper: empleadoData.cveper || empleadoData['cveper']
      });
      
      // Pasar los datos raw completos a los componentes
      setPayrollData(empleadoData);
      
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

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        background: 'rgba(255, 107, 107, 0.1)',
        border: '1px solid rgba(255, 107, 107, 0.3)',
        borderRadius: '12px',
        margin: '1rem 0'
      }}>
        <h3 style={{ color: '#ff6b6b', marginBottom: '1rem' }}>Error al cargar datos</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Component A - Información General */}
      <InformacionGeneralSection 
        data={payrollData} 
        loading={loading} 
      />
      
      {/* Component B - Información Salarial Básica */}
      <InformacionSalarialSection 
        data={payrollData} 
        loading={loading} 
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
