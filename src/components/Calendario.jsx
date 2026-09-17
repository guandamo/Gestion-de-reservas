import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Calendario de una cancha específica.
 *
 * Props:
 *  - canchaId: number  (cancha actualmente seleccionada)
 *  - canchas: array    (lista completa, para el selector si el padre no lo provee)
 *  - onSeleccionarTurno: (turno, cancha) => void  (callback cuando el usuario hace click en un turno disponible)
 */
export default function Calendario({ canchaId: canchaIdProp, canchas: canchasProp, onSeleccionarTurno, refreshKey = 0 }) {
    const [canchas, setCanchas] = useState(canchasProp ?? []);
    const [canchaId, setCanchaId] = useState(canchaIdProp ?? null);
    const [disponibilidad, setDisponibilidad] = useState(null);
    const [loadingCanchas, setLoadingCanchas] = useState(!canchasProp);
    const [loadingDisp, setLoadingDisp] = useState(false);
    const [error, setError] = useState('');
    const [semanaIdx, setSemanaIdx] = useState(0);

    // Cargar canchas si no las pasaron por prop
    useEffect(() => {
        if (canchasProp && canchasProp.length) {
            setCanchas(canchasProp);
            if (!canchaId && canchasProp.length) setCanchaId(canchasProp[0].id);
            return;
        }
        (async () => {
            try {
                setLoadingCanchas(true);
                const data = await api.get('/courts');
                const lista = Array.isArray(data) ? data : data.canchas ?? [];
                const activas = lista.filter((c) => c.activa);
                setCanchas(activas);
                if (activas.length) setCanchaId(activas[0].id);
            } catch (err) {
                setError(err.message || 'No se pudieron cargar las canchas.');
            } finally {
                setLoadingCanchas(false);
            }
        })();
    }, [canchasProp]);

    // Sincronizar si cambia canchaIdProp
    useEffect(() => {
        if (canchaIdProp && canchaIdProp !== canchaId) {
            setCanchaId(canchaIdProp);
        }
    }, [canchaIdProp]);

    // Reiniciar semana al cambiar de cancha o al refrescar reservas
    useEffect(() => {
        setSemanaIdx(0);
    }, [canchaId, refreshKey]);

    // Cargar disponibilidad cuando cambia la cancha o cuando se hace una reserva
    useEffect(() => {
        if (!canchaId) return;
        (async () => {
            try {
                setLoadingDisp(true);
                setError('');
                const data = await api.get(`/turnos/availability/${canchaId}`);
                setDisponibilidad(data);
            } catch (err) {
                setError(err.message || 'No se pudo cargar la disponibilidad.');
                setDisponibilidad(null);
            } finally {
                setLoadingDisp(false);
            }
        })();
    }, [canchaId, refreshKey]);

    // Agrupar turnos por fecha
    const turnosPorFecha = useMemo(() => {
        if (!disponibilidad) return {};
        const map = {};
        for (const t of disponibilidad.turnos) {
            if (!map[t.fecha]) map[t.fecha] = [];
            map[t.fecha].push(t);
        }
        return map;
    }, [disponibilidad]);

    const fechas = Object.keys(turnosPorFecha).sort();

    // Horarios dinámicos según horaInicio/horaFin de la cancha
    const horarios = useMemo(() => {
        if (!disponibilidad?.cancha) return [];
        return generarHorarios(
            disponibilidad.cancha.horaInicio,
            disponibilidad.cancha.horaFin,
        );
    }, [disponibilidad]);

    // Agrupar fechas en semanas de 7
    const semanas = useMemo(() => {
        if (!fechas.length) return [];
        const out = [];
        for (let i = 0; i < fechas.length; i += 7) {
            out.push(fechas.slice(i, i + 7));
        }
        return out;
    }, [fechas]);

    // Resetear índice si hay menos semanas
    useEffect(() => {
        if (semanas.length && semanaIdx >= semanas.length) {
            setSemanaIdx(Math.max(0, semanas.length - 1));
        }
    }, [semanas.length, semanaIdx]);

    const fechasVisibles = semanas[semanaIdx] ?? [];
    const esPrimerSemana = semanaIdx === 0;
    const esUltimaSemana = semanas.length === 0 || semanaIdx === semanas.length - 1;

    if (loadingCanchas) {
        return <div className="text-gray-400 text-sm p-4">Cargando canchas…</div>;
    }

    if (canchas.length === 0) {
        return (
            <div className="bg-[#222222] rounded-xl p-6 text-center text-gray-400">
                No hay canchas activas disponibles.
            </div>
        );
    }

    const maxPermitida = disponibilidad?.rango?.maxPermitida;

    return (
        <div className="space-y-4">
            {/* Selector de cancha */}
            <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-gray-400">Cancha:</label>
                <select
                    value={canchaId ?? ''}
                    onChange={(e) => setCanchaId(Number(e.target.value))}
                    className="bg-[#222222] text-blanco text-sm border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-verde-principal"
                >
                    {canchas.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.nombre}
                            {c.tipoCancha ? ` · ${c.tipoCancha.descripcion}` : ''}
                        </option>
                    ))}
                </select>
                {disponibilidad && (
                    <span className="text-xs text-gray-400">
                        ${Number(disponibilidad.cancha.precioTurno).toLocaleString('es-AR')} / turno · {disponibilidad.cancha.horaInicio}–{disponibilidad.cancha.horaFin}
                    </span>
                )}
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg">
                    {error}
                </div>
            )}

            {maxPermitida && (
                <p className="text-xs text-gray-400">
                    Podés reservar hasta el {formatearFechaLarga(maxPermitida)}.
                </p>
            )}

            {loadingDisp ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Cargando disponibilidad…
                </div>
            ) : !disponibilidad ? null : fechas.length === 0 ? (
                <div className="bg-[#222222] rounded-xl p-8 text-center text-gray-400">
                    No hay turnos generados para esta cancha en los próximos días.
                </div>
            ) : (
                <div className="bg-[#222222] rounded-xl p-5 border border-white/5 overflow-x-auto">
                    <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                        <div>
                            <h3 className="text-blanco font-semibold text-lg">Disponibilidad</h3>
                            <p className="text-gray-400 text-xs">
                                Hacé click en un horario disponible para reservar
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSemanaIdx((s) => Math.max(0, s - 1))}
                                disabled={esPrimerSemana}
                                className="w-8 h-8 rounded-lg border border-white/10 bg-[#1a1a1a] text-blanco text-sm hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                                aria-label="Semana anterior"
                            >
                                ◀
                            </button>
                            <span className="text-xs text-gray-400 min-w-[120px] text-center">
                                {semanas.length > 0
                                    ? `${formatearFechaCorta(fechasVisibles[0])} – ${formatearFechaCorta(fechasVisibles[fechasVisibles.length - 1])}`
                                    : '—'}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setSemanaIdx((s) => Math.min(semanas.length - 1, s + 1))
                                }
                                disabled={esUltimaSemana}
                                className="w-8 h-8 rounded-lg border border-white/10 bg-[#1a1a1a] text-blanco text-sm hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                                aria-label="Semana siguiente"
                            >
                                ▶
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4 text-xs flex-wrap">
                        <Leyenda color="bg-green-500/60" texto="Disponible" />
                        <Leyenda color="bg-yellow-500/60" texto="Pendiente de pago" />
                        <Leyenda color="bg-red-500/60" texto="Reservado" />
                    </div>

                    <table className="w-full text-sm min-w-[700px] table-fixed">
                        <thead>
                            <tr>
                                <th className="w-20"></th>
                                {fechasVisibles.map((f) => (
                                    <th key={f} className="text-center pb-3 w-28">
                                        <div className="text-xs text-gray-400">
                                            {formatearDiaCorto(f)}
                                        </div>
                                        <div className="text-sm font-semibold text-blanco">
                                            {formatearNumero(f)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {horarios.map((hora) => (
                                <tr key={hora}>
                                    <td className="text-xs text-gray-400 pr-3 whitespace-nowrap text-right">
                                        {hora}
                                    </td>
                                    {fechasVisibles.map((f) => {
                                        const turno = turnosPorFecha[f]?.find(
                                            (t) => t.horaInicio === hora,
                                        );
                                        return (
                                            <td key={f + hora} className="p-1 w-28">
                                                {turno ? (
                                                    <CeldaTurno
                                                        turno={turno}
                                                        onClick={() =>
                                                            onSeleccionarTurno?.(turno, disponibilidad.cancha)
                                                        }
                                                    />
                                                ) : (
                                                    <div className="h-9 w-full"></div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function CeldaTurno({ turno, onClick }) {
    const isDisponible = turno.estado === 'DISPONIBLE';
    const isPendiente =
        turno.estado === 'RESERVADO' && turno.reservaActiva?.estado === 'PENDIENTE';
    const isConfirmado =
        turno.estado === 'RESERVADO' && turno.reservaActiva?.estado === 'CONFIRMADA';

    const baseClass =
        'w-full h-9 inline-flex items-center justify-center text-xs font-medium rounded-lg border whitespace-nowrap select-none';

    let estilo, texto;
    if (isDisponible) {
        estilo = 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 cursor-pointer transition';
        texto = 'Libre';
    } else if (isPendiente) {
        estilo = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        texto = 'Pendiente';
    } else if (isConfirmado) {
        estilo = 'bg-red-500/20 text-red-300 border-red-500/30';
        texto = 'Reservado';
    } else {
        estilo = 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        texto = '—';
    }

    const title = isDisponible
        ? `Reservar ${turno.horaInicio} - $${Number(turno.precio).toLocaleString('es-AR')}`
        : 'No disponible';

    if (isDisponible) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`${baseClass} ${estilo}`}
                title={title}
            >
                {texto}
            </button>
        );
    }

    return (
        <div
            className={`${baseClass} ${estilo}`}
            title={title}
            aria-label={title}
        >
            {texto}
        </div>
    );
}

function Leyenda({ color, texto }) {
    return (
        <span className="flex items-center gap-1.5 text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
            {texto}
        </span>
    );
}

// Genera las filas de horarios según el rango de la cancha (1 hora por turno)
function generarHorarios(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) return [];
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);
    const start = hi * 60 + mi;
    const end = hf * 60 + mf;
    const out = [];
    for (let m = start; m < end; m += 60) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        out.push(`${hh}:00`);
    }
    return out;
}

function formatearDiaCorto(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().slice(0, 3);
}

function formatearNumero(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    return d.getDate();
}

function formatearFechaCorta(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatearFechaLarga(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}
