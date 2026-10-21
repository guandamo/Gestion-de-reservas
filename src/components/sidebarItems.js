// Items de navegación compartidos por el Sidebar (desktop) y el MobileDrawer.
// Centralizado para no duplicar ni desincronizar las rutas.

export const adminItems = [
    { to: '/admin', label: 'Calendario', icon: 'calendar-days', end: true },
    { to: '/admin/reservas', label: 'Reservas', icon: 'clipboard-list' },
    { to: '/admin/reportes', label: 'Reportes', icon: 'chart-no-axes-combined' },
    { to: '/admin/canchas', label: 'Canchas y precios', icon: 'settings-2' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: 'users-round' },
    { to: '/admin/perfil', label: 'Mi perfil', icon: 'user-round' },
];

export const userItems = [
    { to: '/user/reservar', label: 'Reservar', icon: 'calendar-plus' },
    { to: '/user/mis-reservas', label: 'Mis reservas', icon: 'clipboard-list' },
    { to: '/user/perfil', label: 'Mi perfil', icon: 'user-round' },
];
