import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Package, DollarSign } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/clientes', icon: <Users size={20} />, label: 'Clientes' },
    { path: '/citas', icon: <Calendar size={20} />, label: 'Citas' },
    { path: '/inventario', icon: <Package size={20} />, label: 'Inventario' },
    { path: '/finanzas', icon: <DollarSign size={20} />, label: 'Finanzas' },
  ];

  return (
    <div style={{ width: '250px', backgroundColor: '#1e293b', color: 'white', height: '100vh', padding: '20px' }}>
      <h2 style={{ marginBottom: '40px', textAlign: 'center' }}>Mi ERP Servicios</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              textDecoration: 'none',
              color: 'white',
              borderRadius: '8px',
              backgroundColor: location.pathname === item.path ? '#334155' : 'transparent'
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;