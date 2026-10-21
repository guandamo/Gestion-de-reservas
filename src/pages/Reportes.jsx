import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import MobileKpiCard from '../components/MobileKpiCard.jsx';
import StatusPill from '../components/StatusPill.jsx';
import GlideSelect from '../components/GlideSelect.jsx';

function formatMonto(valor) {
    if (valor == null) return '$0';
    return `$${Number(valor).toLocaleString('es-AR')}`;
}

function formatMontoCorto(valor) {
    if (valor == null) return '$0';
    if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`;
    if (valor >= 1_000) return `$${(valor / 1_000).toFixed(0)}K`;
    return formatMonto(valor);
}

function StatCard({ label, value, sub }) {
    return (
        <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
            <p className="text-gray-400 text-sm mb-1">{label}</p>
            <p className="text-3xl font-bold text-blanco">{value}</p>
            {sub !== undefined && <div className="text-xs mt-1">{sub}</div>}
        </div>
    );
}

const MESES_LABEL = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};
function formatMesLabel(mesYYYYMM) {
    if (!mesYYYYMM) return '';
    const [y, m] = mesYYYYMM.split('-');
    return `${MESES_LABEL[m] || m} ${y}`;
}

export default function Reportes() {
    const [mes, setMes] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [stats, setStats] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [exportando, setExportando] = useState(false);

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const data = await api.get(`/reports?mes=${mes}`);
            setStats(data);
        } catch (e) {
            setError(e.message || 'No se pudo cargar el reporte.');
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mes]);

    const handleExportar = async () => {
        setExportando(true);
        try {
            await api.download(`/reports/export?mes=${mes}`, `reporte_${mes}.pdf`);
        } catch (e) {
            alert(e.message || 'No se pudo exportar el reporte.');
        } finally {
            setExportando(false);
        }
    };

    const ingresosDisplay = stats ? formatMontoCorto(stats.ingresosMes) : '$0';

    const hayDatos = stats && (
        stats.reservasHoy > 0 ||
        stats.reservasEnMes > 0 ||
        stats.turnosHoy > 0 ||
        stats.ingresosMes > 0 ||
        stats.pagosMes > 0
    );

    // Rango fijo de meses disponibles: julio a diciembre 2026.
    const mesesDisponibles = [
        '2026-07',
        '2026-08',
        '2026-09',
        '2026-10',
        '2026-11',
        '2026-12',
    ];

    return (
        <>
            {/* ───── MOBILE (<lg): prototipo Image 6 ───── */}
            <div className="lg:hidden space-y-4">
                {/* Header mobile: título + mes + Exportar */}
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-2xl font-bold text-blanco">Reportes</h2>
                    <div className="flex items-center gap-2">
                        <GlideSelect
                            size="sm"
                            value={mes}
                            onChange={(val) => setMes(val)}
                            options={mesesDisponibles.map((m) => ({
                                value: m,
                                label: formatMesLabel(m),
                            }))}
                            ariaLabel="Mes"
                            accentColor="#3ecf8e"
                            surfaceColor="#222222"
                            highlightColor="#3f3f46"
                            textColor="#f5f5f5"
                        />
                        <button
                            onClick={handleExportar}
                            disabled={exportando || cargando}
                            className="flex items-center gap-1.5 bg-verde-principal hover:brightness-110 disabled:opacity-60 text-blanco text-xs font-medium px-3 py-1.5 rounded-lg transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Exportar
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg">
                        {error}
                    </div>
                )}

                {cargando && !stats ? (
                    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Cargando reporte…
                    </div>
                ) : !hayDatos ? (
                    <div className="bg-[#222222] border border-white/5 rounded-xl p-8 text-center">
                        <div className="text-4xl mb-3">📊</div>
                        <p className="text-gray-400 text-sm">Sin actividad en este período.</p>
                    </div>
                ) : (
                    <>
                        {/* KPIs 2x2 */}
                        <div className="grid grid-cols-2 gap-3">
                            <MobileKpiCard
                                titulo="Reservas confirmadas hoy"
                                valor={stats?.reservasHoy ?? 0}
                                subtitulo={stats?.variacionReservasHoy != null
                                    ? `${stats.variacionReservasHoy >= 0 ? '+' : ''}${stats.variacionReservasHoy} vs ayer`
                                    : 'alta de hoy'}
                                accent="verde"
                            />
                            <MobileKpiCard
                                titulo="Ocupación hoy"
                                valor={`${stats?.ocupacionHoy ?? 0}%`}
                                accent="verde"
                            >
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-verde-principal h-1.5 rounded-full transition-all"
                                        style={{ width: `${stats?.ocupacionHoy ?? 0}%` }}
                                    />
                                </div>
                            </MobileKpiCard>
                            <MobileKpiCard
                                titulo="Ingresos del mes"
                                valor={ingresosDisplay}
                                subtitulo={`Meta: ${formatMontoCorto(stats?.metaMes ?? 1_500_000)}`}
                                accent="verde"
                            />
                        </div>

                        {/* Historial de reservas (placeholder si no hay endpoint de listado) */}
                        <HistorialReservasMobile />
                    </>
                )}
            </div>

            {/* ───── DESKTOP (≥lg): vista original intacta ───── */}
            <div className="hidden lg:block">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-blanco">Reportes</h2>

                    <div className="flex items-center gap-3">
                        <GlideSelect
                            size="md"
                            value={mes}
                            onChange={(val) => setMes(val)}
                            options={mesesDisponibles.map((m) => ({
                                value: m,
                                label: formatMesLabel(m),
                            }))}
                            ariaLabel="Mes"
                            accentColor="#3ecf8e"
                            surfaceColor="#222222"
                            highlightColor="#3f3f46"
                            textColor="#f5f5f5"
                        />

                        <button
                            onClick={handleExportar}
                            disabled={exportando || cargando}
                            className="flex items-center gap-2 bg-verde-principal hover:bg-verde-principal/90 disabled:opacity-60 text-blanco text-sm font-medium px-4 py-2 rounded-lg transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            {exportando ? 'Exportando...' : 'Exportar PDF'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {cargando && !stats && (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Cargando reporte…
                    </div>
                )}

                {!cargando && stats && !hayDatos && (
                    <div className="bg-[#222222] border border-white/5 rounded-xl p-10 text-center">
                        <div className="text-4xl mb-3">📊</div>
                        <h3 className="text-blanco font-semibold text-lg mb-1">
                            Sin actividad en este período
                        </h3>
                        <p className="text-gray-400 text-sm max-w-md mx-auto">
                            No hay reservas ni pagos registrados en {mes}. Cuando los usuarios
                            empiecen a reservar canchas y se confirmen pagos, vas a ver las
                            métricas acá.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <StatCard
                        label="Reservas confirmadas hoy"
                        value={stats?.reservasHoy ?? 0}
                        sub={
                            <span className="text-gray-400">
                                {cargando ? 'cargando...' : 'alta de hoy'}
                            </span>
                        }
                    />
                    <StatCard
                        label="Ocupación hoy"
                        value={`${stats?.ocupacionHoy ?? 0}%`}
                        sub={
                            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2">
                                <div
                                    className="bg-verde-principal h-1.5 rounded-full transition-all"
                                    style={{ width: `${stats?.ocupacionHoy ?? 0}%` }}
                                />
                            </div>
                        }
                    />
                    <StatCard
                        label="Ingresos del mes"
                        value={ingresosDisplay}
                        sub={
                            <span className="text-gray-400">
                                {stats?.pagosMes ?? 0} pago(s) confirmado(s)
                            </span>
                        }
                    />
                </div>

                <div className="bg-[#222222] rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div>
                            <h3 className="text-blanco font-semibold">Resumen del período</h3>
                            <p className="text-gray-400 text-xs mt-1">
                                {stats?.periodo?.desde
                                    ? `Desde ${new Date(stats.periodo.desde).toLocaleDateString('es-AR')} hasta ${new Date(stats.periodo.hasta).toLocaleDateString('es-AR')}`
                                    : 'Cargando...'}
                            </p>
                        </div>
                        <span className="text-xs text-gray-400">
                            {stats?.reservasEnMes ?? 0} reservas en el mes
                        </span>
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b border-white/5">
                                    <th className="px-5 py-3 font-medium">Métrica</th>
                                    <th className="px-5 py-3 font-medium">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-white/5">
                                    <td className="px-5 py-3 text-gray-300">Turnos totales del día</td>
                                    <td className="px-5 py-3 text-blanco font-medium">
                                        {stats?.turnosHoy ?? 0}
                                    </td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="px-5 py-3 text-gray-300">Turnos reservados del día</td>
                                    <td className="px-5 py-3 text-blanco font-medium">
                                        {stats?.turnosReservadosHoy ?? 0}
                                    </td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="px-5 py-3 text-gray-300">Pagos confirmados</td>
                                    <td className="px-5 py-3 text-blanco font-medium">
                                        {stats?.pagosMes ?? 0}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-5 py-3 text-gray-300">Ingresos acumulados</td>
                                    <td className="px-5 py-3 text-blanco font-medium">
                                        {formatMonto(stats?.ingresosMes ?? 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Sub-componente: lista las reservas recientes obtenidas de GET /reservations.
 * Sólo se usa en mobile (>=lg usa la tabla de escritorio).
 */
function HistorialReservasMobile() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const data = await api.get('/reservations');
                if (!vivo) return;
                const lista = Array.isArray(data) ? data : data.items ?? [];
                setItems(lista.slice(0, 5));
            } catch {
                if (vivo) setItems([]);
            } finally {
                if (vivo) setLoading(false);
            }
        })();
        return () => { vivo = false; };
    }, []);

    if (loading) {
        return (
            <div className="bg-[#222222] border border-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Cargando historial…</p>
            </div>
        );
    }
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="bg-[#222222] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="text-blanco font-semibold text-sm">Historial de reservas</h3>
                {/* Antes era un <a href>, la única navegación de documento duro
                    de toda la app. Eso destruye y reconstruye el árbol entero y
                    vuelve a bootstrapar el AuthProvider sólo desde localStorage:
                    si el JWT de 1 h ya venció, la app entra igual "logueada",
                    muestra páginas protegidas que fallan con 401, y el estado
                    `from` queda armado para el rebote del login. Un <Link>
                    navega sin recargar. */}
                <Link to="/admin/reservas" className="text-xs text-verde-claro font-medium">Ver todas</Link>
            </div>
            <ul className="divide-y divide-white/5">
                {items.map((r) => {
                    const variant =
                        r.estado === 'CONFIRMADA' ? 'pagado'
                        : r.estado === 'PENDIENTE' ? 'pendiente'
                        : r.estado === 'CANCELADA' ? 'fallido'
                        : 'reservado';
                    return (
                        <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-blanco font-medium text-sm truncate">
                                    {r.usuario?.nombre ? `${r.usuario.nombre}, ${r.usuario.apellido?.[0] || ''}.` : `Reserva #${r.id}`}
                                </p>
                                <p className="text-gray-400 text-xs truncate">
                                    {r.cancha?.nombre || '—'} · {r.fecha} {r.horaInicio}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-blanco font-semibold text-sm">
                                    {formatMonto(r.precio ?? r.monto)}
                                </span>
                                <StatusPill variant={variant} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}