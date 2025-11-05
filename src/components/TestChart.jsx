import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TestChart = () => {
  // Datos de prueba super simples
  const data = {
    labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'],
    datasets: [
      {
        label: 'Ventas',
        data: [12000, 19000, 8000, 15000, 22000],
        borderColor: '#ff0000', // Rojo brillante
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        borderWidth: 1,
      }
    ]
  };

  // Configuración absolutamente mínima y forzada
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Gráfica de Prueba',
        color: '#000000', // Negro
        font: {
          size: 20,
          weight: 'bold'
        }
      },
      legend: {
        display: true,
        labels: {
          color: '#000000' // Negro
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: '#ff0000', // Rojo brillante
          lineWidth: 1,
          drawBorder: true,
          drawOnChartArea: true,
          drawTicks: true
        },
        ticks: {
          display: true,
          color: '#000000', // Negro
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        title: {
          display: true,
          text: 'MESES - DEBE VERSE',
          color: '#ff0000', // Rojo
          font: {
            size: 18,
            weight: 'bold'
          }
        }
      },
      y: {
        display: true,
        grid: {
          display: true,
          color: '#0000ff', // Azul brillante
          lineWidth: 3,
          drawBorder: true,
          drawOnChartArea: true,
          drawTicks: true
        },
        ticks: {
          display: true,
          color: '#000000', // Negro
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        title: {
          display: true,
          text: 'VENTAS - DEBE VERSE',
          color: '#0000ff', // Azul
          font: {
            size: 18,
            weight: 'bold'
          }
        }
      }
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '500px', 
      backgroundColor: '#f0f0f0',  // Fondo gris claro
      padding: '20px',
      border: '3px solid #000000' // Borde negro
    }}>
      <h2 style={{ color: '#000000', textAlign: 'center' }}>
        COMPONENTE DE PRUEBA - ESCALAS DEBEN SER VISIBLES
      </h2>
      <div style={{ height: '400px', backgroundColor: '#ffffff' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default TestChart;
