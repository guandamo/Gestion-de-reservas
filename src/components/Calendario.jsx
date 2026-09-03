import React, { useState } from 'react';

const dias = [
    { label: 'LUN', num: 8 },
    { label: 'MAR', num: 9 },
    { label: 'MIÉ', num: 10, hoy: true },
    { label: 'JUE', num: 11 },
    { label: 'VIE', num: 12 },
    { label: 'SÁB', num: 13 },
    { label: 'DOM', num: 14 },
];

const horarios = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];

// TODO: reemplazar por datos reales del backend (Supabase/FastAPI)
const disponibilidadMock = {
    '08:00': ['Disponible', 'Ocupado', 'Disponible', 'Disponible', 'Ocupado', 'Ocupado', 'Disponible'],
    '09:00': ['Ocupado', 'Disponible', 'Ocupado', 'Ocupado', 'Disponible', 'Ocupado', 'Ocupado'],
    '10:00': ['Disponible', 'Disponible', 'Ocupado', 'Disponible', 'Disponible', 'Ocupado', 'Disponible'],
    '11:00': ['Ocupado', 'Disponible', 'Ocupado', 'Disponible', 'Disponible', 'Ocupado', 'Ocupado'],
    '12:00': ['Disponible', 'Ocupado', 'Disponible', 'Disponible', 'Ocupado', 'Disponible', 'Ocupado'],
    '13:00': ['Ocupado', 'Disponible', 'Ocupado', 'Disponible', 'Disponible', 'Ocupado', 'Disponible'],
};

const pagosMock = [
    { cliente: 'Ramírez, J.', cancha: 'Cancha 1', monto: '$4.500', metodo: 'MP', estado: 'Pagado' },
    { cliente: 'Díaz, M.', cancha: 'Cancha 2', monto: '$3.200', metodo: 'MP', estado: 'Pendiente' },
    { cliente: 'Torres, R.', cancha: 'Cancha 1', monto: '$4.500', metodo: 'MP', estado: 'Pagado' },
    { cliente: 'Castro, F.', cancha: 'Cancha 3', monto: '$2.800', metodo: 'MP', estado: 'Fallido' },
];

function EstadoPill({ estado }) {
    const esDisponible = estado === 'Disponible';
    return (
        <span
            className={`block text-center text-xs font-medium py-1.5 rounded-lg ${
                esDisponible
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-red-500/20 text-red-300'
            }`}
        >
            {estado}
        </span>
    );
}

function EstadoPagoPill({ estado }) {
    const estilos = {
        Pagado: 'bg-green-500/20 text-green-300',
        Pendiente: 'bg-yellow-500/20 text-yellow-300',
        Fallido: 'bg-red-500/20 text-red-300',
    };
    return (
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${estilos[estado]}`}>
            {estado}
        </span>
    );
}

export default function CalendarioDisponibilidad() {
    const [canchaSeleccionada, setCanchaSeleccionada] = useState('Cancha 1');
    const [filtroEstado, setFiltroEstado] = useState('Todos los estados');

    return (
        <div className="flex flex-col gap-6">
            {/* Card: Disponibilidad semanal */}
            <div className="bg-black/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className="text-lg font-semibold text-blanco">Disponibilidad semanal</h3>

                    <div className="flex items-center gap-3">
                        <button className="text-gray-400 hover:text-blanco px-2">‹</button>
                        <span className="text-sm text-gray-300">Jun 8–14, 2026</span>
                        <button className="text-gray-400 hover:text-blanco px-2">›</button>

                        <select
                            value={canchaSeleccionada}
                            onChange={(e) => setCanchaSeleccionada(e.target.value)}
                            className="bg-white/5 border border-white/10 text-blanco text-sm rounded-lg px-3 py-1.5"
                        >
                            <option>Cancha 1</option>
                            <option>Cancha 2</option>
                            <option>Cancha 3</option>
                        </select>
                    </div>
                </div>

                {/* Grilla */}
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-1 text-sm min-w-[600px]">
                        <thead>
                            <tr>
                                <th className="w-16"></th>
                                {dias.map((dia) => (
                                    <th key={dia.num} className="text-center pb-2">
                                        <div className="text-xs text-gray-400">{dia.label}</div>
                                        <div
                                            className={`text-sm font-semibold ${
                                                dia.hoy ? 'text-verde-principal' : 'text-blanco'
                                            }`}
                                        >
                                            {dia.num}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {horarios.map((hora) => (
                                <tr key={hora}>
                                    <td className="text-xs text-gray-400 pr-2 whitespace-nowrap">{hora}</td>
                                    {disponibilidadMock[hora].map((estado, i) => (
                                        <td key={i} className="p-0.5">
                                            <EstadoPill estado={estado} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Leyenda */}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/60"></span> Disponible
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/60"></span> Ocupado
                    </span>
                </div>
            </div>

            {/* Card: Pagos recientes */}
            <div className="bg-black/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className="text-lg font-semibold text-blanco">Pagos recientes</h3>
                    <div className="flex items-center gap-3">
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="bg-white/5 border border-white/10 text-blanco text-sm rounded-lg px-3 py-1.5"
                        >
                            <option>Todos los estados</option>
                            <option>Pagado</option>
                            <option>Pendiente</option>
                            <option>Fallido</option>
                        </select>
                        <button className="bg-verde-principal text-blanco text-sm font-medium px-3 py-1.5 rounded-lg">
                            ⭳ Exportar
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-400 border-b border-white/10">
                                <th className="pb-2 font-medium">Cliente</th>
                                <th className="pb-2 font-medium">Cancha</th>
                                <th className="pb-2 font-medium">Monto</th>
                                <th className="pb-2 font-medium">Método</th>
                                <th className="pb-2 font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagosMock
                                .filter((p) => filtroEstado === 'Todos los estados' || p.estado === filtroEstado)
                                .map((pago, i) => (
                                    <tr key={i} className="border-b border-white/5 text-blanco">
                                        <td className="py-2.5">{pago.cliente}</td>
                                        <td className="py-2.5 text-gray-300">{pago.cancha}</td>
                                        <td className="py-2.5">{pago.monto}</td>
                                        <td className="py-2.5 text-gray-300">{pago.metodo}</td>
                                        <td className="py-2.5">
                                            <EstadoPagoPill estado={pago.estado} />
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}