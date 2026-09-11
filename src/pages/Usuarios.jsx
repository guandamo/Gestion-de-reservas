import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const estadoStyles = {
    ACTIVO: 'bg-green-500/20 text-green-400 border border-green-500/30',
    SUSPENDIDO: 'bg-red-500/20 text-red-400 border border-red-500/30',
    INACTIVO: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
};

const rolStyles = {
    ADMIN: 'bg-verde-principal/20 text-verde-claro border border-verde-principal/30',
    USUARIO: 'bg-white/10 text-gray-300 border border-white/10',
};

// Mapeo backend -> frontend
function estadoFrontend(activo, rol) {
    // ADMIN no se puede suspender
    if (rol === 'ADMIN') return 'ACTIVO';
    return activo ? 'ACTIVO' : 'SUSPENDIDO';
}

function formatNombreCompleto(nombre, apellido) {
    const a = apellido?.trim() ?? '';
    const n = nombre?.trim() ?? '';
    if (!a && !n) return '—';
    if (!a) return n;
    if (!n) return a;
    return `${n} ${a}`;
}

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('todos');
    const [guardando, setGuardando] = useState(null); // id del usuario que se está suspendiendo

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const data = await api.get('/users');
            setUsuarios(data.usuarios);
        } catch (e) {
            setError(e.message || 'No se pudieron cargar los usuarios.');
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargar();
    }, []);

    const toggleEstado = async (u) => {
        if (u.rol === 'ADMIN') return; // No se suspenden admins
        const nuevoActivo = !u.activo;
        setGuardando(u.id);
        try {
            const actualizado = await api.patch(`/users/${u.id}/status`, {
                activo: nuevoActivo,
            });
            setUsuarios((prev) =>
                prev.map((x) => (x.id === u.id ? { ...x, ...actualizado } : x)),
            );
        } catch (e) {
            alert(e.message || 'No se pudo cambiar el estado del usuario.');
        } finally {
            setGuardando(null);
        }
    };

    const usuariosFiltrados = usuarios.filter((u) => {
        const coincideBusqueda = `${u.nombre} ${u.apellido} ${u.email}`
            .toLowerCase()
            .includes(busqueda.toLowerCase());
        const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;
        return coincideBusqueda && coincideRol;
    });

    const totalUsuarios = usuarios.length;
    const totalUsuariosRol = (rol) => usuarios.filter((u) => u.rol === rol).length;
    const totalSuspendidos = usuarios.filter((u) => !u.activo && u.rol !== 'ADMIN').length;

    return (
        <div>
            <h2 className="text-2xl font-bold text-blanco mb-6">Usuarios</h2>

            {/* Resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Total usuarios</p>
                    <p className="text-3xl font-bold text-blanco">{totalUsuarios}</p>
                </div>
                <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Usuarios</p>
                    <p className="text-3xl font-bold text-blanco">{totalUsuariosRol('USUARIO')}</p>
                </div>
                <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Suspendidos</p>
                    <p className="text-3xl font-bold text-blanco">{totalSuspendidos}</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

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
                    <option value="USUARIO">Usuarios</option>
                    <option value="ADMIN">Admins</option>
                </select>
                <button
                    onClick={cargar}
                    className="text-xs bg-white/10 hover:bg-white/20 text-blanco px-3 py-2.5 rounded-lg"
                    title="Refrescar"
                >
                    ↻ Refrescar
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-[#222222] rounded-xl border border-white/5 overflow-hidden">
                {cargando ? (
                    <p className="text-gray-400 text-center py-8 text-sm">Cargando usuarios...</p>
                ) : usuariosFiltrados.length === 0 ? (
                    <p className="text-gray-400 text-center py-8 text-sm">Sin resultados.</p>
                ) : (
                    <>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-white/5">
                                        <th className="px-5 py-3 font-medium">Nombre</th>
                                        <th className="px-5 py-3 font-medium">Email</th>
                                        <th className="px-5 py-3 font-medium">Rol</th>
                                        <th className="px-5 py-3 font-medium">Estado</th>
                                        <th className="px-5 py-3 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosFiltrados.map((u) => {
                                        const ef = estadoFrontend(u.activo, u.rol);
                                        return (
                                            <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                                                <td className="px-5 py-3 text-blanco font-medium">
                                                    {formatNombreCompleto(u.nombre, u.apellido)}
                                                </td>
                                                <td className="px-5 py-3 text-gray-300">{u.email}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${rolStyles[u.rol] || ''}`}>
                                                        {u.rol === 'USUARIO' ? 'usuario' : u.rol.toLowerCase()}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${estadoStyles[ef] || ''}`}>
                                                        {ef === 'ACTIVO' ? 'activo' : 'suspendido'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {u.rol !== 'ADMIN' ? (
                                                        <button
                                                            onClick={() => toggleEstado(u)}
                                                            disabled={guardando === u.id}
                                                            className="text-xs text-verde-claro hover:text-blanco transition disabled:opacity-50"
                                                        >
                                                            {guardando === u.id
                                                                ? 'Guardando...'
                                                                : u.activo
                                                                    ? 'Suspender'
                                                                    : 'Reactivar'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista mobile */}
                        <div className="sm:hidden divide-y divide-white/5">
                            {usuariosFiltrados.map((u) => {
                                const ef = estadoFrontend(u.activo, u.rol);
                                return (
                                    <div key={u.id} className="px-5 py-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-blanco text-sm font-medium">{formatNombreCompleto(u.nombre, u.apellido)}</p>
                                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${estadoStyles[ef] || ''}`}>
                                                {ef === 'ACTIVO' ? 'activo' : 'suspendido'}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-xs mb-2">{u.email}</p>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${rolStyles[u.rol] || ''}`}>
                                                {u.rol === 'USUARIO' ? 'usuario' : u.rol.toLowerCase()}
                                            </span>
                                            {u.rol !== 'ADMIN' && (
                                                <button
                                                    onClick={() => toggleEstado(u)}
                                                    disabled={guardando === u.id}
                                                    className="text-xs text-verde-claro hover:text-blanco transition disabled:opacity-50"
                                                >
                                                    {guardando === u.id
                                                        ? 'Guardando...'
                                                        : u.activo
                                                            ? 'Suspender'
                                                            : 'Reactivar'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
