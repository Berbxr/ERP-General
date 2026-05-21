import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Package, Scissors, DollarSign, BarChart3, LogOut } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Citas from './pages/Citas';
import Inventario from './pages/Inventario';
import Servicios from './pages/Servicios';
import Finanzas from './pages/Finanzas';
import Reportes from './pages/Reportes';
import Logo from './img/inet.svg';

// --- LOGIN SCREEN ACTUALIZADO (USUARIO) ---
const LoginScreen = ({ onLogin }) => {
  const [usuario, setUsuario] = useState(''); // Estado para usuario
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ CORRECCIÓN: Usamos la variable de estado 'usuario'
        body: JSON.stringify({ usuario: usuario, password }), 
      });
      
      if (response.ok) {
        const userData = await response.json();
        onLogin(userData);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f7f4' }}>
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '350px' }}>
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
           <img src={Logo} alt="Logo" style={{width: '60px'}}/>
           <h2 style={{color: '#1e3a2f'}}>Bienvenido</h2>
        </div>
        
        {error && <div style={{background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem'}}>{error}</div>}

        <div style={{ marginBottom: '15px' }}>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555'}}>Usuario</label>
          <input 
            type="text" 
            value={usuario} 
            onChange={e=>setUsuario(e.target.value)} 
            required 
            placeholder="Ej: admin"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
          />
        </div>
        <div style={{ marginBottom: '25px' }}>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555'}}>Contraseña</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#90b083', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Ingresar</button>
      </form>
    </div>
  );
};


// --- APP PRINCIPAL ---
const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('erp_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('erp_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('erp_user');
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const esAdmin = user.rol === 'ADMIN';

  return (
    <BrowserRouter>
      <div style={layoutStyle}>
        
        <nav style={sidebarStyle}>
          <div style={logoContainerStyle}>
            <img src={Logo} alt="Podocure" style={{ width: '50px', height: 'auto' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>iNET</h2>
              {/* Mostramos el nombre del usuario logueado */}
              <span style={{ fontSize: '0.8rem', color: '#90b083', letterSpacing: '1px' }}>
                {user.usuario ? user.usuario.toUpperCase() : 'USUARIO'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <NavItem to="/" icon={LayoutDashboard} label="Inicio" />
        {/* <NavItem to="/citas" icon={Calendar} label="Citas" /> */}
            <NavItem to="/clientes" icon={Users} label="Clientes" />
            <NavItem to="/inventario" icon={Package} label="Inventario" />
            <NavItem to="/servicios" icon={Scissors} label="Servicios" />
            
            <NavItem to="/finanzas" icon={DollarSign} label="Finanzas" />
            
            {esAdmin && (
              <NavItem to="/reportes" icon={BarChart3} label="Reportes" />
            )}
          </div>

          <button onClick={handleLogout} style={logoutButtonStyle}>
            <LogOut size={20} /> Salir
          </button>
        </nav>

        <main style={mainContentStyle}>
          <div style={contentWrapperStyle}>
            <Routes>
              <Route path="/" element={<Dashboard />} /> 
              <Route path="/citas" element={<Citas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/servicios" element={<Servicios />} />
              
              {/* Pasamos el rolUsuario correctamente */}
              <Route path="/finanzas" element={<Finanzas rolUsuario={user.rol} />} />
              
              <Route path="/reportes" element={esAdmin ? <Reportes /> : <Navigate to="/" />} />
            </Routes>
          </div>
        </main>
        
      </div>
    </BrowserRouter>
  );
};

const NavItem = ({ to, icon: Icon, label }) => {
  return (
    <NavLink 
      to={to} 
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', padding: '12px 16px', borderRadius: '10px', transition: 'all 0.3s ease', fontWeight: '500', fontSize: '0.95rem',
        backgroundColor: isActive ? '#90b083' : 'transparent',
        color: isActive ? '#ffffff' : '#aabeb0',
        boxShadow: isActive ? '0 4px 12px rgba(144, 176, 131, 0.3)' : 'none',
      })}
    >
      <Icon size={20} /> {label}
    </NavLink>
  );
};
// --- ESTILOS ACTUALIZADOS ---
const layoutStyle = { 
  display: 'flex', 
  height: '100vh', 
  overflow: 'hidden', 
  backgroundColor: '#f4f7f4', 
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
};

const sidebarStyle = { 
  width: '230px', // <-- Reducido de 260px para hacerla más angosta
  boxSizing: 'border-box', // <-- ¡CLAVE! Evita que el padding haga la barra más alta que la pantalla
  flexShrink: 0, 
  height: '100vh', 
  background: 'linear-gradient(180deg, #152920 0%, #1e3a2f 100%)', 
  color: 'white', 
  padding: '20px', // <-- Reducido ligeramente de 24px
  display: 'flex', 
  flexDirection: 'column', 
  boxShadow: '4px 0 20px rgba(0,0,0,0.08)', 
  zIndex: 10 
};

const mainContentStyle = { 
  flex: 1, 
  overflowY: 'auto', 
  backgroundColor: '#f1f5f2' 
};

const logoContainerStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  gap: '12px', 
  marginBottom: '25px', // <-- Reducido de 40px para que los menús suban un poco
  padding: '10px', 
  borderBottom: '1px solid rgba(144, 176, 131, 0.2)', 
  paddingBottom: '15px' 
};

const contentWrapperStyle = { 
  maxWidth: '1200px', 
  margin: '0 auto', 
  padding: '30px' 
};

const logoutButtonStyle = { 
  marginTop: 'auto', // Esto mantendrá el botón hasta abajo, pero ahora dentro de la pantalla
  background: 'transparent', 
  border: '1px solid #ef4444', 
  color: '#ef4444', 
  padding: '10px', 
  borderRadius: '8px', 
  cursor: 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  gap: '10px', 
  transition: '0.2s', 

};

export default App;