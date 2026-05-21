import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Phone, MapPin, Mail, Search, Calendar, Download, X, DollarSign, Briefcase, Plus, Edit, Trash2 } from 'lucide-react'; 
import jsPDF from 'jspdf'; 

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [citas, setCitas] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para el Modal Historial
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [citasDelCliente, setCitasDelCliente] = useState([]);

  // Estados para Crear/Editar Cliente
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState({ nombre: '', telefono: '', email: '' });
  const [clienteEnEdicion, setClienteEnEdicion] = useState(null); 

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [resClientes, resCitas] = await Promise.all([
        axios.get('/api/clientes'),
        axios.get('/api/citas')
      ]);
      setClientes(resClientes.data);
      setCitas(resCitas.data);
    } catch (error) {
      console.error("Error cargando datos", error);
    }
  };

  const verHistorialCitas = (cliente) => {
    const susCitas = citas.filter(c => c.clienteId === cliente.id);
    setClienteSeleccionado(cliente);
    setCitasDelCliente(susCitas);
    setModalAbierto(true);
  };

  // --- FUNCIONES CRUD CLIENTES ---
  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    try {
      if (clienteEnEdicion) {
        // EDITAR
        const res = await axios.put(`/api/clientes/${clienteEnEdicion}`, nuevoClienteData);
        // Actualizamos la lista localmente
        setClientes(clientes.map(c => c.id === clienteEnEdicion ? { ...res.data, _count: c._count } : c));
      } else {
        // CREAR
        const res = await axios.post('/api/clientes', nuevoClienteData);
        setClientes([{...res.data, _count: { citas: 0 }}, ...clientes]);
      }
      cerrarModalCliente();
    } catch (error) {
      console.error("Error guardando cliente", error);
      alert("Error al guardar cliente");
    }
  };

  const abrirModalEditar = (cliente) => {
    setNuevoClienteData({ nombre: cliente.nombre, telefono: cliente.telefono || '', email: cliente.email || '' });
    setClienteEnEdicion(cliente.id);
    setModalNuevoCliente(true);
  };

  const handleEliminarCliente = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.")) {
      try {
        await axios.delete(`/api/clientes/${id}`);
        setClientes(clientes.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error eliminando cliente", error);
        alert("No se pudo eliminar. Es posible que el cliente tenga citas registradas en el sistema.");
      }
    }
  };

  const cerrarModalCliente = () => {
    setModalNuevoCliente(false);
    setNuevoClienteData({ nombre: '', telefono: '', email: '' });
    setClienteEnEdicion(null);
  };

  // --- HELPER PARA EXTRAER DATOS ---
  const obtenerDetallesVenta = (cita) => {
    const venta = cita.ventas && cita.ventas.length > 0 ? cita.ventas[0] : null;
    return {
      empleado: venta?.empleado?.nombre || "Sin Asignar",
      precio: parseFloat(venta?.monto || 0).toFixed(2),
      tieneVenta: !!venta
    };
  };

  // --- FUNCIÓN GENERAR TICKET ---
  const descargarTicket = (cita) => {
    const { empleado, precio } = obtenerDetallesVenta(cita);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 240] 
    });

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    
    doc.text("MI NEGOCIO", 40, 10, { align: "center" });
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("Calle Falsa 123, Ciudad", 40, 15, { align: "center" });
    doc.text("Tel: 555-555-555", 40, 19, { align: "center" });
    doc.text("------------------------------------------", 40, 23, { align: "center" });

    doc.setFontSize(8);
    const fecha = new Date(cita.fecha).toLocaleDateString();
    const hora = new Date(cita.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    doc.text(`Fecha: ${fecha}, ${hora}`, 5, 30);
    doc.text(`Atendido por: ${empleado}`, 5, 35);

    doc.text("------------------------------------------", 40, 40, { align: "center" });

    doc.setFont("courier", "bold");
    doc.text("CLIENTE:", 5, 45);
    doc.setFont("courier", "normal");
    
    const nombreCliente = doc.splitTextToSize(clienteSeleccionado.nombre, 70);
    doc.text(nombreCliente, 5, 50);
    let yPos = 50 + (nombreCliente.length * 4);
    doc.text(`Tel:   ${clienteSeleccionado.telefono || 'S/N'}`, 5, yPos);
    yPos += 10;

    doc.text("------------------------------------------", 40, yPos, { align: "center" });
    yPos += 5;

    doc.text("Servicio:", 5, yPos);
    yPos += 5;
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    const servicioTexto = doc.splitTextToSize(cita.motivo || "Servicio General", 70);
    doc.text(servicioTexto, 5, yPos);
    yPos += (servicioTexto.length * 5) + 5;

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("------------------------------------------", 40, yPos, { align: "center" });
    yPos += 5;

    doc.setFontSize(10);
    doc.text("TOTAL:", 5, yPos + 5);
    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text(`$ ${precio}`, 75, yPos + 5, { align: "right" });
    
    yPos += 15;
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text("¡Gracias por su visita!", 40, yPos, { align: "center" });

    doc.save(`ticket_${cita.id}.pdf`);
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* CABECERA CON BOTÓN AGREGAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#1e293b' }}>👥 Clientes</h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '250px' }}
            />
          </div>
          
          <button 
            onClick={() => {
              setClienteEnEdicion(null);
              setNuevoClienteData({ nombre: '', telefono: '', email: '' });
              setModalNuevoCliente(true);
            }}
            style={{
              backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px',
              fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Plus size={18} /> Nuevo
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Contacto</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(cliente => {
              const countCitas = citas.filter(c => c.clienteId === cliente.id).length;
              return (
                <tr key={cliente.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ backgroundColor: '#e0f2fe', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={20} color="#0284c7"/>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{cliente.nombre}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>ID: {cliente.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Phone size={14} color="#64748b"/> <span>{cliente.telefono || 'Sin teléfono'}</span></div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Mail size={14} color="#64748b"/> <span>{cliente.email || 'Sin correo'}</span></div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => verHistorialCitas(cliente)} style={btnHistorialStyle}>
                        <Calendar size={15} color="#475569" /> Citas ({countCitas})
                      </button>
                      <button onClick={() => abrirModalEditar(cliente)} style={btnAccionStyle} title="Editar">
                        <Edit size={16} color="#3b82f6" />
                      </button>
                      <button onClick={() => handleEliminarCliente(cliente.id)} style={btnAccionStyle} title="Eliminar">
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- MODAL HISTORIAL DE CITAS --- */}
      {modalAbierto && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b' }}>Historial de Citas</h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Cliente: {clienteSeleccionado?.nombre}</span>
              </div>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#64748b" />
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
              {citasDelCliente.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  <Calendar size={40} style={{ marginBottom: '10px', opacity: 0.5 }}/>
                  <p>No hay citas registradas.</p>
                </div>
              ) : (
                citasDelCliente.map(cita => {
                  const { empleado, precio, tieneVenta } = obtenerDetallesVenta(cita);
                  
                  return (
                    <div key={cita.id} style={cardCitaStyle}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '14px' }}>{cita.motivo}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {new Date(cita.fecha).toLocaleDateString()} • {new Date(cita.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                             <Briefcase size={12}/> 
                             <span>Atendió: <b>{empleado}</b></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                             <DollarSign size={12}/> 
                             <span>Costo: <b>${precio}</b></span>
                          </div>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <span style={{ 
                            fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold',
                            backgroundColor: cita.estado === 'Completada' ? '#dcfce7' : '#f1f5f9',
                            color: cita.estado === 'Completada' ? '#166534' : '#64748b',
                          }}>
                            {cita.estado}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => descargarTicket(cita)} title="Imprimir Ticket" style={btnDownloadStyle}>
                        <Download size={18} /> 
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CREAR / EDITAR CLIENTE --- */}
      {modalNuevoCliente && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>
                {clienteEnEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={cerrarModalCliente} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#64748b" />
              </button>
            </div>
            <form onSubmit={handleGuardarCliente}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Nombre Completo</label>
                <input 
                  type="text" required
                  value={nuevoClienteData.nombre}
                  onChange={e => setNuevoClienteData({...nuevoClienteData, nombre: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Teléfono</label>
                <input 
                  type="text"
                  value={nuevoClienteData.telefono}
                  onChange={e => setNuevoClienteData({...nuevoClienteData, telefono: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Email</label>
                <input 
                  type="email"
                  value={nuevoClienteData.email}
                  onChange={e => setNuevoClienteData({...nuevoClienteData, email: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <button type="submit" style={{ ...btnDownloadStyle, width: '100%', padding: '12px' }}>
                {clienteEnEdicion ? 'Actualizar Cliente' : 'Guardar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Estilos
const thStyle = { padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '500px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out' };
const cardCitaStyle = { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '15px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', transition: 'transform 0.1s', cursor: 'default' };
const btnHistorialStyle = { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#334155', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s' };
const btnDownloadStyle = { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' };
const btnAccionStyle = { padding: '8px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s' };

export default Clientes;