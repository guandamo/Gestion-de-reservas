// Items de navegación compartidos por el Sidebar (desktop) y el MobileDrawer.
// Centralizado para no duplicar ni desincronizar las rutas.

export const adminItems = [
    { to: '/admin', label: 'Calendario', icon: '📅', end: true },
    { to: '/admin/reservas', label: 'Reservas', icon: '📋' },
    { to: '/admin/reportes', label: 'Reportes', icon: '📊' },
    { to: '/admin/canchas', label: 'Canchas y precios', icon: '⚙️' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
    { to: '/admin/perfil', label: 'Mi perfil', icon: '👤' },
];

export const userItems = [
    { to: '/user/reservar', label: 'Reservar', icon: '📅' },
    { to: '/user/mis-reservas', label: 'Mis reservas', icon: '📋' },
    { to: '/user/perfil', label: 'Mi perfil', icon: '👤' },
];