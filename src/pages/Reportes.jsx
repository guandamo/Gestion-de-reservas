import React, { useState } from 'react';

// Datos simulados - reemplazar por fetch a Supabase/FastAPI
const mockReservas = [
    { cliente: 'Ramírez, J.', cancha: 'Cancha 1', fecha: '10 jun 08:00', monto: 4500, estado: 'Pagado' },
    { cliente: 'Díaz, M.', cancha: 'Cancha 2', fecha: '10 jun 09:00', monto: 3200, estado: 'Pendiente' },
    { cliente: 'Torres, R.', cancha: 'Cancha 1', fecha: '09 jun 10:00', monto: 4500, estado: 'Pagado' },
    { cliente: 'Castro, F.', cancha: 'Cancha 3', fecha: '09 jun 11:00', monto: 2800, estado: 'Fallido' },
    { cliente: 'Sosa, L.', cancha: 'Cancha 2', fecha: '08 jun 08:00', monto: 3200, estado: 'Pagado' },
];

const mockStats = {
    reservasHoy: 12,
    reservasHoyDelta: '+3 vs ayer',
    ocupacionHoy: 78,
    ingresosMes: 1200000,
    metaIngresos: 1500000,
    pagosPendientes: 3,
};

// Estilos de badge por estado
const estadoStyles = {
    Pagado: 'bg-green-500/20 text-green-400 border border-green-500/30',
    Pendiente: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    Fallido: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function EstadoBadge({ estado }) {
    return (
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${estadoStyles[estado] || 'bg-gray-500/20 text-gray-300'}`}>
            {estado}
        </span>
    );
}

function formatMonto(valor) {
    return `$${valor.toLocaleString('es-AR')}`;
}

function StatCard({ label, value, sub, subColor = 'text-green-400' }) {
    return (
        <div className="bg-[#222222] rounded-xl p-5 border border-white/5">
            <p className="text-gray-400 text-sm mb-1">{label}</p>
            <p className="text-3xl font-bold text-blanco">{value}</p>
            {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
        </div>
    );
}

export default function Reportes() {
    const [mes, setMes] = useState('Junio 2026');
    const [exportando, setExportando] = useState(false);

    const handleExportar = async () => {
        setExportando(true);
        // TODO: reemplazar por llamada real (ej: GET /reportes/export?mes=... -> descarga CSV/XLSX)
        try {
            await new Promise((resolve) => setTimeout(resolve, 800));
            alert(`Exportando reporte de ${mes}...`);
        } finally {
            setExportando(false);
        }
    };

    const ocupacionMonto = ((mockStats.ingresosMes / 1000000).toFixed(1)) + 'M';
    const metaMonto = (mockStats.metaIngresos / 1000000).toFixed(1) + 'M';

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
                        <option>Junio 2026</option>
                        <option>Mayo 2026</option>
                        <option>Abril 2026</option>
                    </select>

                    <button
                        onClick={handleExportar}
                        disabled={exportando}
                        className="flex items-center gap-2 bg-verde-principal hover:bg-verde-principal/90 disabled:opacity-60 text-blanco text-sm font-medium px-4 py-2 rounded-lg transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        {exportando ? 'Exportando...' : 'Exportar'}
                    </button>
                </div>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Reservas hoy"
                    value={mockStats.reservasHoy}
                    sub={mockStats.reservasHoyDelta}
                />
                <StatCard
                    label="Ocupación hoy"
                    value={`${mockStats.ocupacionHoy}%`}
                    sub={
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-2">
                            <div
                                className="bg-verde-principal h-1.5 rounded-full"
                                style={{ width: `${mockStats.ocupacionHoy}%` }}
                            />
                        </div>
                    }
                />
                <StatCard
                    label="Ingresos del mes"
                    value={`$${ocupacionMonto}`}
                    sub={`Meta: $${metaMonto}`}
                />
                <StatCard
                    label="Pagos pendientes"
                    value={mockStats.pagosPendientes}
                    sub="Requieren acción"
                    subColor="text-yellow-400"
                />
            </div>

            {/* Historial de reservas */}
            <div className="bg-[#222222] rounded-xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h3 className="text-blanco font-semibold">Historial de reservas</h3>
                    <button className="text-xs text-verde-claro hover:text-blanco transition">
                        Ver todas
                    </button>
                </div>

                {/* Tabla en desktop */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 border-b border-white/5">
                                <th className="px-5 py-3 font-medium">Cliente</th>
                                <th className="px-5 py-3 font-medium">Cancha</th>
                                <th className="px-5 py-3 font-medium">Fecha</th>
                                <th className="px-5 py-3 font-medium">Monto</th>
                                <th className="px-5 py-3 font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockReservas.map((r, i) => (
                                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                                    <td className="px-5 py-3 text-blanco">{r.cliente}</td>
                                    <td className="px-5 py-3 text-gray-300">{r.cancha}</td>
                                    <td className="px-5 py-3 text-gray-300">{r.fecha}</td>
                                    <td className="px-5 py-3 text-blanco font-medium">{formatMonto(r.monto)}</td>
                                    <td className="px-5 py-3"><EstadoBadge estado={r.estado} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Lista en mobile, como en el mockup */}
                <div className="sm:hidden divide-y divide-white/5">
                    {mockReservas.map((r, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-blanco text-sm font-medium">{r.cliente}</p>
                                <p className="text-gray-400 text-xs">{r.cancha} · {r.fecha}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blanco text-sm font-medium">{formatMonto(r.monto)}</p>
                                <EstadoBadge estado={r.estado} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}