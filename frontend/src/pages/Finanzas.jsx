import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Settings, Edit, X, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';

const Finanzas = ({ rolUsuario = '' }) => {
  const [tab, setTab] = useState('cobro'); 
  const esAdmin = rolUsuario === 'ADMIN';

  // --- ESTADOS DE DATOS ---
  const [empleados, setEmpleados] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [citasPendientes, setCitasPendientes] = useState([]);
  const [clientes, setClientes] = useState([]); 
  
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [comisionesDB, setComisionesDB] = useState([]); 

  // Filtros y Derivados
  const [ventasFiltradas, setVentasFiltradas] = useState([]);
  const [resumenEmpleados, setResumenEmpleados] = useState({});
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Edición
  const [editingGasto, setEditingGasto] = useState(null); 
  const [editingVenta, setEditingVenta] = useState(null); 
  const [editingEmpleado, setEditingEmpleado] = useState(null);

  // Formularios
  const [formCobro, setFormCobro] = useState({
    citaId: '', 
    empleadoId: '', 
    servicioId: '', 
    clienteId: '', 
    monto: '', 
    fecha: new Date().toISOString().slice(0, 16), 
    metodoPago: 'Efectivo', 
    requiereFactura: false
  });

  const [nuevoEmpleado, setNuevoEmpleado] = useState('');

  // --- EFFECTS ---
  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    aplicarFiltrosYCalculos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, ventas, comisionesDB]); 

  // --- CARGA DE DATOS ---
  const cargarDatos = async () => {
    try {
      const [resEmp, resServ, resCitas, resVentas, resComisiones, resGastos, resClientes] = await Promise.all([
        axios.get('/api/empleados'),
        axios.get('/api/servicios'),
        axios.get('/api/citas/pendientes'),
        axios.get('/api/ventas'),
        axios.get('/api/comisiones'),
        axios.get('/api/gastos'),
        axios.get('/api/clientes') 
      ]);

      setEmpleados(resEmp.data);
      setServicios(resServ.data);
      setCitasPendientes(resCitas.data);
      setVentas(resVentas.data);
      setComisionesDB(resComisiones.data);
      setGastos(resGastos.data);
      setClientes(resClientes.data); 
    } catch (error) {
      console.error("Error cargando datos", error);
    }
  };


  const imprimirTicket = (datosVenta) => {
    const doc = new jsPDF('p', 'mm', [80, 150]);
    doc.setFont('helvetica');
    
    // --- CABECERA ---
    doc.setFontSize(10);
    doc.text('MI NEGOCIO', 40, 10, { align: 'center' }); 
    doc.setFontSize(8);
    doc.text('Calle Falsa 123, Ciudad', 40, 14, { align: 'center' });
    doc.text('Tel: 555-555-555', 40, 18, { align: 'center' });
    doc.text('--------------------------------', 40, 22, { align: 'center' });

    // --- DETALLES DE VENTA ---
    doc.setFontSize(9);
    doc.text(`Fecha: ${new Date(formCobro.fecha).toLocaleString()}`, 5, 30); 
    doc.text(`Atendido por: ${datosVenta.empleado}`, 5, 35);
    
    if(datosVenta.cliente) {
        doc.text(`Cliente: ${datosVenta.cliente}`, 5, 40);
    }
    
    doc.text('--------------------------------', 40, 45, { align: 'center' });

    // --- PRODUCTO / SERVICIO ---
    doc.text('Servicio:', 5, 46);
    doc.setFont('helvetica', 'bold');
    doc.text(datosVenta.servicio, 5, 56);
    doc.setFont('helvetica', 'normal');

    // --- TOTALES ---
    doc.text('--------------------------------', 40, 65, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('TOTAL A PAGAR:', 5, 73);
    doc.setFont('helvetica', 'bold');
    doc.text(`$ ${parseFloat(datosVenta.monto).toFixed(2)}`, 75, 73, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Método: ${datosVenta.metodoPago}`, 5, 80);

    // --- PIE DE PÁGINA ---
    doc.text('--------------------------------', 40, 90, { align: 'center' });
    doc.text('¡Gracias por su visita!', 40, 95, { align: 'center' });
    
    doc.save(`Ticket_${Date.now()}.pdf`);
  };

  const aplicarFiltrosYCalculos = () => {
    if (ventas.length === 0) return;

    let filtradas = [...ventas]; 
    
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0,0,0,0);
      
      const fin = new Date(fechaFin);
      fin.setHours(23,59,59,999);

      filtradas = ventas.filter(v => {
        const fechaVenta = new Date(v.fecha).getTime();
        return fechaVenta >= inicio.getTime() && fechaVenta <= fin.getTime();
      });
    }
    setVentasFiltradas(filtradas);
    
    if (esAdmin) {
        calcularNomina(filtradas);
    }
  };

  const calcularNomina = (listaVentas) => {
    const resumen = {};
    listaVentas.forEach(venta => {
      if (!venta.empleadoId || !venta.servicioId) return;
      
      const empId = venta.empleadoId;
      const servId = venta.servicioId;
      const monto = parseFloat(venta.monto);
      
      const configComision = comisionesDB.find(c => c.empleadoId === empId && c.servicioId === servId);
      const porcentaje = configComision ? configComision.porcentaje : 0;
      const comision = monto * porcentaje;
      
      const nombreEmpleado = venta.empleado?.nombre || 'Empleado Eliminado';

      if (!resumen[nombreEmpleado]) {
        resumen[nombreEmpleado] = { totalVendido: 0, totalComision: 0, trabajos: 0 };
      }
      resumen[nombreEmpleado].totalVendido += monto;
      resumen[nombreEmpleado].totalComision += comision;
      resumen[nombreEmpleado].trabajos += 1;
    });
    setResumenEmpleados(resumen);
  };

  // --- HANDLERS ---

  const registrarCobro = async (e) => {
    e.preventDefault();
    if(!formCobro.empleadoId || !formCobro.servicioId || !formCobro.monto) return alert("Llena los campos obligatorios");

    let nombreClienteTicket = 'Venta Mostrador';
    
    if (formCobro.citaId) {
        const citaSelect = citasPendientes.find(c => c.id == formCobro.citaId);
        nombreClienteTicket = citaSelect?.cliente?.nombre || 'Venta Cita';
    } else if (formCobro.clienteId) {
        const clienteSelect = clientes.find(c => c.id == formCobro.clienteId);
        nombreClienteTicket = clienteSelect?.nombre || 'Venta Mostrador';
    }
    
    try {
      const payload = {
        empleadoId: Number(formCobro.empleadoId),
        servicioId: Number(formCobro.servicioId),
        monto: parseFloat(formCobro.monto),
        citaId: formCobro.citaId ? Number(formCobro.citaId) : null,
        metodoPago: formCobro.metodoPago,
        requiereFactura: formCobro.requiereFactura,
        fecha: formCobro.fecha ? new Date(formCobro.fecha) : new Date(), 
      };

      await axios.post('/api/ventas', payload);
      
      if (formCobro.citaId) {
        await axios.put(`/api/citas/${formCobro.citaId}`, { estado: 'Completada' });
      }

      const nombreEmpleado = empleados.find(e => e.id == formCobro.empleadoId)?.nombre || 'Empleado';
      const nombreServicio = servicios.find(s => s.id == formCobro.servicioId)?.nombre || 'Servicio General';

      imprimirTicket({
          empleado: nombreEmpleado,
          servicio: nombreServicio,
          cliente: nombreClienteTicket,
          monto: formCobro.monto,
          metodoPago: formCobro.metodoPago
      });

      alert('✅ Cobro registrado y Ticket generado.');
      setFormCobro({ 
          citaId: '', 
          empleadoId: '', 
          servicioId: '', 
          clienteId: '', 
          monto: '', 
          metodoPago: 'Efectivo', 
          requiereFactura: false,
          fecha: new Date().toISOString().slice(0, 16) 
      });
      cargarDatos();
    } catch (error) {
        console.error(error);
        alert('Error al registrar. Revisa la consola.');
    }
  };

  const registrarGasto = async (e) => {
    e.preventDefault();
    const motivo = e.target.motivo.value;
    const monto = e.target.monto.value;
    const fecha = e.target.fecha.value;

    if(!motivo || !monto) return alert("Faltan datos");

    try {
      await axios.post('/api/gastos', { 
          motivo, 
          monto: parseFloat(monto), 
          fecha 
      });
      alert('💸 Gasto registrado');
      e.target.reset();
      cargarDatos();
    } catch (error) { alert('Error al registrar gasto'); }
  };

  const agregarEmpleado = async (e) => {
    e.preventDefault();
    if(!nuevoEmpleado.trim()) return;
    try {
        await axios.post('/api/empleados', { nombre: nuevoEmpleado });
        setNuevoEmpleado('');
        cargarDatos();
        alert('Empleado agregado');
    } catch(err) { alert("Error agregando empleado"); }
  };

  const handleEditEmpleado = async () => {
    if(!editingEmpleado || !editingEmpleado.nombre.trim()) return;
    try {
        await axios.put(`/api/empleados/${editingEmpleado.id}`, { nombre: editingEmpleado.nombre });
        alert('Empleado actualizado');
        setEditingEmpleado(null);
        cargarDatos();
    } catch (error) {
        alert('Error al actualizar empleado');
    }
  };

  const handleDeleteEmpleado = async (id) => {
    if(!window.confirm("¿Seguro que quieres eliminar a este empleado?")) return;
    try {
        await axios.delete(`/api/empleados/${id}`);
        alert('Empleado eliminado');
        cargarDatos();
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            alert(error.response.data.error);
        } else {
            alert('Error al eliminar. Puede que tenga ventas registradas.');
        }
    }
  };

  const actualizarComision = async (empleadoId, servicioId, nuevoValor) => {
    try {
      const porcentajeDecimal = parseFloat(nuevoValor) / 100;
      await axios.post('/api/comisiones', {
        empleadoId, servicioId, porcentaje: porcentajeDecimal
      });
      const res = await axios.get('/api/comisiones');
      setComisionesDB(res.data);
    } catch (error) {
      console.error("Error guardando comisión", error);
      alert("Error al guardar");
    }
  };

  const getPorcentajeActual = (empId, servId) => {
    const com = comisionesDB.find(c => c.empleadoId === empId && c.servicioId === servId);
    return com ? Math.round(com.porcentaje * 100) : 0;
  };

  const guardarEdicionGasto = async () => {
    try {
      await axios.put(`/api/gastos/${editingGasto.id}`, {
          ...editingGasto,
          monto: parseFloat(editingGasto.monto)
      });
      alert('Gasto actualizado');
      setEditingGasto(null); 
      cargarDatos(); 
    } catch (error) { alert('Error al actualizar gasto'); }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const guardarEdicionVenta = async () => {
    try {
      await axios.put(`/api/ventas/${editingVenta.id}`, {
          ...editingVenta,
          empleadoId: Number(editingVenta.empleadoId),
          servicioId: Number(editingVenta.servicioId),
          clienteId: editingVenta.clienteId ? Number(editingVenta.clienteId) : null,
          monto: parseFloat(editingVenta.monto),
          fecha: new Date(editingVenta.fecha) 
      });
      alert('Venta actualizada correctamente');
      setEditingVenta(null); 
      cargarDatos(); 
    } catch (error) { alert('Error al actualizar venta'); }
  };

  const handleDeleteVenta = async (id) => {
      if(!window.confirm("¿Estás seguro de eliminar este registro de venta? Esto afectará los reportes financieros.")) return;
      try {
          await axios.delete(`/api/ventas/${id}`);
          alert('Venta eliminada correctamente');
          cargarDatos();
      } catch (error) {
          console.error(error);
          alert('Error al eliminar la venta.');
      }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
      <h1>💰 Finanzas</h1>

      {/* TABS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('cobro')} style={tab === 'cobro' ? activeTab : inactiveTab}>Registrar Cobro</button>
        <button onClick={() => setTab('salidas')} style={tab === 'salidas' ? activeTab : inactiveTab}>💸 Salidas</button>
        
        {esAdmin && (
            <>
                <button onClick={() => setTab('reportes')} style={tab === 'reportes' ? activeTab : inactiveTab}>Reportes y Nómina</button>
                <button onClick={() => setTab('config')} style={tab === 'config' ? activeTab : inactiveTab}>⚙️ Comisiones</button>
                <button onClick={() => setTab('empleados')} style={tab === 'empleados' ? activeTab : inactiveTab}>Equipo</button>
            </>
        )}
      </div>

      {/* --- TAB 1: COBRO --- */}
      {tab === 'cobro' && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>🧾 Nuevo Ingreso</h2>
          <form onSubmit={registrarCobro} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <label style={labelStyle}>1. Cliente</label>
                    <select 
                        style={inputStyle} 
                        value={formCobro.clienteId} 
                        onChange={e => setFormCobro({...formCobro, clienteId: e.target.value})}
                        disabled={!!formCobro.citaId} 
                    >
                    <option value="">-- Cliente Mostrador --</option>
                    {clientes.map(cli => (<option key={cli.id} value={cli.id}>{cli.nombre}</option>))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <label style={labelStyle}>2. Empleado</label>
                    <select style={inputStyle} required value={formCobro.empleadoId} onChange={e => setFormCobro({...formCobro, empleadoId: e.target.value})}>
                    <option value="">-- Seleccionar --</option>
                    {empleados.map(emp => (<option key={emp.id} value={emp.id}>{emp.nombre}</option>))}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>3. Servicio</label>
                    <select style={inputStyle} required value={formCobro.servicioId} onChange={e => setFormCobro({...formCobro, servicioId: e.target.value})}>
                    <option value="">-- Seleccionar --</option>
                    {servicios.map(serv => (<option key={serv.id} value={serv.id}>{serv.nombre}</option>))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
               <div>
                   <label style={labelStyle}>4. Monto</label>
                   <input type="number" step="0.01" style={inputStyle} required value={formCobro.monto} onChange={e => setFormCobro({...formCobro, monto: e.target.value})} placeholder="$ 0.00" />
               </div>
               <div>
                   <label style={labelStyle}>5. Método Pago</label>
                   <select style={inputStyle} value={formCobro.metodoPago} onChange={e => setFormCobro({...formCobro, metodoPago: e.target.value})}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                   </select>
               </div>
               <div>
                   <label style={labelStyle}>6. Fecha y Hora del Cobro</label>
                   <input 
                       type="datetime-local" 
                       style={inputStyle} 
                       value={formCobro.fecha} 
                       onChange={e => setFormCobro({...formCobro, fecha: e.target.value})} 
                       required
                   />
               </div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor:'pointer' }}>
                    <input type="checkbox" checked={formCobro.requiereFactura} onChange={e => setFormCobro({...formCobro, requiereFactura: e.target.checked})} />
                    Solicita Factura
                </label>
            </div>
            <button type="submit" style={btnPrimary}>Registrar Venta</button>
          </form>
        </div>
      )}

      {/* --- TAB 2: SALIDAS --- */}
      {tab === 'salidas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={cardStyle}>
            <h3>Registrar Gasto</h3>
            <form onSubmit={registrarGasto} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <div>
                  <label style={labelStyle}>Motivo</label>
                  <input name="motivo" placeholder="Ej. Luz, Agua, Insumos" required style={inputStyle} />
              </div>
              <div>
                  <label style={labelStyle}>Monto</label>
                  <input name="monto" type="number" step="0.01" placeholder="$ 0.00" required style={inputStyle} />
              </div>
              <div>
                  <label style={labelStyle}>Fecha</label>
                  <input name="fecha" type="date" required defaultValue={new Date().toISOString().split('T')[0]} style={inputStyle} />
              </div>
              <button type="submit" style={{...btnPrimary, backgroundColor: '#ef4444'}}>Guardar Salida</button>
            </form>
          </div>

          <div style={cardStyle}>
            <h3>Últimos Gastos</h3>
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto' }}>
              {gastos.length === 0 ? <p style={{color: '#888'}}>No hay gastos registrados.</p> : gastos.slice(0, 15).map(g => (
                <li key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <div>
                    <strong>{g.motivo}</strong>
                    <div style={{ fontSize: '12px', color: '#888' }}>{new Date(g.fecha).toLocaleDateString()}</div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
                    <div style={{ color: '#ef4444', fontWeight: 'bold' }}>- ${parseFloat(g.monto).toFixed(2)}</div>
                    <button onClick={() => setEditingGasto(g)} style={btnIcon} title="Editar">
                        <Edit size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* --- TAB 3: REPORTES --- */}
      {esAdmin && tab === 'reportes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap:'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Calendar size={20} color="#64748b" />
            <span style={{fontWeight: 'bold', color: '#334155'}}>Desde:</span>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
            <span style={{fontWeight: 'bold', color: '#334155'}}>Hasta:</span>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
            <button onClick={() => {setFechaInicio(''); setFechaFin('')}} style={{padding:'10px 15px', cursor:'pointer', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#475569', transition: '0.2s'}}>Limpiar</button>
          </div>

          <div style={{...cardStyle, borderLeft: '5px solid #3b82f6', padding: '0', overflow: 'hidden'}}>
            <h2 style={{ padding: '20px 20px 10px 20px', margin: 0, color: '#1e293b' }}>📊 Resumen de Nómina</h2>
            <div style={{ padding: '0 20px 20px 20px' }}>
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{padding: '12px 15px', fontWeight: '600', color: '#475569'}}>Empleado</th>
                      <th style={{padding: '12px 15px', fontWeight: '600', color: '#475569', textAlign: 'center'}}>Trabajos</th>
                      <th style={{padding: '12px 15px', fontWeight: '600', color: '#475569', textAlign: 'right'}}>Venta Total</th>
                      <th style={{padding: '12px 15px', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', textAlign: 'right'}}>A Pagar (Comisión)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(resumenEmpleados).map(emp => (
                      <tr key={emp} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#fff'}>
                        <td style={{padding: '12px 15px', color: '#334155', fontWeight: '500'}}>{emp}</td>
                        <td style={{padding: '12px 15px', color: '#64748b', textAlign: 'center'}}>{resumenEmpleados[emp].trabajos}</td>
                        <td style={{padding: '12px 15px', color: '#334155', textAlign: 'right'}}>${resumenEmpleados[emp].totalVendido.toFixed(2)}</td>
                        <td style={{padding: '12px 15px', fontWeight: 'bold', color: '#15803d', backgroundColor: '#f0fdf4', textAlign: 'right'}}>
                          ${resumenEmpleados[emp].totalComision.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {Object.keys(resumenEmpleados).length === 0 && (
                      <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>No hay datos en este rango de fechas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div style={{...cardStyle, padding: '0', overflow: 'hidden'}}>
            <h3 style={{ padding: '20px 20px 10px 20px', margin: 0, color: '#1e293b' }}>Historial Detallado</h3>
            
            <div style={{ overflowX: 'auto', maxHeight: '450px', overflowY: 'auto', padding: '0 20px 20px 20px' }}>
              <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', fontSize: '14px', minWidth: '700px', borderCollapse: 'collapse' }}>
                  
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f8fafc', outline: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#475569'}}>Fecha</th>
                      {/* --- NUEVO: COLUMNA CLIENTE --- */}
                      <th style={{padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#475569'}}>Cliente</th>
                      <th style={{padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#475569'}}>Empleado</th>
                      <th style={{padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#475569'}}>Servicio</th>
                      <th style={{padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#475569'}}>Factura</th>
                      <th style={{padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#475569'}}>Monto</th>
                      <th style={{padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#475569'}}>Acción</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {ventasFiltradas.map(v => {
                      // --- LÓGICA PARA BUSCAR EL NOMBRE DEL CLIENTE ---
                      const nombreCliente = v.cita?.cliente?.nombre 
                          || clientes.find(c => c.id === v.clienteId)?.nombre 
                          || 'Mostrador / N/A';

                      return (
                      <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#fff'}>
                        <td style={{padding: '10px 15px', color: '#64748b'}}>{new Date(v.fecha).toLocaleDateString()} {new Date(v.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        {/* --- NUEVO: CELDA CLIENTE --- */}
                        <td style={{padding: '10px 15px', color: '#334155', fontWeight: '500'}}>{nombreCliente}</td>
                        <td style={{padding: '10px 15px', color: '#334155', fontWeight: '500'}}>{v.empleado?.nombre || 'N/A'}</td>
                        <td style={{padding: '10px 15px', color: '#64748b'}}>{v.servicio?.nombre || 'N/A'}</td>
                        <td style={{padding: '10px 15px', textAlign: 'center'}}>
                          {v.requiereFactura 
                            ? <span style={{backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'}}>Sí</span> 
                            : <span style={{color: '#cbd5e1'}}>-</span>}
                        </td>
                        <td style={{padding: '10px 15px', textAlign: 'right', fontWeight: '600', color: '#0f172a'}}>${parseFloat(v.monto).toFixed(2)}</td>
                        <td style={{padding: '10px 15px', textAlign: 'center'}}>
                          <div style={{display:'flex', gap:'5px', justifyContent: 'center'}}>
                            <button onClick={() => setEditingVenta(v)} style={btnIcon} title="Editar Venta">
                                <Edit size={16} color="#3b82f6" />
                            </button>
                            <button onClick={() => handleDeleteVenta(v.id)} style={{...btnIcon, color:'#ef4444', backgroundColor:'#fee2e2'}} title="Eliminar Venta">
                                <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                    {ventasFiltradas.length === 0 && (
                      <tr><td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>No hay ventas registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: CONFIG --- */}
      {esAdmin && tab === 'config' && (
        <div style={cardStyle}>
          <h2 style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <Settings /> Matriz de Comisiones (%)
          </h2>
          <p style={{color: '#64748b', marginBottom:'20px'}}>
              Define qué porcentaje se lleva cada empleado por cada servicio. Ej: Escribe <strong>40</strong> para el 40%.
          </p>
          <div style={{overflowX: 'auto'}}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{...thStyle, backgroundColor: '#0f172a', color: 'white'}}>Servicio \ Empleado</th>
                  {empleados.map(emp => (
                    <th key={emp.id} style={{...thStyle, backgroundColor: '#f1f5f9', textAlign: 'center'}}>{emp.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {servicios.map(serv => (
                  <tr key={serv.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={{...tdStyle, fontWeight: 'bold'}}>{serv.nombre}</td>
                    {empleados.map(emp => (
                      <td key={emp.id} style={{textAlign: 'center', padding: '8px'}}>
                        <input 
                          type="number"
                          defaultValue={getPorcentajeActual(emp.id, serv.id)}
                          onBlur={(e) => actualizarComision(emp.id, serv.id, e.target.value)}
                          style={{
                            width: '60px', 
                            textAlign: 'center', 
                            padding: '8px', 
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontWeight: 'bold',
                            color: '#2563eb'
                          }}
                        />
                        <span style={{fontSize: '10px', color: '#94a3b8', marginLeft:'2px'}}>%</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: EMPLEADOS --- */}
      {esAdmin && tab === 'empleados' && (
        <div style={cardStyle}>
          <h3>Gestión Equipo</h3>
          <form onSubmit={agregarEmpleado} style={{display:'flex', gap: '10px'}}>
             <input placeholder="Nombre completo" value={nuevoEmpleado} onChange={e => setNuevoEmpleado(e.target.value)} style={inputStyle} />
             <button type="submit" style={{...btnPrimary, width: 'auto'}}>Agregar</button>
          </form>
          <ul style={{marginTop: '20px', listStyle: 'none', padding: 0}}>
            {empleados.map(e => (
                <li key={e.id} style={{padding:'15px', borderBottom:'1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontWeight: 'bold', color: '#334155'}}>{e.nombre}</span>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={() => setEditingEmpleado(e)} style={btnIcon} title="Editar">
                            <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteEmpleado(e.id)} style={{...btnIcon, color: '#ef4444'}} title="Eliminar">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- MODALES --- */}
      
      {/* Editar Gasto */}
      {editingGasto && (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3>Editar Gasto</h3>
                    <button onClick={() => setEditingGasto(null)} style={btnIcon}><X size={20}/></button>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    <label style={labelStyle}>Motivo:</label>
                    <input value={editingGasto.motivo} onChange={(e) => setEditingGasto({...editingGasto, motivo: e.target.value})} style={inputStyle} />
                    <label style={labelStyle}>Monto:</label>
                    <input type="number" value={editingGasto.monto} onChange={(e) => setEditingGasto({...editingGasto, monto: e.target.value})} style={inputStyle} />
                    <label style={labelStyle}>Fecha:</label>
                    <input type="date" value={editingGasto.fecha ? editingGasto.fecha.split('T')[0] : ''} onChange={(e) => setEditingGasto({...editingGasto, fecha: e.target.value})} style={inputStyle} />
                    <button onClick={guardarEdicionGasto} style={btnPrimary}>Guardar Cambios</button>
                </div>
            </div>
        </div>
      )}

      {/* --- ACTUALIZADO: EDITAR VENTA (Añadido Fecha y Cliente) --- */}
      {editingVenta && (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3>Editar Venta</h3>
                    <button onClick={() => setEditingVenta(null)} style={btnIcon}><X size={20}/></button>
                </div>
                {/* Scroll interno por si el modal se hace muy grande */}
                <div style={{display:'flex', flexDirection:'column', gap:'15px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px'}}>
                    
                    {/* NUEVO: FECHA DE LA VENTA */}
                    <div>
                        <label style={labelStyle}>Fecha y Hora:</label>
                        <input 
                            type="datetime-local" 
                            style={inputStyle} 
                            value={formatDateForInput(editingVenta.fecha)} 
                            onChange={(e) => setEditingVenta({...editingVenta, fecha: e.target.value})} 
                        />
                    </div>

                    {/* NUEVO: CLIENTE */}
                    <div>
                        <label style={labelStyle}>Cliente:</label>
                        <select 
                            style={inputStyle} 
                            value={editingVenta.clienteId || (editingVenta.cita ? editingVenta.cita.clienteId : '') || ''} 
                            onChange={(e) => setEditingVenta({...editingVenta, clienteId: e.target.value})}
                        >
                            <option value="">-- Sin Cliente Asignado --</option>
                            {clientes.map(cli => <option key={cli.id} value={cli.id}>{cli.nombre}</option>)}
                        </select>
                    </div>

                    <div style={{display:'flex', gap:'10px'}}>
                        <div style={{flex:1}}>
                            <label style={labelStyle}>Empleado:</label>
                            <select style={inputStyle} value={editingVenta.empleadoId} onChange={(e) => setEditingVenta({...editingVenta, empleadoId: e.target.value})}>
                                {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                            </select>
                        </div>
                        <div style={{flex:1}}>
                            <label style={labelStyle}>Servicio:</label>
                            <select style={inputStyle} value={editingVenta.servicioId} onChange={(e) => setEditingVenta({...editingVenta, servicioId: e.target.value})}>
                                {servicios.map(serv => <option key={serv.id} value={serv.id}>{serv.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <label style={labelStyle}>Monto Cobrado:</label>
                    <input type="number" value={editingVenta.monto} onChange={(e) => setEditingVenta({...editingVenta, monto: e.target.value})} style={inputStyle} />

                    <label style={labelStyle}>Método de Pago:</label>
                    <select style={inputStyle} value={editingVenta.metodoPago} onChange={(e) => setEditingVenta({...editingVenta, metodoPago: e.target.value})}>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Transferencia">Transferencia</option>
                    </select>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <input type="checkbox" checked={editingVenta.requiereFactura} onChange={(e) => setEditingVenta({...editingVenta, requiereFactura: e.target.checked})} />
                        Requiere Factura
                    </label>

                    <button onClick={guardarEdicionVenta} style={btnPrimary}>Guardar Cambios</button>
                </div>
            </div>
        </div>
      )}

      {/* --- NUEVO MODAL: EDITAR EMPLEADO --- */}
      {editingEmpleado && (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3>Editar Empleado</h3>
                    <button onClick={() => setEditingEmpleado(null)} style={btnIcon}><X size={20}/></button>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    <label style={labelStyle}>Nombre:</label>
                    <input 
                        value={editingEmpleado.nombre} 
                        onChange={(e) => setEditingEmpleado({...editingEmpleado, nombre: e.target.value})} 
                        style={inputStyle} 
                    />
                    <button onClick={handleEditEmpleado} style={btnPrimary}>Guardar Cambios</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

// ESTILOS
const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' };
const btnPrimary = { width: '100%', padding: '15px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '16px' };
const activeTab = { padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' };
const inactiveTab = { padding: '10px 20px', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const thStyle = { padding: '12px', color: '#64748b', fontSize: '13px', borderBottom: '2px solid #e2e8f0' };
const tdStyle = { padding: '12px', color: '#334155' };
const btnIcon = { padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#e2e8f0', cursor: 'pointer', color: '#475569' };
const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle = {
    backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
};

export default Finanzas;