import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, User, Calendar, CheckCircle, XCircle, Clock, 
  ThumbsUp, Filter 
} from 'lucide-react';

const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  // 1. NUEVO: Estado para guardar la lista de servicios
  const [servicios, setServicios] = useState([]);
  
  const [form, setForm] = useState({ clienteId: '', fecha: '', motivo: '' });
  
  const estadosPosibles = ["Pendiente", "Confirmada", "Completada", "Cancelada", "Rechazada"];
  
  const [filtroEstado, setFiltroEstado] = useState('Pendiente');
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      // 2. NUEVO: Traemos también los servicios
      const [resCitas, resClientes, resServicios] = await Promise.all([
        axios.get('/api/citas'),
        axios.get('/api/clientes'),
        axios.get('/api/servicios')
      ]);

      setCitas(resCitas.data);
      setClientes(resClientes.data);
      setServicios(resServicios.data); // Guardamos servicios
    } catch (error) {
      console.error("Error cargando datos");
    }
  };

  const guardarCita = async (e) => {
    e.preventDefault();
    if (!form.clienteId) return alert('Selecciona un cliente');
    if (!form.motivo) return alert('Selecciona un motivo/servicio');
    
    const fechaISO = new Date(form.fecha).toISOString();

    await axios.post('/api/citas', {
      ...form,
      fecha: fechaISO,
      estado: "Pendiente"
    });

    setForm({ clienteId: '', fecha: '', motivo: '' });
    cargarDatos();
    alert('Cita agendada (Pendiente)');
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const citasOriginales = [...citas];
    setCitas(citas.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));

    try {
      await axios.put(`/api/citas/${id}`, { estado: nuevoEstado });
    } catch (error) {
      alert("Error al actualizar");
      setCitas(citasOriginales);
    }
  };

  const citasFiltradas = citas.filter(cita => {
    const coincideEstado = cita.estado === filtroEstado;
    const mesCita = new Date(cita.fecha).toISOString().slice(0, 7); 
    const coincideMes = mesCita === filtroMes;
    return coincideEstado && coincideMes;
  });

  const configEstados = {
    'Pendiente':  { color: '#64748b', active: '#3b82f6', icon: <Clock size={16}/> },
    'Confirmada': { color: '#64748b', active: '#8b5cf6', icon: <ThumbsUp size={16}/> },
    'Completada': { color: '#64748b', active: '#22c55e', icon: <CheckCircle size={16}/> },
    'Cancelada':  { color: '#64748b', active: '#ef4444', icon: <XCircle size={16}/> },
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>📅 Control de Citas</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', padding: '8px 15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <Filter size={18} color="#64748b"/>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>Filtrar Mes:</span>
          <input 
            type="month" 
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: '5px', padding: '5px', color: '#334155' }}
          />
        </div>
      </div>

      {/* --- FORMULARIO NUEVA CITA --- */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>Nueva Cita</h3>
        <form onSubmit={guardarCita} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          
          {/* SELECTOR CLIENTE */}
          <select 
            value={form.clienteId} onChange={e => setForm({...form, clienteId: e.target.value})}
            style={inputStyle} required
          >
            <option value="">-- Cliente --</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {/* SELECTOR FECHA */}
          <input 
            type="datetime-local" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
            style={inputStyle} required 
          />

          {/* 3. NUEVO: SELECTOR MOTIVO (SERVICIOS) */}
          <select 
            value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})}
            style={{...inputStyle, flex: 2}} required 
          >
            <option value="">-- Selecciona Motivo / Servicio --</option>
            {servicios.map(s => (
              <option key={s.id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>

          <button type="submit" style={btnStyle}><Plus size={18}/> Agendar</button>
        </form>
      </div>

      {/* --- PESTAÑAS Y LISTADO (IGUAL QUE ANTES) --- */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        {Object.keys(configEstados).map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
              backgroundColor: filtroEstado === estado ? configEstados[estado].active : '#f1f5f9',
              color: filtroEstado === estado ? 'white' : '#64748b',
              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            {configEstados[estado].icon} {estado}
            <span style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', marginLeft: '5px' }}>
              {citas.filter(c => c.estado === estado && new Date(c.fecha).toISOString().slice(0, 7) === filtroMes).length}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        {citasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'black', padding: '40px', border: '2px dashed #cbd5e1', borderRadius: '10px' }}>
            <p>No hay citas <b>{filtroEstado}s</b> en <b>{filtroMes}</b>.</p>
          </div>
        ) : (
          citasFiltradas.map(cita => (
            <div key={cita.id} style={{ 
              borderLeft: `5px solid ${configEstados[cita.estado]?.active || '#ccc'}`,
              backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#475569"/> {cita.cliente.nombre}
                </h4>
                <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '14px' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={14}/> {new Date(cita.fecha).toLocaleDateString()}</span>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={14}/> {new Date(cita.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                {/* Aquí mostramos el motivo, que ahora será el nombre del servicio */}
                <p style={{ margin: '5px 0 0 0', fontWeight: '500', color: '#0f172a' }}>🛠 {cita.motivo}</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mover a:</span>
                <select 
                  value={cita.estado} 
                  onChange={(e) => cambiarEstado(cita.id, e.target.value)}
                  style={{ display: 'block', marginTop: '5px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}
                >
                  {estadosPosibles.map(est => (<option key={est} value={est}>{est}</option>))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' };
const btnStyle = { padding: '12px 24px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 'bold' };

export default Citas;