import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Edit2, Trash2, Tag, DollarSign } from 'lucide-react';

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [form, setForm] = useState({ nombre: '', precio: '', descripcion: '' });
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => { cargarServicios(); }, []);

  const cargarServicios = async () => {
    try {
      const res = await axios.get('/api/servicios');
      setServicios(res.data);
    } catch (error) {
      console.error("Error cargando servicios");
    }
  };

  const guardarServicio = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await axios.put(`/api/servicios/${editandoId}`, form);
      } else {
        await axios.post('/api/servicios', form);
      }
      limpiarForm();
      cargarServicios();
    } catch (error) {
      alert('Error al guardar');
    }
  };

  const eliminarServicio = async (id) => {
    if (!confirm('¿Eliminar servicio?')) return;
    try {
      await axios.delete(`/api/servicios/${id}`);
      cargarServicios();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const cargarParaEditar = (item) => {
    setForm(item);
    setEditandoId(item.id);
  };

  const limpiarForm = () => {
    setForm({ nombre: '', precio: '', descripcion: '' });
    setEditandoId(null);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🛠️ Catálogo de Servicios</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
        
        {/* FORMULARIO */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#334155' }}>
            {editandoId ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h3>
          <form onSubmit={guardarServicio} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              placeholder="Nombre del Servicio (Ej: Corte)" 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})} 
              style={inputStyle} required 
            />
            <textarea 
              placeholder="Descripción breve (Opcional)" 
              value={form.descripcion} 
              onChange={e => setForm({...form, descripcion: e.target.value})} 
              style={{ ...inputStyle, minHeight: '80px', fontFamily: 'sans-serif' }} 
            />
            
            <button type="submit" style={btnStyle}>
              {editandoId ? 'Actualizar' : 'Guardar Servicio'}
            </button>
            {editandoId && (
              <button type="button" onClick={limpiarForm} style={{...btnStyle, backgroundColor: '#94a3b8'}}>Cancelar</button>
            )}
          </form>
        </div>

        {/* LISTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
           {servicios.length === 0 ? (
             <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No hay servicios registrados.</div>
           ) : (
             servicios.map(serv => (
               <div key={serv.id} style={{ 
                 backgroundColor: 'white', padding: '20px', borderRadius: '10px', 
                 display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                 boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6'
               }}>
                 <div>
                   <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1em', color: '#1e293b' }}>{serv.nombre}</h4>
                   <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                     {serv.descripcion || 'Sin descripción'}
                   </p>
                 </div>
                 <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                   <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                     ${serv.precio}
                   </span>
                   <div style={{ display: 'flex', gap: '8px' }}>
                     <button onClick={() => cargarParaEditar(serv)} style={iconBtnStyle}><Edit2 size={16} color="#3b82f6"/></button>
                     <button onClick={() => eliminarServicio(serv.id)} style={iconBtnStyle}><Trash2 size={16} color="#ef4444"/></button>
                   </div>
                 </div>
               </div>
             ))
           )}
        </div>

      </div>
    </div>
  );
};

// Estilos reutilizados
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' };
const btnStyle = { width: '100%', padding: '12px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' };
const iconBtnStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' };

export default Servicios;