import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaCoins, FaCalculator, FaPercent, FaCalendarAlt, FaDollarSign, FaFileExport, FaChartLine } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
  registerables
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartErrorBoundary from '../components/ChartErrorBoundary';

// Register all Chart.js components (comprehensive approach)
ChartJS.register(...registerables);

// Also register explicitly (belt and suspenders approach)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PageContainer = styled.div`
  padding: 2rem;
  color: #2c3e50;
  min-height: calc(100vh - 80px);
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 300;
  margin: 0;
  letter-spacing: 1px;
`;

const SimulatorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  min-height: calc(100vh - 250px);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
`;

const Card = styled.div`
  background: #1a365d11;
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
`;

const CardTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0 0 2rem 0;
  color: #1a365d;  /* Azul marino oficial */
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.2rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
`;

const Input = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #1a365d;
  font-size: 1rem;
  
  &::placeholder {
    color: rgba(44, 62, 80, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #1e3a8a;
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 20px rgba(168, 237, 234, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #2c3e50;
  font-size: 1rem;
  
  option {
    background: #ffffffff;
    color: #2c3e50;
  }
  
  &:focus {
    outline: none;
    border-color: #1e3a8a;
  }
`;

const Slider = styled.input`
  width: 100%;
  margin: 1rem 0;
  -webkit-appearance: none;
  height: 8px;
  border-radius: 4px;
  background: #1a365d38;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #1a365d;  /* Azul marino oficial */
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(26, 54, 93, 0.3);
  }
  
  &::-webkit-slider-thumb:hover {
    background: #2c5282;  /* Azul marino más claro para hover */
    transform: scale(1.2);
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.5);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #1a365d;  /* Azul marino oficial */
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(26, 54, 93, 0.3);
  }
  
  &::-moz-range-thumb:hover {
    background: #2c5282;
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.5);
  }
`;

const SliderValue = styled.div`
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a365d;  /* Azul marino oficial */
  margin-bottom: 0.5rem;
`;

const CalculateButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #1a365dd4 0%, #1a365d 100%);
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(30, 58, 138, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ResultCard = styled.div`
  background: #1a365d1f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }
`;

const ResultValue = styled.div`
  font-size: 1.8rem;
  font-weight: 600;
  color: #1a365d;
  margin-bottom: 0.5rem;
`;

const ResultLabel = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const PaymentTable = styled.div`
  background: #1a365d1f;
  border-radius: 12px;
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 0.75rem;
    text-align: right;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.9rem;
  }
  
  th {
    background: rgba(255, 255, 255, 0.1);
    font-weight: 600;
    color: #1a365d;
    position: sticky;
    top: 0;
  }
  
  tr:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const ExportButton = styled.button`
  background: rgba(46, 204, 113, 0.2);
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #0f6c13ff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  margin-bottom: 1rem;
  
  &:hover {
    background: rgba(1, 93, 12, 0.3);
    transform: translateY(-2px);
  }
`;

const AlertBox = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  color: #ffc107;
  font-size: 0.9rem;
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.9;
  
  input[type="radio"] {
    appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    position: relative;
    margin: 0;
    
    &:checked {
      border-color: #1a365d;
      
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #1a365d;
      }
    }
    
    &:focus {
      outline: none;
      box-shadow: 0 0 10px rgba(168, 237, 234, 0.3);
    }
  }
  
  &:hover {
    opacity: 1;
  }
`;

const ChartContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: 2rem;
`;

const ChartWrapper = styled.div`
  height: 400px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  
  canvas {
    border-radius: 8px;
  }
`;

const SimuladorCreditos = () => {
  const [formData, setFormData] = useState({
    amount: 50000,
    interestRate: 12,
    term: 12,
    creditType: 'personal',
    rateType: 'fixed', // 'fixed' or 'variable'
    paymentFrequency: 'monthly', // 'monthly', 'biweekly', 'weekly'
    employeeName: '' // Nombre del empleado
  });

  const [results, setResults] = useState(null);
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const chartRef = useRef(null);

  const creditTypes = {
    personal: { name: 'Crédito Personal', minRate: 10, maxRate: 25 },
    auto: { name: 'Crédito Automotriz', minRate: 8, maxRate: 18 },
    mortgage: { name: 'Hipotecario', minRate: 6, maxRate: 12 },
    business: { name: 'Crédito Empresarial', minRate: 12, maxRate: 30 }
  };

  const paymentFrequencies = {
    monthly: { 
      name: 'Mensual', 
      paymentsPerYear: 12,
      label: 'meses',
      minTerm: 6,
      maxTerm: 72
    },
    biweekly: { 
      name: 'Quincenal', 
      paymentsPerYear: 24,
      label: 'quincenas',
      minTerm: 12,
      maxTerm: 144
    },
    weekly: { 
      name: 'Semanal', 
      paymentsPerYear: 52,
      label: 'semanas',
      minTerm: 26,
      maxTerm: 312
    }
  };

  // Función para convertir periodos entre diferentes frecuencias
  const convertTerm = (currentTerm, fromFrequency, toFrequency) => {
    if (fromFrequency === toFrequency) return currentTerm;
    
    // Convertir a meses primero como unidad base
    let months;
    switch (fromFrequency) {
      case 'monthly':
        months = currentTerm;
        break;
      case 'biweekly':
        months = Math.round(currentTerm / 2);
        break;
      case 'weekly':
        months = Math.round(currentTerm / (52/12));
        break;
      default:
        months = currentTerm;
    }
    
    // Convertir de meses a la frecuencia objetivo
    switch (toFrequency) {
      case 'monthly':
        return months;
      case 'biweekly':
        return months * 2;
      case 'weekly':
        return Math.round(months * (52/12));
      default:
        return months;
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'paymentFrequency') {
      // Cuando cambie la periodicidad, convertir el plazo actual
      const currentTerm = formData.term;
      const currentFrequency = formData.paymentFrequency;
      const newTerm = convertTerm(currentTerm, currentFrequency, value);
      
      setFormData(prev => ({
        ...prev,
        [field]: value,
        term: newTerm
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const calculateLoan = () => {
    const { amount, interestRate, term, rateType, paymentFrequency } = formData;
    const numPayments = term;
    const paymentsPerYear = paymentFrequencies[paymentFrequency].paymentsPerYear;
    let totalPayment = 0;
    let totalInterest = 0;
    let balance = amount;
    const schedule = [];

    if (rateType === 'fixed') {
      // Cálculo de tasa fija (amortización francesa - cuota constante)
      const periodRate = interestRate / 100 / paymentsPerYear; // Tasa por período
      
      // Calcular la cuota fija usando la fórmula de amortización francesa
      const fixedMonthlyPayment = amount * (periodRate * Math.pow(1 + periodRate, numPayments)) / 
                                  (Math.pow(1 + periodRate, numPayments) - 1);

      // Generar tabla de amortización para tasa fija (cuota constante)
      balance = amount;
      for (let i = 1; i <= numPayments; i++) {
        // Calcular interés sobre saldo insoluto
        const interestPayment = balance * periodRate;
        
        // El capital es la diferencia entre la cuota fija y el interés
        const principalPayment = fixedMonthlyPayment - interestPayment;
        
        // La cuota mensual es siempre la misma (cuota fija)
        const monthlyPayment = fixedMonthlyPayment;
        
        // Actualizar saldo
        balance -= principalPayment;
        
        // Acumular totales
        totalPayment += monthlyPayment;
        totalInterest += interestPayment;

        schedule.push({
          payment: i,
          monthlyPayment: monthlyPayment,
          principalPayment: principalPayment,
          interestPayment: interestPayment,
          balance: Math.max(0, balance),
          currentRate: interestRate
        });
      }

      setResults({
        monthlyPayment: fixedMonthlyPayment, // La cuota es siempre la misma
        totalPayment: totalPayment,
        totalInterest: totalInterest,
        effectiveRate: interestRate
      });
    } else {
      // Cálculo de tasa variable
      balance = amount;
      let avgMonthlyPayment = 0;
      
      for (let i = 1; i <= numPayments; i++) {
        // Simular variación de tasa: oscila entre -2% y +3% de la tasa base
        const variationFactor = 0.5 * Math.sin(i * 0.5) + 0.5 * Math.sin(i * 0.2);
        const currentAnnualRate = interestRate + (variationFactor * 2.5);
        const currentPeriodRate = Math.max(0.001, currentAnnualRate / 100 / paymentsPerYear); // Evitar tasa negativa
        
        // Para tasa variable, calcular la cuota con la tasa actual y los pagos restantes
        const remainingPayments = numPayments - i + 1;
        let monthlyPayment;
        
        if (remainingPayments > 1) {
          monthlyPayment = balance * (currentPeriodRate * Math.pow(1 + currentPeriodRate, remainingPayments)) / 
                          (Math.pow(1 + currentPeriodRate, remainingPayments) - 1);
        } else {
          // Último pago
          monthlyPayment = balance * (1 + currentPeriodRate);
        }
        
        const interestPayment = balance * currentPeriodRate;
        const principalPayment = monthlyPayment - interestPayment;
        balance -= principalPayment;
        
        totalPayment += monthlyPayment;
        totalInterest += interestPayment;
        avgMonthlyPayment += monthlyPayment;

        schedule.push({
          payment: i,
          monthlyPayment: monthlyPayment,
          principalPayment: principalPayment,
          interestPayment: interestPayment,
          balance: Math.max(0, balance),
          currentRate: currentAnnualRate
        });
      }
      
      avgMonthlyPayment /= numPayments;
      const effectiveRate = totalInterest > 0 ? (totalInterest / amount) * (12 / term) * 100 : interestRate;

      setResults({
        monthlyPayment: avgMonthlyPayment,
        totalPayment: totalPayment,
        totalInterest: totalInterest,
        effectiveRate: effectiveRate
      });
    }

    setPaymentSchedule(schedule);
  };

  useEffect(() => {
    calculateLoan();
  }, [formData]);

  const exportResults = async () => {
    // Validar que el nombre del empleado esté presente
    if (!formData.employeeName.trim()) {
      alert('Por favor incluir el nombre del empleado en la simulación');
      return;
    }

    try {
      // Crear nombre del archivo
      const today = new Date();
      const dateStr = today.toLocaleDateString('es-MX').replace(/\//g, '-');
      const employeeName = formData.employeeName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const amount = Math.round(formData.amount / 1000) + 'K';
      const filename = `Credito_${employeeName}_${amount}_${dateStr}.pdf`;

      // Crear el PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Encabezado
      pdf.setFontSize(20);
      pdf.setTextColor(51, 51, 51);
      pdf.text('SIMULACIÓN DE CRÉDITO', pageWidth / 2, 20, { align: 'center' });
      
      // Fecha y empleado
      pdf.setFontSize(12);
      pdf.text(`Fecha: ${today.toLocaleDateString('es-MX')}`, 20, 35);
      pdf.text(`Empleado: ${formData.employeeName}`, 20, 45);
      
      // Línea separadora
      pdf.setLineWidth(0.5);
      pdf.line(20, 55, pageWidth - 20, 55);
      
      // SECCIÓN: Datos del Crédito
      let yPosition = 70;
      pdf.setFontSize(16);
      pdf.setTextColor(26, 128, 182);
      pdf.text('DATOS DEL CRÉDITO', 20, yPosition);
      
      yPosition += 15;
      pdf.setFontSize(11);
      pdf.setTextColor(51, 51, 51);
      
      const creditData = [
        [`Tipo de Crédito:`, creditTypes[formData.creditType].name],
        [`Monto:`, formatCurrency(formData.amount)],
        [`Tipo de Tasa:`, formData.rateType === 'fixed' ? 'Tasa Fija' : 'Tasa Variable'],
        [`Tasa de Interés Anual:`, `${formData.interestRate}%`],
        [`Periodicidad de Pago:`, paymentFrequencies[formData.paymentFrequency].name],
        [`Plazo:`, `${formData.term} ${paymentFrequencies[formData.paymentFrequency].label}`]
      ];
      
      creditData.forEach(([label, value]) => {
        pdf.text(label, 25, yPosition);
        pdf.text(value, 90, yPosition);
        yPosition += 8;
      });
      
      // SECCIÓN: Resultados
      yPosition += 10;
      pdf.setFontSize(16);
      pdf.setTextColor(26, 128, 182);
      pdf.text('RESULTADOS', 20, yPosition);
      
      yPosition += 15;
      pdf.setFontSize(11);
      pdf.setTextColor(51, 51, 51);
      
      const resultsData = [
        [formData.rateType === 'fixed' ? `Cuota Mensual Fija:` : `Cuota Mensual Promedio:`, formatCurrency(results.monthlyPayment)],
        [`Total a Pagar:`, formatCurrency(results.totalPayment)],
        [`Total Intereses:`, formatCurrency(results.totalInterest)],
        [`Tasa Efectiva:`, `${results.effectiveRate.toFixed(2)}%`]
      ];
      
      resultsData.forEach(([label, value]) => {
        pdf.text(label, 25, yPosition);
        pdf.text(value, 90, yPosition);
        yPosition += 8;
      });
      
      // SECCIÓN: Tabla de Amortización (TODOS los pagos)
      yPosition += 15;
      pdf.setFontSize(16);
      pdf.setTextColor(26, 128, 182);
      pdf.text('TABLA DE AMORTIZACIÓN COMPLETA', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(9);
      pdf.setTextColor(51, 51, 51);
      
      // Headers de la tabla
      const headers = ['Pago', 'Cuota', 'Capital', 'Interés', 'Saldo'];
      if (formData.rateType === 'variable') {
        headers.splice(4, 0, 'Tasa %');
      }
      
      let xPositions = [25, 50, 80, 110, 140];
      if (formData.rateType === 'variable') {
        xPositions = [25, 45, 70, 95, 120, 145];
      }
      
      // Función para dibujar headers de tabla
      const drawTableHeaders = () => {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(20, yPosition - 5, pageWidth - 40, 8, 'F');
        pdf.setFontSize(9);
        pdf.setTextColor(51, 51, 51);
        headers.forEach((header, index) => {
          pdf.text(header, xPositions[index], yPosition);
        });
        yPosition += 10;
      };
      
      // Dibujar headers iniciales
      drawTableHeaders();
      
      // Dibujar TODAS las filas
      for (let i = 0; i < paymentSchedule.length; i++) {
        const payment = paymentSchedule[i];
        const rowData = [
          payment.payment.toString(),
          formatCurrency(payment.monthlyPayment).replace('$', '').replace(/,/g, ''),
          formatCurrency(payment.principalPayment).replace('$', '').replace(/,/g, ''),
          formatCurrency(payment.interestPayment).replace('$', '').replace(/,/g, ''),
          formatCurrency(payment.balance).replace('$', '').replace(/,/g, '')
        ];
        
        if (formData.rateType === 'variable') {
          rowData.splice(4, 0, payment.currentRate ? `${payment.currentRate.toFixed(1)}%` : '--');
        }
        
        // Si llegamos al final de la página, agregar nueva página y redibujar headers
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 30;
          drawTableHeaders();
        }
        
        rowData.forEach((data, index) => {
          pdf.text(data, xPositions[index], yPosition);
        });
        
        yPosition += 7;
      }
      
      // Agregar nota de tabla completa
      yPosition += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Tabla completa con todos los ${paymentSchedule.length} pagos`, 25, yPosition);
      
      // SECCIÓN: Gráfica de Amortización
      const chartContainer = document.querySelector('[data-chart-container]');
      if (chartContainer) {
        try {
          // Agregar nueva página para la gráfica
          pdf.addPage();
          yPosition = 30;
          
          pdf.setFontSize(16);
          pdf.setTextColor(26, 128, 182);
          pdf.text('GRÁFICA DE AMORTIZACIÓN', 20, yPosition);
          
          // Capturar el contenedor completo de la gráfica
          const chartCanvas = await html2canvas(chartContainer, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: chartContainer.offsetWidth,
            height: chartContainer.offsetHeight,
            windowWidth: chartContainer.offsetWidth,
            windowHeight: chartContainer.offsetHeight
          });
          
          const chartImgData = chartCanvas.toDataURL('image/png', 1.0);
          
          // Insertar gráfica con mejor proporción
          const imgWidth = pageWidth - 40;
          const imgHeight = Math.min(
            (chartCanvas.height * imgWidth) / chartCanvas.width,
            pageHeight - yPosition - 40
          );
          
          pdf.addImage(chartImgData, 'PNG', 20, yPosition + 15, imgWidth, imgHeight);
          
          // Agregar descripción de la gráfica
          yPosition = yPosition + imgHeight + 25;
          pdf.setFontSize(10);
          pdf.setTextColor(80, 80, 80);
          const description = [
            'La gráfica muestra la evolución del crédito durante el plazo seleccionado:',
            '• Línea Roja: Saldo pendiente de pago que disminuye con el tiempo',
            '• Línea Verde: Capital pagado acumulado que aumenta progresivamente',
            '• Barras Azules: Pago de capital por cada período',
            '• Barras Amarillas: Pago de interés por cada período'
          ];
          
          description.forEach(line => {
            if (yPosition < pageHeight - 20) {
              pdf.text(line, 25, yPosition);
              yPosition += 6;
            }
          });
          
        } catch (chartError) {
          console.warn('No se pudo capturar la gráfica:', chartError);
          // Agregar mensaje de error en el PDF
          pdf.addPage();
          yPosition = 30;
          pdf.setFontSize(16);
          pdf.setTextColor(26, 128, 182);
          pdf.text('GRÁFICA DE AMORTIZACIÓN', 20, yPosition);
          yPosition += 20;
          pdf.setFontSize(10);
          pdf.setTextColor(120, 120, 120);
          pdf.text('No se pudo generar la gráfica en este reporte.', 25, yPosition);
        }
      }
      
      // Pie de página
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Simulación generada por Sistema Numérica', pageWidth / 2, pageHeight - 5, { align: 'center' });
      }
      
      // Guardar el PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  // Generar fechas de pago basadas en la periodicidad
  const generatePaymentDates = () => {
    const startDate = new Date();
    const dates = [];
    const { paymentFrequency, term } = formData;
    
    for (let i = 1; i <= term; i++) {
      const paymentDate = new Date(startDate);
      
      switch (paymentFrequency) {
        case 'monthly':
          paymentDate.setMonth(startDate.getMonth() + i);
          break;
        case 'biweekly':
          paymentDate.setDate(startDate.getDate() + (i * 15));
          break;
        case 'weekly':
          paymentDate.setDate(startDate.getDate() + (i * 7));
          break;
        default:
          paymentDate.setMonth(startDate.getMonth() + i);
      }
      
      dates.push(paymentDate.toLocaleDateString('es-MX', { 
        month: 'short', 
        year: '2-digit' 
      }));
    }
    
    return dates;
  };

  // Generar datos para la gráfica de amortización
  const generateChartData = () => {
    if (!paymentSchedule.length) return null;
    
    const dates = generatePaymentDates();
    const balanceData = paymentSchedule.map(p => p.balance);
    const principalData = paymentSchedule.map(p => p.principalPayment);
    const interestData = paymentSchedule.map(p => p.interestPayment);
    
    // Calcular capital acumulado pagado
    const cumulativePrincipal = [];
    let accumulated = 0;
    for (const payment of paymentSchedule) {
      accumulated += payment.principalPayment;
      cumulativePrincipal.push(accumulated);
    }
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Saldo Pendiente',
          data: balanceData,
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Capital Pagado Acumulado',
          data: cumulativePrincipal,
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Pago de Capital (por período)',
          data: principalData,
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30, 58, 138, 0.3)',
          type: 'bar',
          yAxisID: 'y1'
        },
        {
          label: 'Pago de Interés (por período)',
          data: interestData,
          borderColor: '#ffd93d',
          backgroundColor: 'rgba(255, 217, 61, 0.3)',
          type: 'bar',
          yAxisID: 'y1'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(44, 62, 80, 0.8)',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#1e3a8a',
        bodyColor: '#2c3e50',
        borderColor: '#1e3a8a',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(200, 200, 200, 0.3)'
        },
        ticks: {
          color: 'rgba(44, 62, 80, 0.7)',
          maxRotation: 45
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: 'rgba(200, 200, 200, 0.3)'
        },
        ticks: {
          color: 'rgba(44, 62, 80, 0.7)',
          callback: function(value) {
            return new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: 'rgba(44, 62, 80, 0.7)',
          callback: function(value) {
            return new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <FaCoins size={40} color="#733b47" />
        <PageTitle>Simulador de Créditos</PageTitle>
      </PageHeader>



      <SimulatorGrid>
        <Card>
          <CardTitle>
            <FaCalculator />
            Datos del Crédito
          </CardTitle>

          <FormRow>
            <FormColumn>
              <Label>Tipo de Crédito</Label>
              <Select
                value={formData.creditType}
                onChange={(e) => handleInputChange('creditType', e.target.value)}
              >
                {Object.entries(creditTypes).map(([key, type]) => (
                  <option key={key} value={key}>{type.name}</option>
                ))}
              </Select>
            </FormColumn>
            
            <FormColumn>
              <Label>Nombre del Empleado</Label>
              <Input
                type="text"
                value={formData.employeeName}
                onChange={(e) => handleInputChange('employeeName', e.target.value)}
                placeholder="Ingrese el nombre del empleado"
              />
            </FormColumn>
          </FormRow>

          

          <FormGroup>
            <Label>Monto del Crédito</Label>
            <SliderValue>{formatCurrency(formData.amount)}</SliderValue>
            <Slider
              type="range"
              min="400"
              max="2000000"
              step="1000"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', parseInt(e.target.value))}
            />
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', parseInt(e.target.value))}
              min="400"
              max="2000000"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Tipo de Tasa</Label>
            <RadioGroup>
              <RadioOption>
                <input
                  type="radio"
                  name="rateType"
                  value="fixed"
                  checked={formData.rateType === 'fixed'}
                  onChange={(e) => handleInputChange('rateType', e.target.value)}
                />
                Tasa Fija
              </RadioOption>
              <RadioOption>
                <input
                  type="radio"
                  name="rateType"
                  value="variable"
                  checked={formData.rateType === 'variable'}
                  onChange={(e) => handleInputChange('rateType', e.target.value)}
                />
                Tasa Variable
              </RadioOption>
            </RadioGroup>
          </FormGroup>

          <FormGroup>
            <Label>Tasa de Interés Anual (%)</Label>
            <SliderValue>{formData.interestRate}%</SliderValue>
            <Slider
              type="range"
              min={creditTypes[formData.creditType].minRate}
              max={creditTypes[formData.creditType].maxRate}
              step="0.5"
              value={formData.interestRate}
              onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value))}
            />
          </FormGroup>

          <FormGroup>
            <Label>Periodicidad de Pago</Label>
            <Select
              value={formData.paymentFrequency}
              onChange={(e) => handleInputChange('paymentFrequency', e.target.value)}
            >
              {Object.entries(paymentFrequencies).map(([key, freq]) => (
                <option key={key} value={key}>{freq.name}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Plazo ({paymentFrequencies[formData.paymentFrequency].label})</Label>
            <SliderValue>{formData.term} {paymentFrequencies[formData.paymentFrequency].label}</SliderValue>
            <Slider
              type="range"
              min={paymentFrequencies[formData.paymentFrequency].minTerm}
              max={paymentFrequencies[formData.paymentFrequency].maxTerm}
              step="1"
              value={formData.term}
              onChange={(e) => handleInputChange('term', parseInt(e.target.value))}
            />
          </FormGroup>

          <CalculateButton onClick={calculateLoan}>
            <FaCalculator />
            Recalcular
          </CalculateButton>
        </Card>

        <Card>
          <CardTitle>
            <FaDollarSign />
            Resultados
          </CardTitle>

          {results && (
            <>
              <ResultsGrid>
                <ResultCard>
                  <ResultValue>{formatCurrency(results.monthlyPayment)}</ResultValue>
                  <ResultLabel>{formData.rateType === 'fixed' ? 'Cuota Mensual Fija' : 'Cuota Mensual Promedio'}</ResultLabel>
                </ResultCard>

                <ResultCard>
                  <ResultValue>{formatCurrency(results.totalPayment)}</ResultValue>
                  <ResultLabel>Total a Pagar</ResultLabel>
                </ResultCard>

                <ResultCard>
                  <ResultValue>{formatCurrency(results.totalInterest)}</ResultValue>
                  <ResultLabel>Total Intereses</ResultLabel>
                </ResultCard>

                <ResultCard>
                  <ResultValue>{results.effectiveRate.toFixed(2)}%</ResultValue>
                  <ResultLabel>Tasa Efectiva</ResultLabel>
                </ResultCard>
              </ResultsGrid>

              <ExportButton onClick={exportResults}>
                <FaFileExport />
                Exportar Simulación
              </ExportButton>

              <PaymentTable>
                <Table>
                  <thead>
                    <tr>
                      <th>Pago</th>
                      <th>Cuota</th>
                      <th>Capital</th>
                      <th>Interés</th>
                      {formData.rateType === 'variable' && <th>Tasa %</th>}
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSchedule.map((payment) => (
                      <tr key={payment.payment}>
                        <td>{payment.payment}</td>
                        <td>{formatCurrency(payment.monthlyPayment)}</td>
                        <td>{formatCurrency(payment.principalPayment)}</td>
                        <td>{formatCurrency(payment.interestPayment)}</td>
                        {formData.rateType === 'variable' && 
                          <td>{payment.currentRate ? payment.currentRate.toFixed(2) + '%' : '--'}</td>
                        }
                        <td>{formatCurrency(payment.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </PaymentTable>
            </>
          )}
        </Card>
      </SimulatorGrid>

      {results && paymentSchedule.length > 0 && (
        <ChartContainer data-chart-container>
          <CardTitle>
            <FaChartLine />
            Gráfica de Amortización
          </CardTitle>
          <ChartWrapper>
            <ChartErrorBoundary>
              <Line ref={chartRef} data={generateChartData()} options={chartOptions} />
            </ChartErrorBoundary>
          </ChartWrapper>
        </ChartContainer>
      )}
    </PageContainer>
  );
};

export default SimuladorCreditos;
