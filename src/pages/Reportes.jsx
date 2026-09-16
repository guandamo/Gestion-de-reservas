import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function formatMonto(valor) {
    if (valor == null) return '$0';
    return `$${Number(valor).toLocaleString('es-AR')}`;
}

function StatCard({ label, value, sub, subColor = 'text-green-400' }) {
    return (
        <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
            <p className="text-gray-400 text-sm mb-1">{label}</p>
            <p className="text-3xl font-bold text-blanco">{value}</p>
            {sub && <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>}
        </div>
    );
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

    const ingresosDisplay = stats
        ? stats.ingresosMes >= 1_000_000
            ? `$${(stats.ingresosMes / 1_000_000).toFixed(1)}M`
            : formatMonto(stats.ingresosMes)
        : '$0';

    const mesesDisponibles = (() => {
        // Genera últimos 6 meses como opciones
        const out = [];
        const d = new Date();
        for (let i = 0; i < 6; i++) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            out.push(`${y}-${m}`);
            d.setMonth(d.getMonth() - 1);
        }
        return out;
    })();

    return (
        <>
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-blanco">Reportes</h2>

                <div className="flex items-center gap-3">
                    <select
                        value={mes}
                        onChange={(e) => setMes(e.target.value)}
                        className="bg-[#222222] text-blanco text-sm border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-verde-principal"
                    >
                        {mesesDisponibles.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

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

            {/* Cards de métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Reservas hoy"
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
                <StatCard
                    label="Pagos pendientes"
                    value={stats?.pagosPendientes ?? 0}
                    sub={<span className="text-yellow-400">Requieren acción</span>}
                    subColor="text-yellow-400"
                />
            </div>

            {/* Información de auditoría */}
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
        </>
    );
}
