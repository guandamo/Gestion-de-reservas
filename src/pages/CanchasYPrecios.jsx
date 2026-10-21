import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import GlideSelect from '../components/GlideSelect.jsx';

const formVacio = {
    nombre: '',
    idTipoCancha: '',
    precioTurno: '',
    horaInicio: '08:00',
    horaFin: '22:00',
    activa: true,
};

export default function CanchasYPrecios() {
    const [tiposCancha, setTiposCancha] = useState([]);
    const [canchas, setCanchas] = useState([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(formVacio);
    // Horario con el que se abrió el formulario, para no mandarlo si no cambió.
    const [horarioOriginal, setHorarioOriginal] = useState({ horaInicio: '', horaFin: '' });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [mostrarTipoForm, setMostrarTipoForm] = useState(false);
    const [descripcionTipoNueva, setDescripcionTipoNueva] = useState('');
    const [guardandoTipo, setGuardandoTipo] = useState(false);
    const [errorTipo, setErrorTipo] = useState('');

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const [tipos, cts] = await Promise.all([
                api.get('/court-types'),
                api.get('/courts?incluirInactivos=true'),
            ]);
            setTiposCancha(tipos.tipos);
            setCanchas(cts.canchas);
        } catch (e) {
            setError(e.message || 'No se pudieron cargar las canchas.');
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargar();
    }, []);

    const descripcionTipo = (idTipoCancha) =>
        tiposCancha.find((t) => t.id === Number(idTipoCancha))?.descripcion || '—';

    const abrirNueva = () => {
        setEditandoId(null);
        setForm(formVacio);
        setHorarioOriginal({ horaInicio: '', horaFin: '' });
        setMostrarForm(true);
    };

    const abrirEditar = (cancha) => {
        setEditandoId(cancha.id);
        const horario = {
            horaInicio: toHora(cancha.horaInicio),
            horaFin: toHora(cancha.horaFin),
        };
        setHorarioOriginal(horario);
        setForm({
            nombre: cancha.nombre,
            idTipoCancha: String(cancha.idTipoCancha),
            precioTurno: Number(cancha.precioTurno),
            ...horario,
            activa: cancha.activa,
        });
        setMostrarForm(true);
    };

    const cerrarForm = () => {
        setMostrarForm(false);
        setEditandoId(null);
        setForm(formVacio);
        setHorarioOriginal({ horaInicio: '', horaFin: '' });
    };

    const handleCrearTipo = async (e) => {
        e.preventDefault();
        const descripcion = descripcionTipoNueva.trim();

        if (!descripcion) {
            setErrorTipo('Ingresá una descripción.');
            return;
        }

        try {
            setGuardandoTipo(true);
            setErrorTipo('');

            const nuevoTipo = await api.post('/court-types', { descripcion });

            setTiposCancha((actuales) =>
                [...actuales, nuevoTipo].sort((a, b) =>
                    a.descripcion.localeCompare(b.descripcion, 'es')
                )
            );
            setForm((actual) => ({
                ...actual,
                idTipoCancha: String(nuevoTipo.id),
            }));
            setDescripcionTipoNueva('');
            setMostrarTipoForm(false);
        } catch (e) {
            setErrorTipo(e.message || 'No se pudo crear el tipo de cancha.');
        } finally {
            setGuardandoTipo(false);
        }
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!form.nombre || !form.idTipoCancha || !form.precioTurno) {
            alert('Completá nombre, tipo de cancha y precio.');
            return;
        }

        // El backend regenera los 30 días de turnos cada vez que recibe
        // `horaInicio` o `horaFin`, aunque no hayan cambiado (eso lo dispara
        // `cambiaHorario` en editarCancha.js). Si el usuario sólo renombra la
        // cancha o le cambia el precio, mandar las horas borra y recrea todos
        // los turnos futuros sin motivo, y hasta puede chocar con un turno ya
        // reservado. Por eso en una EDICIÓN sólo se envían cuando realmente
        // cambiaron; en el alta siempre hacen falta.
        const cambiaHorario =
            !editandoId ||
            form.horaInicio !== horarioOriginal.horaInicio ||
            form.horaFin !== horarioOriginal.horaFin;

        const payload = {
            nombre: form.nombre,
            idTipoCancha: Number(form.idTipoCancha),
            precioTurno: Number(form.precioTurno),
            activa: form.activa,
            ...(cambiaHorario
                ? { horaInicio: form.horaInicio, horaFin: form.horaFin }
                : {}),
        };

        try {
            setGuardando(true);
            if (editandoId) {
                await api.patch(`/courts/${editandoId}`, payload);
            } else {
                await api.post('/courts', payload);
            }
            await cargar();
            cerrarForm();
        } catch (e) {
            alert(e.message || 'No se pudo guardar la cancha.');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (cancha) => {
        if (!window.confirm(`¿Dar de baja "${cancha.nombre}"? Quedará inactiva hasta reactivarla.`)) {
            return;
        }
        try {
            // Dar de baja no necesita el horario: mandarlo provocaría la
            // regeneración de turnos y el chequeo de conflicto con los
            // reservados, que puede bloquear la baja con un 409.
            await api.patch(`/courts/${cancha.id}`, {
                nombre: cancha.nombre,
                idTipoCancha: cancha.idTipoCancha,
                precioTurno: Number(cancha.precioTurno),
                activa: false,
            });
            await cargar();
        } catch (e) {
            alert(e.message || 'No se pudo dar de baja la cancha.');
        }
    };

    /**
     * Clases de input/select mobile-first:
     *  - mobile: bg-[#171717] text-blanco border-white/10 (dark, encaja con el card)
     *  - desktop (≥sm): mantiene el estilo claro original (legado, ya validado por usuarios)
     */
    const inputBase =
        'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-principal bg-[#171717] text-blanco border border-white/10 sm:bg-white sm:text-black sm:border-transparent';
    const labelBase = 'block text-xs text-gray-400 mb-1';

    return (
        <div>
            <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-2xl font-bold text-blanco">Canchas y precios</h2>
                <button
                    onClick={abrirNueva}
                    className="flex items-center gap-2 bg-verde-principal hover:bg-verde-principal/90 text-blanco text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                    <span className="text-lg leading-none">+</span> Nueva cancha
                </button>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {mostrarForm && (
                <form
                    onSubmit={handleGuardar}
                    className="bg-[#222222] rounded-xl border border-white/5 p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    <div>
                        <label className={labelBase}>Nombre</label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            placeholder="Cancha 5"
                            className={inputBase}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={labelBase}>Tipo de cancha</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setErrorTipo('');
                                    setMostrarTipoForm(true);
                                }}
                                className="text-xs text-verde-claro hover:text-white transition"
                            >
                                + Nuevo tipo
                            </button>
                        </div>
                        <GlideSelect
                            size="md"
                            value={form.idTipoCancha === '' ? '' : String(form.idTipoCancha)}
                            onChange={(val) => setForm({ ...form, idTipoCancha: val })}
                            options={[
                                { value: '', label: 'Seleccionar...' },
                                ...tiposCancha.map((t) => ({
                                    value: String(t.id),
                                    label: t.descripcion,
                                })),
                            ]}
                            ariaLabel="Tipo de cancha"
                            accentColor="#3ecf8e"
                            surfaceColor="#333333"
                            highlightColor="#4a4a4a"
                            textColor="#f5f5f5"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className={labelBase}>Precio por hora ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={form.precioTurno}
                            onChange={(e) => setForm({ ...form, precioTurno: e.target.value })}
                            placeholder="3000"
                            className={inputBase}
                        />
                    </div>

                    <div>
                        <label className={labelBase}>Hora inicio</label>
                        <input
                            type="time"
                            value={form.horaInicio}
                            onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                            className={`${inputBase} scheme-dark sm:scheme-light`}
                        />
                    </div>

                    <div>
                        <label className={labelBase}>Hora fin</label>
                        <input
                            type="time"
                            value={form.horaFin}
                            onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                            className={`${inputBase} scheme-dark sm:scheme-light`}
                        />
                    </div>

                    <div>
                        <label className={labelBase}>Estado</label>
                        <GlideSelect
                            size="md"
                            value={form.activa ? 'activa' : 'inactiva'}
                            onChange={(val) => setForm({ ...form, activa: val === 'activa' })}
                            options={[
                                { value: 'activa', label: 'Activa' },
                                { value: 'inactiva', label: 'Inactiva' },
                            ]}
                            ariaLabel="Estado"
                            accentColor="#3ecf8e"
                            surfaceColor="#333333"
                            highlightColor="#4a4a4a"
                            textColor="#f5f5f5"
                            className="w-full"
                        />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-2">
                        <button
                            type="button"
                            onClick={cerrarForm}
                            className="text-sm text-gray-300 hover:text-blanco px-4 py-2 transition order-2 sm:order-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="bg-verde-principal hover:bg-verde-principal/90 text-blanco text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-60 order-1 sm:order-2"
                        >
                            {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear cancha'}
                        </button>
                    </div>
                </form>
            )}

            <div className="flex flex-col gap-3">
                {cargando ? (
                    <p className="text-gray-400 text-center py-8">Cargando canchas...</p>
                ) : canchas.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No hay canchas cargadas todavía.</p>
                ) : (
                    canchas.map((cancha) => {
                        const horaIni = toHora(cancha.horaInicio);
                        const horaFin = toHora(cancha.horaFin);
                        return (
                            <div
                                key={cancha.id}
                                className="bg-[#222222] rounded-xl border border-white/5 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                                {/* Bloque principal: nombre + meta */}
                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                    <span
                                        className={`mt-1.5 sm:mt-0 w-2.5 h-2.5 rounded-full shrink-0 ${
                                            cancha.activa ? 'bg-green-500' : 'bg-gray-500'
                                        }`}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-blanco font-medium truncate">
                                            {cancha.nombre}
                                        </p>
                                        <p className="text-gray-400 text-xs truncate">
                                            {descripcionTipo(cancha.idTipoCancha)}
                                            {!cancha.activa && ' · Inactiva'}
                                        </p>
                                    </div>
                                </div>

                                {/* Bloque secundario: precio + horario + acciones */}
                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pl-5 sm:pl-0">
                                    <div className="flex items-center gap-5 sm:gap-8">
                                        <div className="text-left sm:text-right">
                                            <p className="text-gray-400 text-xs">Precio</p>
                                            <p className="text-blanco text-sm font-medium">
                                                ${Number(cancha.precioTurno).toLocaleString('es-AR')}/hr
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-gray-400 text-xs">Horario</p>
                                            <p className="text-blanco text-sm font-medium">
                                                {horaIni} - {horaFin}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        <button
                                            onClick={() => abrirEditar(cancha)}
                                            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-verde-claro transition"
                                            aria-label={`Editar ${cancha.nombre}`}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleEliminar(cancha)}
                                            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                                            aria-label={`Dar de baja ${cancha.nombre}`}
                                            title="Baja lógica (soft-delete)"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {mostrarTipoForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <form
                        onSubmit={handleCrearTipo}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="nuevo-tipo-titulo"
                        className="w-full max-w-md rounded-xl border border-white/10 bg-[#222222] p-6 shadow-2xl"
                    >
                        <h3
                            id="nuevo-tipo-titulo"
                            className="mb-4 text-lg font-semibold text-blanco"
                        >
                            Nuevo tipo de cancha
                        </h3>

                        <label
                            htmlFor="descripcion-tipo"
                            className="mb-1 block text-xs text-gray-400"
                        >
                            Descripción
                        </label>
                        <input
                            id="descripcion-tipo"
                            autoFocus
                            value={descripcionTipoNueva}
                            onChange={(e) => setDescripcionTipoNueva(e.target.value)}
                            placeholder="Ej.: Césped sintético"
                            className="w-full rounded-lg bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-verde-principal"
                        />

                        {errorTipo && (
                            <p role="alert" className="mt-2 text-sm text-red-300">
                                {errorTipo}
                            </p>
                        )}

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={guardandoTipo}
                                onClick={() => setMostrarTipoForm(false)}
                                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={guardandoTipo}
                                className="rounded-lg bg-verde-principal px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                                {guardandoTipo ? 'Guardando...' : 'Crear tipo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

// Convierte a "HH:MM" lo que manda el backend, un Date, o un "HH:MM:SS".
//
// El backend devuelve `horaInicio` / `horaFin` como ISO completo
// ("1970-01-01T08:30:00.000Z"), porque en Prisma son columnas `@db.Time`.
// Antes sólo se aceptaba un string que YA empiece con "HH:MM", así que con la
// respuesta de la API el match fallaba y la función devolvía "". Eso dejaba el
// listado sin horario y el formulario de edición con los dos campos vacíos:
// guardar sin recargar a mano las horas mandaba "" y el backend respondía
// 400 "El formato del horario no es válido".
function toHora(value) {
    if (!value) return '';
    if (typeof value === 'string') {
        // ISO: "1970-01-01T08:30:00.000Z"
        const iso = value.match(/T(\d{2}:\d{2})/);
        if (iso) return iso[1];
        // "08:30:00" o "08:30"
        const simple = value.match(/^(\d{2}:\d{2})/);
        return simple ? simple[1] : '';
    }
    if (value instanceof Date) {
        const hh = String(value.getUTCHours()).padStart(2, '0');
        const mm = String(value.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    // Si vino como ISO
    try {
        const d = new Date(value);
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    } catch {
        return '';
    }
}
