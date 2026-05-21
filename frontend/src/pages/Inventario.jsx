import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Trash2, Edit2, AlertTriangle, DollarSign, Search } from 'lucide-react';

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({ 
    nombre: '', marca: '', stock: '', precioVenta: '', stockMinimo: 5 
  });
  const [editandoId, setEditandoId] = useState(null); // Para saber si estamos editando uno existente

  useEffect(() => { cargarProductos(); }, []);

  const cargarProductos = async () => {
    try {
      const res = await axios.get('/api/productos');
      setProductos(res.data);
    } catch (error) {
      console.error("Error cargando inventario");
    }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        // Modo Edición
        await axios.put(`/api/productos/${editandoId}`, form);
        alert('Producto actualizado');
      } else {
        // Modo Creación
        await axios.post('/api/productos', form);
        alert('Producto creado');
      }
      
      limpiarForm();
      cargarProductos();
    } catch (error) {
      alert('Error al guardar');
    }
  };

  const eliminarProducto = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este producto?')) return;
    try {
      await axios.delete(`/api/productos/${id}`);
      cargarProductos();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const cargarParaEditar = (prod) => {
    setForm(prod);
    setEditandoId(prod.id);
  };

  const limpiarForm = () => {
    setForm({ nombre: '', marca: '', stock: '', precioVenta: '', stockMinimo: 5 });
    setEditandoId(null);
  };

  // --- CÁLCULOS VISUALES ---
  // Valor total del inventario (Stock * Precio)
  const valorTotal = productos.reduce((acc, prod) => acc + (prod.stock * prod.precioVenta), 0);

  // Filtro de búsqueda
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.marca.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Encabezado con KPI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📦 Inventario</h1>
        <div style={{ backgroundColor: '#ecfccb', padding: '10px 20px', borderRadius: '10px', color: '#3f6212', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={20}/> 
          Valor Total: ${valorTotal.toLocaleString()}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
        
        {/* --- COLUMNA 1: FORMULARIO --- */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#334155' }}>
            {editandoId ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
          </h3>
          <form onSubmit={guardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              placeholder="Nombre del Producto" value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})} style={inputStyle} required 
            />
            <input 
              placeholder="Marca / Proveedor" value={form.marca} 
              onChange={e => setForm({...form, marca: e.target.value})} style={inputStyle} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Stock Actual</label>
                <input 
                  type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} 
                  style={inputStyle} required 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Precio Venta</label>
                <input 
                  type="number" step="0.01" value={form.precioVenta} onChange={e => setForm({...form, precioVenta: e.target.value})} 
                  style={inputStyle} required 
                />
              </div>
            </div>
             <div>
                <label style={labelStyle}>Alerta de Stock Mínimo</label>
                <input 
                  type="number" value={form.stockMinimo} onChange={e => setForm({...form, stockMinimo: e.target.value})} 
                  style={inputStyle} 
                />
                <small style={{ color: '#94a3b8' }}>Avisar cuando quede menos de...</small>
              </div>

            <button type="submit" style={btnStyle}>
              {editandoId ? 'Guardar Cambios' : 'Agregar al Inventario'}
            </button>
            {editandoId && (
              <button type="button" onClick={limpiarForm} style={{...btnStyle, backgroundColor: '#94a3b8'}}>
                Cancelar Edición
              </button>
            )}
          </form>
        </div>

        {/* --- COLUMNA 2: LISTA DE PRODUCTOS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Barra de Búsqueda */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
            <input 
              placeholder="Buscar producto..." 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '35px', width: '100%' }}
            />
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={thStyle}>Producto</th>
                  <th style={thStyle}>Precio</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(prod => {
                  // Lógica del semáforo
                  const stockBajo = prod.stock <= prod.stockMinimo;
                  const stockCritico = prod.stock === 0;
                  
                  return (
                    <tr key={prod.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 'bold', color: '#334155' }}>{prod.nombre}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{prod.marca}</div>
                      </td>
                      <td style={tdStyle}>${prod.precioVenta}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          padding: '5px 10px', borderRadius: '15px', fontWeight: 'bold', fontSize: '13px',
                          backgroundColor: stockCritico ? '#fee2e2' : stockBajo ? '#fef3c7' : '#dcfce7',
                          color: stockCritico ? '#991b1b' : stockBajo ? '#92400e' : '#166534',
                          display: 'inline-flex', alignItems: 'center', gap: '5px'
                        }}>
                          {stockCritico || stockBajo ? <AlertTriangle size={14}/> : <Package size={14}/>}
                          {prod.stock} u.
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => cargarParaEditar(prod)} style={iconBtnStyle} title="Editar">
                            <Edit2 size={16} color="#3b82f6"/>
                          </button>
                          <button onClick={() => eliminarProducto(prod.id)} style={iconBtnStyle} title="Eliminar">
                            <Trash2 size={16} color="#ef4444"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {productosFiltrados.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                No se encontraron productos.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Estilos
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' };
const btnStyle = { width: '100%', padding: '12px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };
const thStyle = { padding: '15px', textAlign: 'left', color: '#64748b', fontSize: '13px', borderBottom: '2px solid #e2e8f0' };
const tdStyle = { padding: '15px', verticalAlign: 'middle' };
const iconBtnStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' };

export default Inventario;