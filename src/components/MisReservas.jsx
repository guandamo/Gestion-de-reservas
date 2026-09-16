import React, { useState } from 'react';

export default function MisReservas() {
    const [reservas, setReservas] = useState([
        {
            id: 1,
            cancha: 'Cancha 1',
            fecha: '10 Jun',
            hora: '08:00',
            monto: 4500,
            estado: 'Pagado'
        },
        {
            id: 2,
            cancha: 'Cancha 2',
            fecha: '12 Jun',
            hora: '19:00',
            monto: 5000,
            estado: 'Pendiente'
        },
        {
            id: 3,
            cancha: 'Cancha 1',
            fecha: '05 Jun',
            hora: '10:00',
            monto: 4500,
            estado: 'Cancelado'
        }
    ]);
    const obtenerColorEstado = (estado) => {
        switch (estado) {
            case 'Pagado':
                return 'bg-green-900 text-green-300 border-green-700';
            case 'Pendiente':
                return 'bg-yellow-900 text-yellow-300 border-yellow-700';
            case 'Cancelado':
                return 'bg-red-900 text-red-300 border-red-700';
            default:
                return 'bg-gray-700 text-gray-300 border-gray-600';
        }
    };

    return (
        <div className="p-8 bg-[#151717] min-h-screen text-white">

            <div className="mb-8 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold">Mis reservas</h2>
                <p className="text-gray-400 mt-2 text-sm">
                    Acá podés ver el historial completo de tus turnos y su estado de pago.
                </p>
            </div>

            {/* LISTA DE RESERVAS */}
            <div className="flex flex-col gap-4">
                {reservas.map((reserva) => (
                    <div
                        key={reserva.id}
                        className="flex items-center justify-between bg-[#30302E] p-5 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors"
                    >

                        {/* INFO PRINCIPAL (Cancha y Fecha) */}
                        <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold text-white">{reserva.cancha}</span>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                {reserva.fecha} a las {reserva.hora} hs
                            </div>
                        </div>

                        {/* PRECIO Y ESTADO */}
                        <div className="flex items-center gap-6">
                            <span className="text-lg font-semibold text-gray-200">
                                ${reserva.monto}
                            </span>

                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${obtenerColorEstado(reserva.estado)}`}>
                                {reserva.estado}
                            </span>

                            {reserva.estado === 'Pendiente' && (
                                <button className="bg-[#155A3A] hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                    Pagar
                                </button>
                            )}
                        </div>

                    </div>
                ))}

                {/* MENSAJE SI NO HAY RESERVAS */}
                {reservas.length === 0 && (
                    <div className="text-center text-gray-500 py-10 bg-[#30302E] rounded-xl border border-dashed border-gray-600">
                        Todavía no tenés ninguna reserva registrada.
                    </div>
                )}
            </div>

        </div>
    );
}