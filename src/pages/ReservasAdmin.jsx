import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const ESTADOS = ['TODOS', 'PENDIENTE', 'CONFIRMADA', 'CANCELADA'];

const ESTILO_ESTADO = {
    PENDIENTE: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    CONFIRMADA: 'bg-green-500/20 text-green-300 border-green-500/30',
    CANCELADA: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const LABEL_ESTADO = {
    PENDIENTE: 'Pendiente de pago',
    CONFIRMADA: 'Confirmada',
    CANCELADA: 'Cancelada',
};

export default function ReservasAdmin() {
    const [estado, setEstado] = useState('TODOS');
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function cargar() {
        try {
            setLoading(true);
            setError('');
            const qs = estado !== 'TODOS' ? `?estado=${estado}` : '';
            const data = await api.get(`/reservations${qs}`);
            setReservas(Array.isArray(data?.items) ? data.items : []);
        } catch (err) {
            setError(err.message || 'No se pudieron cargar las reservas.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estado]);

    const resumen = {
        total: reservas.length,
        pendientes: reservas.filter((r) => r.estado === 'PENDIENTE').length,
        confirmadas: reservas.filter((r) => r.estado === 'CONFIRMADA').length,
        canceladas: reservas.filter((r) => r.estado === 'CANCELADA').length,
        ingresos: reservas
            .filter((r) => r.estado !== 'CANCELADA')
            .reduce((acc, r) => acc + Number(r.turno.precio), 0),
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-2xl font-bold text-blanco">Reservas</h2>
                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="bg-[#222222] text-blanco text-sm border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-verde-principal"
                >
                    {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                            {e === 'TODOS' ? 'Todos los estados' : LABEL_ESTADO[e] ?? e}
                        </option>
                    ))}
                </select>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ResumenCard label="Total" value={resumen.total} />
                <ResumenCard label="Pendientes" value={resumen.pendientes} color="text-yellow-300" />
                <ResumenCard label="Confirmadas" value={resumen.confirmadas} color="text-green-300" />
                <ResumenCard
                    label="Ingresos (no canceladas)"
                    value={`$${resumen.ingresos.toLocaleString('es-AR')}`}
                />
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-[#222222] rounded-xl border border-white/5 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Cargando reservas…
                    </div>
                ) : reservas.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-400 text-sm">
                            No hay reservas {estado !== 'TODOS' && `con estado "${LABEL_ESTADO[estado]}"`}.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Vista mobile: cards */}
                        <div className="md:hidden flex flex-col divide-y divide-white/5">
                            {reservas.map((r) => (
                                <ReservaMobile key={r.id} reserva={r} />
                            ))}
                        </div>

                        {/* Vista desktop: tabla */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-white/5">
                                        <th className="px-5 py-3 font-medium">#</th>
                                        <th className="px-5 py-3 font-medium">Usuario</th>
                                        <th className="px-5 py-3 font-medium">Cancha</th>
                                        <th className="px-5 py-3 font-medium">Fecha</th>
                                        <th className="px-5 py-3 font-medium">Horario</th>
                                        <th className="px-5 py-3 font-medium">Precio</th>
                                        <th className="px-5 py-3 font-medium">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservas.map((r) => (
                                        <tr key={r.id} className="border-b border-white/5 text-blanco">
                                            <td className="px-5 py-3 text-gray-300">#{r.id}</td>
                                            <td className="px-5 py-3">
                                                {r.usuario
                                                    ? `${r.usuario.nombre} ${r.usuario.apellido}`
                                                    : '—'}
                                                {r.usuario?.email && (
                                                    <div className="text-xs text-gray-400">{r.usuario.email}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {r.cancha.nombre}
                                                {r.cancha.tipo && (
                                                    <div className="text-xs text-gray-400">{r.cancha.tipo}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-gray-300">
                                                {formatearFechaCorta(r.turno.fecha)}
                                            </td>
                                            <td className="px-5 py-3 text-gray-300">
                                                {r.turno.horaInicio} - {r.turno.horaFin}
                                            </td>
                                            <td className="px-5 py-3">
                                                ${Number(r.turno.precio).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span
                                                    className={`text-xs font-medium px-3 py-1 rounded-full border ${
                                                        ESTILO_ESTADO[r.estado] ?? ESTILO_ESTADO.PENDIENTE
                                                    }`}
                                                >
                                                    {LABEL_ESTADO[r.estado] ?? r.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ResumenCard({ label, value, color = 'text-blanco' }) {
    return (
        <div className="bg-[#222222] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
    );
}

function ReservaMobile({ reserva }) {
    return (
        <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-blanco font-semibold">#{reserva.id} · {reserva.cancha.nombre}</span>
                <span
                    className={`text-xs font-medium px-3 py-1 rounded-full border ${
                        ESTILO_ESTADO[reserva.estado] ?? ESTILO_ESTADO.PENDIENTE
                    }`}
                >
                    {LABEL_ESTADO[reserva.estado] ?? reserva.estado}
                </span>
            </div>
            <div className="text-sm text-gray-300">
                {reserva.usuario
                    ? `${reserva.usuario.nombre} ${reserva.usuario.apellido}`
                    : '—'}
            </div>
            <div className="text-sm text-gray-300">
                {formatearFechaCorta(reserva.turno.fecha)} · {reserva.turno.horaInicio} - {reserva.turno.horaFin}
            </div>
            <div className="text-sm text-blanco font-bold">
                ${Number(reserva.turno.precio).toLocaleString('es-AR')}
            </div>
        </div>
    );
}

function formatearFechaCorta(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
