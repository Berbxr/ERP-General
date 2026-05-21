const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- DASHBOARD (ACTUALIZADO PARA TOP EMPLEADOS Y SERVICIOS SEMANALES) ---
app.get('/api/dashboard', async (req, res) => {
  try {
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));
    
    // Obtener inicio (Lunes) y fin (Viernes) de la semana actual
    const currentDay = hoy.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - distanceToMonday);
    inicioSemana.setHours(0,0,0,0);
    
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 4); // Viernes
    finSemana.setHours(23,59,59,999);

    const [
      totalClientes,
      serviciosHoy,
      serviciosSemanaTotal,
      ingresosSemanaResult,
      proximasCitas
    ] = await Promise.all([
      prisma.cliente.count(),
      // Servicios (ventas) de hoy
      prisma.venta.count({ where: { fecha: { gte: inicioDia, lte: finDia } } }),
      // Servicios (ventas) de Lunes a Viernes
      prisma.venta.count({ where: { fecha: { gte: inicioSemana, lte: finSemana } } }),
      // Ingresos de Lunes a Viernes
      prisma.venta.aggregate({
          _sum: { monto: true },
          where: { fecha: { gte: inicioSemana, lte: finSemana } }
      }),
      // Próximas citas pendientes
      prisma.cita.findMany({
        where: { fecha: { gte: new Date() }, estado: 'Pendiente' },
        orderBy: { fecha: 'asc' },
        take: 5,
        include: { cliente: true }
      })
    ]);

    // Top Empleados (Lunes a Viernes)
    const ventasSemana = await prisma.venta.findMany({
        where: { fecha: { gte: inicioSemana, lte: finSemana } },
        include: { empleado: true }
    });

    const conteoEmpleados = {};
    ventasSemana.forEach(v => {
        if(v.empleado) {
            const nombre = v.empleado.nombre;
            conteoEmpleados[nombre] = (conteoEmpleados[nombre] || 0) + 1;
        }
    });

    // Convertir objeto a array y ordenar de mayor a menor
    const topEmpleados = Object.keys(conteoEmpleados)
        .map(nombre => ({ nombre, totalServicios: conteoEmpleados[nombre] }))
        .sort((a, b) => b.totalServicios - a.totalServicios);

    res.json({
      metricas: {
        totalClientes,
        serviciosHoy,
        serviciosSemana: serviciosSemanaTotal,
        ingresosSemana: ingresosSemanaResult._sum.monto || 0
      },
      agenda: proximasCitas,
      topEmpleados: topEmpleados
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- CLIENTES ---
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { id: 'desc' },
      include: {
        _count: {
          select: { 
            citas: { where: { estado: 'Completada' } } 
          } 
        }
      }
    });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, email, telefono } = req.body;
    const nuevo = await prisma.cliente.create({ data: { nombre, email, telefono } });
    res.json(nuevo);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// --- INVENTARIO ---
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, marca, stock, precioVenta } = req.body;
    const nuevo = await prisma.producto.create({
      data: { nombre, marca, stock: parseInt(stock), precioVenta: parseFloat(precioVenta) }
    });
    res.json(nuevo);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, marca, stock, precioVenta, stockMinimo } = req.body;
    
    const actualizado = await prisma.producto.update({
      where: { id: parseInt(id) },
      data: {
        nombre, 
        marca, 
        stock: parseInt(stock), 
        precioVenta: parseFloat(precioVenta),
        stockMinimo: parseInt(stockMinimo)
      }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.producto.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// --- SERVICIOS ---
app.get('/api/servicios', async (req, res) => {
  const servicios = await prisma.servicio.findMany();
  res.json(servicios);
});

app.post('/api/servicios', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body; 
    const nuevoServicio = await prisma.servicio.create({
      data: { nombre, descripcion }
    });
    res.json(nuevoServicio);
  } catch (error) {
    console.error("Error creando servicio:", error);
    res.status(500).json({ error: 'No se pudo crear el servicio' });
  }
});

app.put('/api/servicios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    const actualizado = await prisma.servicio.update({
      where: { id: parseInt(id) },
      data: { nombre, descripcion }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

app.delete('/api/servicios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.servicio.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Servicio eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// --- CITAS ---
app.get('/api/citas', async (req, res) => {
  try {
    const citas = await prisma.cita.findMany({
      include: { 
        cliente: true,
        ventas: {
            include: {
                empleado: true,
                servicio: true
            }
        }
      },
      orderBy: { fecha: 'asc' }
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

app.post('/api/citas', async (req, res) => {
  try {
    const { fecha, motivo, clienteId } = req.body;
    const newCita = await prisma.cita.create({
      data: {
        fecha: new Date(fecha),
        motivo,
        clienteId: parseInt(clienteId)
      }
    });
    res.json(newCita);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

app.put('/api/citas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha } = req.body;

    const dataToUpdate = {};
    if (estado) dataToUpdate.estado = estado;
    if (fecha) dataToUpdate.fecha = new Date(fecha);

    const citaActualizada = await prisma.cita.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: { cliente: true }
    });

    res.json(citaActualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
});

app.get('/api/citas/pendientes', async (req, res) => {
  const citas = await prisma.cita.findMany({
    where: { NOT: { estado: 'Completada' } }, 
    include: { cliente: true },
    orderBy: { fecha: 'asc' }
  });
  res.json(citas);
});

// --- EMPLEADOS ---
app.get('/api/empleados', async (req, res) => {
  const empleados = await prisma.empleado.findMany();
  res.json(empleados);
});

app.post('/api/empleados', async (req, res) => {
  const { nombre } = req.body;
  const nuevo = await prisma.empleado.create({ data: { nombre } });
  res.json(nuevo);
});

app.put('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    const empleadoActualizado = await prisma.empleado.update({
      where: { id: parseInt(id) },
      data: { nombre }
    });

    res.json(empleadoActualizado);
  } catch (error) {
    console.error("Error al actualizar empleado:", error);
    res.status(500).json({ error: 'No se pudo actualizar el empleado' });
  }
});

app.delete('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const empId = parseInt(id);

    await prisma.comision.deleteMany({
      where: { empleadoId: empId }
    });

    await prisma.venta.deleteMany({
      where: { empleadoId: empId }
    });

    await prisma.empleado.delete({
      where: { id: empId }
    });

    res.json({ message: 'Empleado y sus datos asociados eliminados' });
  } catch (error) {
    console.error("Error al eliminar empleado:", error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});


// --- COMISIONES ---
app.get('/api/comisiones', async (req, res) => {
  try {
    const comisiones = await prisma.comision.findMany();
    res.json(comisiones);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo comisiones' });
  }
});

app.post('/api/comisiones', async (req, res) => {
  try {
    const { empleadoId, servicioId, porcentaje } = req.body;
    
    const comision = await prisma.comision.upsert({
      where: {
        empleadoId_servicioId: {
          empleadoId: parseInt(empleadoId),
          servicioId: parseInt(servicioId)
        }
      },
      update: { porcentaje: parseFloat(porcentaje) },
      create: {
        empleadoId: parseInt(empleadoId),
        servicioId: parseInt(servicioId),
        porcentaje: parseFloat(porcentaje)
      }
    });
    
    res.json(comision);
  } catch (error) {
    console.error("Error guardando comisión:", error);
    res.status(500).json({ error: 'Error guardando comisión' });
  }
});

// --- VENTAS (COBROS) ---
app.post('/api/ventas', async (req, res) => {
  try {
    const { citaId, servicioId, empleadoId, monto, metodoPago, requiereFactura, clienteId, fecha } = req.body;
    
    const dataToCreate = {
        monto: parseFloat(monto),
        metodoPago,
        requiereFactura,
        servicioId: parseInt(servicioId),
        empleadoId: parseInt(empleadoId)
    };

    if (citaId) dataToCreate.citaId = parseInt(citaId);
    if (clienteId) dataToCreate.clienteId = parseInt(clienteId);
    if (fecha) dataToCreate.fecha = new Date(fecha);

    const venta = await prisma.venta.create({
      data: dataToCreate
    });

    if (citaId) {
      await prisma.cita.update({
        where: { id: parseInt(citaId) },
        data: { estado: 'Completada' }
      });
    }

    res.json(venta);
  } catch (error) {
    console.error("Error al cobrar:", error);
    res.status(500).json({ error: 'Error al registrar cobro' });
  }
});

app.get('/api/ventas', async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        empleado: true,
        servicio: true,
        cita: { include: { cliente: true } }
        // Si en tu base de datos Venta tiene una relación 'cliente' directa, agrégala aquí:
        // , cliente: true 
      },
      orderBy: { fecha: 'desc' }
    });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// --- EDITAR VENTA (ACTUALIZADO: FECHA Y CLIENTE) ---
app.put('/api/ventas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { empleadoId, servicioId, monto, metodoPago, requiereFactura, fecha, clienteId } = req.body;

    const dataToUpdate = {
        empleadoId: parseInt(empleadoId),
        servicioId: parseInt(servicioId),
        monto: parseFloat(monto),
        metodoPago: metodoPago,
        requiereFactura: requiereFactura
    };

    if (fecha) dataToUpdate.fecha = new Date(fecha);
    
    // Solo actualizamos clienteId si la base de datos lo soporta (si agregaste el campo a tu schema de Prisma)
    // if (clienteId) dataToUpdate.clienteId = parseInt(clienteId); 
    // Si envías clienteId nulo (ej: se quitó al cliente), y la base lo permite:
    // else if (clienteId === null) dataToUpdate.clienteId = null;

    const ventaActualizada = await prisma.venta.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        empleado: true,
        servicio: true,
        cita: { include: { cliente: true } }
      }
    });

    res.json(ventaActualizada);
  } catch (error) {
    console.error("Error al actualizar venta:", error);
    res.status(500).json({ error: 'Error al actualizar la venta' });
  }
});

// --- NUEVO: ELIMINAR VENTA ---
app.delete('/api/ventas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.venta.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Venta eliminada correctamente' });
  } catch (error) {
    console.error("Error al eliminar venta:", error);
    res.status(500).json({ error: 'Error al eliminar la venta' });
  }
});

// --- GASTOS ---
app.get('/api/gastos', async (req, res) => {
  try {
    const gastos = await prisma.gasto.findMany({ orderBy: { fecha: 'desc' } });
    res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

app.post('/api/gastos', async (req, res) => {
  try {
    const { motivo, monto, fecha } = req.body;
    const nuevo = await prisma.gasto.create({
      data: {
        motivo,
        monto: parseFloat(monto),
        fecha: fecha ? new Date(fecha) : new Date()
      }
    });
    res.json(nuevo);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar gasto' });
  }
});

app.delete('/api/gastos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.gasto.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando gasto' });
  }
});

// --- REPORTES FINANCIEROS ---
app.get('/api/reportes/balance', async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    fechaFin.setHours(23, 59, 59, 999);

    const ventas = await prisma.venta.aggregate({
      _sum: { monto: true },
      where: { fecha: { gte: fechaInicio, lte: fechaFin } }
    });

    const gastos = await prisma.gasto.aggregate({
      _sum: { monto: true },
      where: { fecha: { gte: fechaInicio, lte: fechaFin } }
    });

    const totalVentas = ventas._sum.monto || 0;
    const totalGastos = gastos._sum.monto || 0;
    const balance = totalVentas - totalGastos;

    res.json({
      totalVentas,
      totalGastos,
      balance
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error calculando reporte' });
  }
});

app.put('/api/gastos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, monto, fecha } = req.body;

    const gastoActualizado = await prisma.gasto.update({
      where: { id: parseInt(id) },
      data: {
        motivo: motivo,
        monto: parseFloat(monto),
        fecha: new Date(fecha)
      }
    });

    res.json(gastoActualizado);
  } catch (error) {
    console.error("Error al actualizar gasto:", error);
    res.status(500).json({ error: 'Error al actualizar el gasto' });
  }
});

// --- AUTENTICACIÓN ---
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const userEncontrado = await prisma.usuarios.findUnique({ 
        where: { usuario: usuario } 
    }); 
    
    if (userEncontrado && userEncontrado.password === password) {
      const { password, ...usuarioSinPass } = userEncontrado;
      res.json(usuarioSinPass);
    } else {
      res.status(401).json({ error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// --- RUTA EXPRESS USUARIOS ---
app.get('/api/crear-usuario-express', async (req, res) => {
  const { usuario, password, nombre, rol } = req.query;

  if (!usuario || !password || !nombre) {
    return res.send(`
      <h2 style="color: red">❌ Faltan datos</h2>
      <p>Uso correcto:</p>
      <code>/api/crear-usuario-express?usuario=juan&password=123&nombre=JuanPerez&rol=EMPLEADO</code>
    `);
  }

  try {
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        usuario: usuario,
        password: password,
        nombre: nombre,
        rol: rol || 'EMPLEADO'
      }
    });

    res.send(`
      <div style="font-family: sans-serif; padding: 20px; border: 2px solid green; border-radius: 10px;">
        <h1 style="color: green">✅ ¡Usuario Creado!</h1>
        <p><strong>Nombre:</strong> ${nuevoUsuario.nombre}</p>
        <p><strong>Usuario:</strong> ${nuevoUsuario.usuario}</p>
        <p><strong>Rol:</strong> ${nuevoUsuario.rol}</p>
        <p>Ya puedes hacer login.</p>
        <br>
        <a href="/api/crear-usuario-express?usuario=otro&password=123&nombre=Otro&rol=EMPLEADO">Crear otro</a>
      </div>
    `);

  } catch (error) {
    res.status(500).send(`
      <h1 style="color: red">❌ Error</h1>
      <p>Probablemente el usuario ya existe.</p>
      <pre>${error.message}</pre>
    `);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor ERP corriendo en puerto ${PORT}`);
});