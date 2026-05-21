import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const Reportes = () => {
  const [periodo, setPeriodo] = useState('mes'); // semana, mes, anio, custom
  const [mesCustom, setMesCustom] = useState(new Date().toISOString().slice(0, 7)); // Formato YYYY-MM
  const [datos, setDatos] = useState({ totalVentas: 0, totalGastos: 0, balance: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReporte();
  }, [periodo, mesCustom]); // Ejecutar cuando cambie el periodo o el mes seleccionado

  const fetchReporte = async () => {
    setLoading(true);
    const hoy = new Date();
    let inicio = new Date();
    let fin = new Date(); // Por defecto es 'ahora'

    // Lógica de fechas
    if (periodo === 'semana') {
      const day = hoy.getDay();
      const diff = hoy.getDate() - day + (day === 0 ? -6 : 1);
      inicio.setDate(diff);
      inicio.setHours(0, 0, 0, 0);
    } 
    else if (periodo === 'mes') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } 
    else if (periodo === 'anio') {
      inicio = new Date(hoy.getFullYear(), 0, 1);
    } 
    else if (periodo === 'custom') {
      // Lógica para mes específico seleccionado
      const [year, month] = mesCustom.split('-');
      inicio = new Date(year, month - 1, 1); // Día 1 del mes seleccionado
      fin = new Date(year, month, 0);        // Día 0 del siguiente mes = Último día de este mes
      fin.setHours(23, 59, 59, 999);         // Final del día
    }

    try {
      const res = await axios.get('/api/reportes/balance', {
        params: {
          inicio: inicio.toISOString(),
          fin: fin.toISOString()
        }
      });
      setDatos(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BarChart /> Reporte Financiero
      </h1>

      {/* Selector de Periodo */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '30px', alignItems: 'center' }}>
        
        {/* Botones Rápidos */}
        <BotonPeriodo label="Esta Semana" active={periodo === 'semana'} onClick={() => setPeriodo('semana')} />
        <BotonPeriodo label="Este Mes" active={periodo === 'mes'} onClick={() => setPeriodo('mes')} />
        <BotonPeriodo label="Este Año" active={periodo === 'anio'} onClick={() => setPeriodo('anio')} />

        <div style={{ width: '1px', height: '30px', backgroundColor: '#cbd5e1', margin: '0 10px' }}></div>

        {/* Selector de Mes Histórico */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>Histórico:</span>
          <input 
            type="month" 
            value={mesCustom}
            onChange={(e) => {
              setMesCustom(e.target.value);
              setPeriodo('custom'); // Al cambiar la fecha, activamos el modo custom
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: periodo === 'custom' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: periodo === 'custom' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              fontWeight: '500',
              outline: 'none',
              color: '#334155'
            }}
          />
        </div>

      </div>

      {loading ? <p style={{color:'#64748b'}}>Calculando finanzas...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          
          {/* Tarjeta Ganancias */}
          <CardReporte 
            titulo="Ingresos Totales" 
            monto={datos.totalVentas} 
            color="#16a34a" 
            icon={<TrendingUp size={30}/>} 
            sub="Ventas y Servicios"
          />

          {/* Tarjeta Gastos */}
          <CardReporte 
            titulo="Gastos / Salidas" 
            monto={datos.totalGastos} 
            color="#ef4444" 
            icon={<TrendingDown size={30}/>} 
            sub="Nóminas, insumos, luz..."
          />

          {/* Tarjeta BALANCE FINAL */}
          <div style={{ ...cardStyle, border: '2px solid #2563eb', backgroundColor: '#eff6ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e40af' }}>TOTAL REAL (Ganancia)</h3>
                <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Ingresos - Gastos</p>
              </div>
              <DollarSign size={40} color="#2563eb" />
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '15px', color: datos.balance >= 0 ? '#2563eb' : '#ef4444' }}>
              ${datos.balance.toFixed(2)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

// Componentes pequeños para estilos
const BotonPeriodo = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    style={{
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      backgroundColor: active ? '#0f172a' : '#e2e8f0',
      color: active ? 'white' : '#475569',
      transition: 'all 0.2s'
    }}
  >
    {label}
  </button>
);

const CardReporte = ({ titulo, monto, color, icon, sub }) => (
  <div style={{ ...cardStyle, borderLeft: `5px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <div>
        <h3 style={{ margin: 0, color: '#475569', fontSize: '16px' }}>{titulo}</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8' }}>{sub}</p>
      </div>
      <div style={{ color: color }}>{icon}</div>
    </div>
    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: '#0f172a' }}>
      ${monto.toFixed(2)}
    </div>
  </div>
);

const cardStyle = {
  backgroundColor: 'white',
  padding: '25px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
};

export default Reportes;