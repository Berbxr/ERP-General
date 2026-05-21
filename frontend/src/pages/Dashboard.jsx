import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Calendar, CheckCircle, 
  Clock, TrendingUp, Award, Briefcase, DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        const res = await axios.get('/api/dashboard');
        setData(res.data);
      } catch (error) {
        console.error("Error cargando dashboard");
      }
    };
    cargarDashboard();
  }, []);

  if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando panel de control...</div>;

  // Extraemos los datos (asegurando valores por defecto si el backend aún no los manda)
  const { metricas = {}, agenda = [], topEmpleados = [] } = data;

  // Calculamos el máximo de servicios para la barra de progreso del Top Empleados
  const maxServicios = topEmpleados.length > 0 ? Math.max(...topEmpleados.map(e => e.totalServicios)) : 1;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* --- SALUDO --- */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>📊 Panel de Rendimiento</h1>
        <p style={{ margin: 0, color: '#64748b' }}>Resumen de servicios y productividad de tu equipo.</p>
      </div>

      {/* --- TARJETAS DE MÉTRICAS (KPIs ENFOCADOS EN SERVICIOS) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        <CardKpi 
          titulo="Servicios Hoy" 
          valor={metricas.serviciosHoy || 0} 
          icono={<CheckCircle size={24} color="#2563eb"/>} 
          colorBg="#eff6ff" 
          colorTexto="#1e40af"
        />

        <CardKpi 
          titulo="Servicios Semana (Lun-Vie)" 
          valor={metricas.serviciosSemana || 0} 
          icono={<TrendingUp size={24} color="#16a34a"/>} 
          colorBg="#dcfce7" 
          colorTexto="#166534"
        />

        <CardKpi 
          titulo="Ingresos Semana" 
          valor={`$${metricas.ingresosSemana || '0.00'}`} 
          icono={<DollarSign size={24} color="#d97706"/>} 
          colorBg="#fffbeb" 
          colorTexto="#92400e"
        />

        <CardKpi 
          titulo="Total Clientes" 
          valor={metricas.totalClientes || 0} 
          icono={<Users size={24} color="#6b7280"/>} 
          colorBg="#f3f4f6" 
          colorTexto="#374151"
        />
      </div>

      {/* --- SECCIÓN DIVIDIDA: TOP EMPLEADOS + AGENDA --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', alignItems: 'start' }}>
        
        {/* Lado Izquierdo: Top Empleados */}
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Award size={24} color="#eab308"/>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Top Empleados (Lun - Vie)</h3>
          </div>

          {topEmpleados.length === 0 ? (
            <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No hay servicios completados esta semana aún.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {topEmpleados.map((empleado, index) => (
                <div key={empleado.id || index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: '#334155', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>#{index + 1}</span> {empleado.nombre}
                    </strong>
                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{empleado.totalServicios} servicios</span>
                  </div>
                  {/* Barra de progreso visual */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      backgroundColor: index === 0 ? '#3b82f6' : '#94a3b8', // El primer lugar resalta en azul
                      width: `${(empleado.totalServicios / maxServicios) * 100}%`,
                      transition: 'width 0.5s ease-in-out'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente pequeño para las tarjetas de arriba
const CardKpi = ({ titulo, valor, icono, colorBg, colorTexto }) => (
  <div style={{ 
    backgroundColor: 'white', padding: '20px', borderRadius: '12px', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '110px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>{titulo}</span>
      <div style={{ backgroundColor: colorBg, padding: '8px', borderRadius: '8px' }}>
        {icono}
      </div>
    </div>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color: colorTexto }}>
      {valor}
    </div>
  </div>
);

export default Home;