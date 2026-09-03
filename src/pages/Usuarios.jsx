import React, { useState } from 'react';

const mockUsuarios = [
    { id: 1, nombre: 'Ana Ramírez', email: 'ana.ramirez@correo.com', rol: 'cliente', reservas: 8, estado: 'activo' },
    { id: 2, nombre: 'Martín Díaz', email: 'martin.diaz@correo.com', rol: 'cliente', reservas: 3, estado: 'activo' },
    { id: 3, nombre: 'Rocío Torres', email: 'rocio.torres@correo.com', rol: 'cliente', reservas: 15, estado: 'activo' },
    { id: 4, nombre: 'Facundo Castro', email: 'facundo.castro@correo.com', rol: 'cliente', reservas: 1, estado: 'suspendido' },
    { id: 5, nombre: 'Admin Principal', email: 'admin@canchas.com', rol: 'admin', reservas: 0, estado: 'activo' },
];

const estadoStyles = {
    activo: 'bg-green-500/20 text-green-400 border border-green-500/30',
    suspendido: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const rolStyles = {
    admin: 'bg-verde-principal/20 text-verde-claro border border-verde-principal/30',
    cliente: 'bg-white/10 text-gray-300 border border-white/10',
};

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState(mockUsuarios);
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('todos');

    const usuariosFiltrados = usuarios.filter((u) => {
        const coincideBusqueda =
            u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            u.email.toLowerCase().includes(busqueda.toLowerCase());
        const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;
        return coincideBusqueda && coincideRol;
    });

    const toggleEstado = (id) => {
        // TODO: reemplazar por PATCH /usuarios/:id cuando esté el backend
        setUsuarios((prev) =>
            prev.map((u) =>
                u.id === id ? { ...u, estado: u.estado === 'activo' ? 'suspendido' : 'activo' } : u
            )
        );
    };

    const totalClientes = usuarios.filter((u) => u.rol === 'cliente').length;
    const totalSuspendidos = usuarios.filter((u) => u.estado === 'suspendido').length;

    return (
        <div>
            <h2 className="text-2xl font-bold text-blanco mb-6">Usuarios</h2>

            {/* Resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Total usuarios</p>
                    <p className="text-3xl font-bold text-blanco">{usuarios.length}</p>
                </div>
                <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Clientes</p>
                    <p className="text-3xl font-bold text-blanco">{totalClientes}</p>
                </div>
                <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Suspendidos</p>
                    <p className="text-3xl font-bold text-blanco">{totalSuspendidos}</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="flex-1 bg-[#222222] text-blanco text-sm border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-verde-principal placeholder:text-gray-500"
                />
                <select
                    value={filtroRol}
                    onChange={(e) => setFiltroRol(e.target.value)}
                    className="bg-[#222222] text-blanco text-sm border border-white/10 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-verde-principal"
                >
                    <option value="todos">Todos los roles</option>
                    <option value="cliente">Clientes</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="bg-[#222222] rounded-xl border border-white/5 overflow-hidden">
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 border-b border-white/5">
                                <th className="px-5 py-3 font-medium">Nombre</th>
                                <th className="px-5 py-3 font-medium">Email</th>
                                <th className="px-5 py-3 font-medium">Rol</th>
                                <th className="px-5 py-3 font-medium">Reservas</th>
                                <th className="px-5 py-3 font-medium">Estado</th>
                                <th className="px-5 py-3 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosFiltrados.map((u) => (
                                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                                    <td className="px-5 py-3 text-blanco font-medium">{u.nombre}</td>
                                    <td className="px-5 py-3 text-gray-300">{u.email}</td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${rolStyles[u.rol]}`}>
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-300">{u.reservas}</td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${estadoStyles[u.estado]}`}>
                                            {u.estado}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {u.rol !== 'admin' && (
                                            <button
                                                onClick={() => toggleEstado(u.id)}
                                                className="text-xs text-verde-claro hover:text-blanco transition"
                                            >
                                                {u.estado === 'activo' ? 'Suspender' : 'Reactivar'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Vista mobile */}
                <div className="sm:hidden divide-y divide-white/5">
                    {usuariosFiltrados.map((u) => (
                        <div key={u.id} className="px-5 py-3">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-blanco text-sm font-medium">{u.nombre}</p>
                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${estadoStyles[u.estado]}`}>
                                    {u.estado}
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs mb-2">{u.email}</p>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${rolStyles[u.rol]}`}>
                                    {u.rol}
                                </span>
                                {u.rol !== 'admin' && (
                                    <button
                                        onClick={() => toggleEstado(u.id)}
                                        className="text-xs text-verde-claro hover:text-blanco transition"
                                    >
                                        {u.estado === 'activo' ? 'Suspender' : 'Reactivar'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {usuariosFiltrados.length === 0 && (
                        <p className="text-gray-400 text-center py-8 text-sm">Sin resultados.</p>
                    )}
                </div>
            </div>
        </div>
    );
}