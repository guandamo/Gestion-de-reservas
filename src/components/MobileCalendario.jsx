import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import StatusPill from './StatusPill.jsx';
import GlideSelect from './GlideSelect.jsx';
import AppIcon from './AppIcon.jsx';
import {
    generarHorarios,
    formatearDiaLargo,
    formatearFechaCortaConAnio,
} from './calendario/utils.js';

/**
 * MobileCalendario — vista diaria y vertical de disponibilidad (mobile <lg).
 *
 * Layout (calcado del prototipo):
 *   ┌──────────────────────────────────────┐
 *   │ 📅 Disponibilidad diaria          ^ │  Header
 *   │    Lunes 8 de Junio · Cancha 1      │  Subtítulo contextual
 *   ├──────────────────────────────────────┤
 *   │ [‹]   Lun 8 de Junio, 2026     [›] │  Navegación de fecha
 *   ├──────────────────────────────────────┤
 *   │ [Cancha 1                      ▼]   │  Selector de cancha
 *   ├──────────────────────────────────────┤
 *   │ 08:00 hs            [Disponible]    │
 *   │ 09:00 hs            [Ocupado]       │  Lista vertical
 *   │ ...                                  │
 *   ├──────────────────────────────────────┤
 *   │ ■ Disponible   ■ Ocupado             │  Leyenda al pie
 *   └──────────────────────────────────────┘
 *   [          Reservar turno →          ]   CTA sticky
 *
 * Props:
 *  - canchaId?: number
 *  - canchas?: array
 *  - onSeleccionarTurno: (turno, cancha) => void
 *  - refreshKey?: number
 */
export default function MobileCalendario({
    canchaId: canchaIdProp,
    canchas: canchasProp,
    onSeleccionarTurno,
    refreshKey = 0,
    showReserveCta = true,
}) {
    const [canchas, setCanchas] = useState(canchasProp ?? []);
    const [canchaId, setCanchaId] = useState(canchaIdProp ?? null);
    const [disponibilidad, setDisponibilidad] = useState(null);
    const [loadingCanchas, setLoadingCanchas] = useState(!canchasProp);
    const [loadingDisp, setLoadingDisp] = useState(false);
    const [error, setError] = useState('');
    const [indiceFecha, setIndiceFecha] = useState(0);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);

    // ── Cargar canchas si no las pasaron por prop ────────────────────────
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canchasProp]);

    useEffect(() => {
        if (canchaIdProp && canchaIdProp !== canchaId) setCanchaId(canchaIdProp);
    }, [canchaIdProp]);

    // Resetear índice y selección al cambiar cancha / refresh
    useEffect(() => {
        setIndiceFecha(0);
        setTurnoSeleccionado(null);
    }, [canchaId, refreshKey]);

    // ── Cargar disponibilidad de la cancha seleccionada ────────────────
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

    // ── Agrupar turnos por fecha y ordenar ─────────────────────────────
    const turnosPorFecha = useMemo(() => {
        if (!disponibilidad) return {};
        const map = {};
        for (const t of disponibilidad.turnos) {
            if (!map[t.fecha]) map[t.fecha] = [];
            map[t.fecha].push(t);
        }
        return map;
    }, [disponibilidad]);

    const fechasDisponibles = useMemo(
        () => Object.keys(turnosPorFecha).sort(),
        [turnosPorFecha],
    );

    // Mantener el índice dentro de rango si cambia la lista de fechas
    useEffect(() => {
        if (fechasDisponibles.length === 0) {
            if (indiceFecha !== 0) setIndiceFecha(0);
            return;
        }
        if (indiceFecha >= fechasDisponibles.length) {
            setIndiceFecha(fechasDisponibles.length - 1);
        }
    }, [fechasDisponibles.length, indiceFecha]);

    const fechaSeleccionada = fechasDisponibles[indiceFecha] ?? null;
    const esPrimerDia = indiceFecha <= 0;
    const esUltimoDia = indiceFecha >= fechasDisponibles.length - 1;

    const horarios = useMemo(() => {
        if (!disponibilidad?.cancha) return [];
        return generarHorarios(
            disponibilidad.cancha.horaInicio,
            disponibilidad.cancha.horaFin,
        );
    }, [disponibilidad]);

    const turnosDelDia = fechaSeleccionada
        ? horarios
              .map((h) => turnosPorFecha[fechaSeleccionada]?.find((t) => t.horaInicio === h))
              .filter(Boolean)
        : [];

    const canchaActual = useMemo(
        () => canchas.find((c) => c.id === canchaId) ?? null,
        [canchas, canchaId],
    );
    const nombreCancha = canchaActual?.nombre ?? '—';

    const labelFechaCompleta = fechaSeleccionada
        ? formatearFechaCortaConAnio(fechaSeleccionada)
        : '—';

    // ── Loading / empty states ─────────────────────────────────────────
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
    const excedeRango =
        maxPermitida && fechaSeleccionada && fechaSeleccionada > maxPermitida;

    const handleReservar = () => {
        if (!turnoSeleccionado || !disponibilidad?.cancha) return;
        onSeleccionarTurno?.(turnoSeleccionado, disponibilidad.cancha);
    };

    const varianteDelTurno = (turno) => {
        if (turno.estado === 'DISPONIBLE') return 'disponible';
        if (turno.estado === 'RESERVADO' && turno.reservaActiva?.estado === 'PENDIENTE') return 'pendiente';
        if (turno.estado === 'RESERVADO' && turno.reservaActiva?.estado === 'CONFIRMADA') return 'reservado';
        return 'cancelada';
    };

    const irAHoy = () => {
        const hoy = new Date().toISOString().slice(0, 10);
        const idx = fechasDisponibles.indexOf(hoy);
        if (idx >= 0) setIndiceFecha(idx);
    };

    const hoyISO = new Date().toISOString().slice(0, 10);
    const hayHoyEnLista = fechasDisponibles.indexOf(hoyISO) >= 0;

    // Subtítulo: "Lunes 8 de Junio · Cancha 1"
    const subtitulo = fechaSeleccionada
        ? `${formatearDiaLargo(fechaSeleccionada)} · ${nombreCancha}`
        : nombreCancha;

    return (
        <div className="space-y-3 w-full max-w-full overflow-hidden">
            {error && (
                <div
                    role="alert"
                    className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg"
                >
                    {error}
                </div>
            )}

            {/* ── Card única: Disponibilidad diaria ── */}
            <div className="bg-[#222222] border border-white/5 rounded-2xl overflow-hidden w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-verde-claro text-base shrink-0" aria-hidden="true">
                            <AppIcon name="calendar-days" />
                        </span>
                        <h3 className="text-blanco font-semibold text-base truncate">
                            Disponibilidad diaria
                        </h3>
                    </div>
                    <span
                        className="text-gray-400 text-sm shrink-0 pl-2"
                        aria-hidden="true"
                    >
                        ⌃
                    </span>
                </div>
                <p className="text-gray-400 text-xs px-4 pb-3 truncate">
                    {subtitulo}
                </p>

                {/* Navegación de fecha */}
                <div className="px-4 py-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIndiceFecha((i) => Math.max(0, i - 1))}
                            disabled={esPrimerDia}
                            aria-label="Día anterior"
                            className="w-10 h-10 rounded-lg bg-verde-principal text-blanco text-lg hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0 flex items-center justify-center"
                        >
                            ‹
                        </button>
                        <p className="text-blanco text-sm font-semibold text-center flex-1 min-w-0 truncate">
                            {labelFechaCompleta}
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                setIndiceFecha((i) =>
                                    Math.min(fechasDisponibles.length - 1, i + 1),
                                )
                            }
                            disabled={esUltimoDia}
                            aria-label="Día siguiente"
                            className="w-10 h-10 rounded-lg bg-verde-principal text-blanco text-lg hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0 flex items-center justify-center"
                        >
                            ›
                        </button>
                    </div>
                    {hayHoyEnLista && (
                        <div className="mt-2 flex justify-center">
                            <button
                                type="button"
                                onClick={irAHoy}
                                className="text-xs text-verde-claro hover:text-blanco font-medium"
                            >
                                Ir a hoy
                            </button>
                        </div>
                    )}
                    {excedeRango && (
                        <p className="text-xs text-yellow-300 mt-2 text-center">
                            Esta fecha excede el rango permitido.
                        </p>
                    )}
                </div>

                {/* Selector de cancha (GlideSelect) */}
                <div className="px-4 py-3 border-t border-white/5">
                    <div className="w-full">
                        <GlideSelect
                            size="lg"
                            radius={9}
                            menuWidth={280}
                            value={canchaId != null ? String(canchaId) : ''}
                            onChange={(val) => setCanchaId(Number(val))}
                            options={canchas.map((c) => ({
                                value: String(c.id),
                                label: c.nombre,
                                tag: c.tipoCancha?.descripcion || undefined,
                            }))}
                            placeholder="Elegí una cancha"
                            ariaLabel="Cancha"
                            accentColor="#3ecf8e"
                            surfaceColor="#171717"
                            highlightColor="#3f3f46"
                            textColor="#f5f5f5"
                            className="!w-full [&_.glide-select__trigger]:!w-full"
                        />
                    </div>
                </div>

                {/* Lista vertical de horarios */}
                <div className="border-t border-white/5">
                    {loadingDisp ? (
                        <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                            <svg
                                className="animate-spin h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                            </svg>
                            Cargando disponibilidad…
                        </div>
                    ) : !fechaSeleccionada ? (
                        <div className="text-gray-400 text-sm text-center py-8 px-3">
                            No hay fechas con turnos disponibles para esta cancha.
                        </div>
                    ) : turnosDelDia.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-8 px-3">
                            No hay turnos este día.
                        </div>
                    ) : (
                        <ul>
                            {turnosDelDia.map((turno) => {
                                const variant = varianteDelTurno(turno);
                                const isDisponible = variant === 'disponible';
                                const isSelected = turnoSeleccionado?.id === turno.id;
                                return (
                                    <li key={turno.id} className="border-b border-white/5 last:border-b-0">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                isDisponible && setTurnoSeleccionado(turno)
                                            }
                                            disabled={!isDisponible}
                                            aria-pressed={isSelected}
                                            className={`w-full flex items-center justify-between gap-3 py-3.5 px-4 text-left transition min-h-[52px] ${
                                                isDisponible
                                                    ? isSelected
                                                        ? 'bg-verde-principal/15'
                                                        : 'hover:bg-white/5'
                                                    : 'opacity-70 cursor-not-allowed'
                                            }`}
                                        >
                                            <span className="text-blanco font-semibold text-sm tabular-nums shrink-0">
                                                {turno.horaInicio} hs
                                            </span>
                                            <StatusPill variant={variant} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Leyenda al pie (en la imagen) */}
                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-center gap-5 text-xs text-gray-300">
                    <span className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-sm bg-verde-principal"
                            aria-hidden="true"
                        />
                        Disponible
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-sm bg-white border border-white/40"
                            aria-hidden="true"
                        />
                        Ocupado
                    </span>
                </div>
            </div>

            {/* ── CTA sticky (solo si el caller quiere permitir reservar) ── */}
            {showReserveCta && (
                <button
                    type="button"
                    onClick={handleReservar}
                    disabled={!turnoSeleccionado}
                    className="w-full bg-verde-principal text-blanco font-bold text-base py-4 rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                    Reservar turno
                    <span aria-hidden="true">→</span>
                </button>
            )}
        </div>
    );
}
