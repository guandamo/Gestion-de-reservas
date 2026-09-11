import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

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
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

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
        setMostrarForm(true);
    };

    const abrirEditar = (cancha) => {
        setEditandoId(cancha.id);
        setForm({
            nombre: cancha.nombre,
            idTipoCancha: String(cancha.idTipoCancha),
            precioTurno: Number(cancha.precioTurno),
            horaInicio: toHora(cancha.horaInicio),
            horaFin: toHora(cancha.horaFin),
            activa: cancha.activa,
        });
        setMostrarForm(true);
    };

    const cerrarForm = () => {
        setMostrarForm(false);
        setEditandoId(null);
        setForm(formVacio);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!form.nombre || !form.idTipoCancha || !form.precioTurno) {
            alert('Completá nombre, tipo de cancha y precio.');
            return;
        }

        const payload = {
            nombre: form.nombre,
            idTipoCancha: Number(form.idTipoCancha),
            precioTurno: Number(form.precioTurno),
            horaInicio: form.horaInicio,
            horaFin: form.horaFin,
            activa: form.activa,
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
        } catch (e2) {
            alert(e2.message || 'No se pudo guardar la cancha.');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (cancha) => {
        if (!window.confirm(`¿Dar de baja "${cancha.nombre}"? Quedará inactiva hasta reactivarla.`))
            return;
        try {
            await api.patch(`/courts/${cancha.id}`, {
                nombre: cancha.nombre,
                idTipoCancha: cancha.idTipoCancha,
                precioTurno: Number(cancha.precioTurno),
                horaInicio: toHora(cancha.horaInicio),
                horaFin: toHora(cancha.horaFin),
                activa: false,
            });
            await cargar();
        } catch (e) {
            alert(e.message || 'No se pudo dar de baja la cancha.');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
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
                        <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            placeholder="Cancha 5"
                            className="w-full bg-white text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-principal"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Tipo de cancha</label>
                        <select
                            value={form.idTipoCancha}
                            onChange={(e) => setForm({ ...form, idTipoCancha: e.target.value })}
                            className="w-full bg-white text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-principal"
                        >
                            <option value="">Seleccionar...</option>
                            {tiposCancha.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.descripcion}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Precio por hora ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={form.precioTurno}
                            onChange={(e) => setForm({ ...form, precioTurno: e.target.value })}
                            placeholder="3000"
                            className="w-full bg-white text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-principal"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Hora inicio</label>
                        <input
                            type="time"
                            value={form.horaInicio}
                            onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                            className="w-full bg-white text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-principal"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Hora fin</label>
                        <input
                            type="time"
                            value={form.horaFin}
                            onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                            className="w-full bg-white text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-principal"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Estado</label>
                        <select
                            value={form.activa ? 'activa' : 'inactiva'}
                            onChange={(e) => setForm({ ...form, activa: e.target.value === 'activa' })}
                            className="w-full bg-white text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-verde-principal"
                        >
                            <option value="activa">Activa</option>
                            <option value="inactiva">Inactiva</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={cerrarForm}
                            className="text-sm text-gray-300 hover:text-blanco px-4 py-2 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="bg-verde-principal hover:bg-verde-principal/90 text-blanco text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-60"
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
                                className="bg-[#222222] rounded-xl border border-white/5 px-5 py-4 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-2.5 h-2.5 rounded-full ${cancha.activa ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    <div>
                                        <p className="text-blanco font-medium">{cancha.nombre}</p>
                                        <p className="text-gray-400 text-xs">
                                            {descripcionTipo(cancha.idTipoCancha)}
                                            {!cancha.activa && ' · Inactiva'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-gray-400 text-xs">Precio</p>
                                        <p className="text-blanco text-sm font-medium">
                                            ${Number(cancha.precioTurno).toLocaleString('es-AR')}/hr
                                        </p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-gray-400 text-xs">Horario</p>
                                        <p className="text-blanco text-sm font-medium">
                                            {horaIni} - {horaFin}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => abrirEditar(cancha)}
                                            className="text-gray-300 hover:text-verde-claro transition"
                                            aria-label={`Editar ${cancha.nombre}`}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleEliminar(cancha)}
                                            className="text-red-400 hover:text-red-300 transition"
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
        </div>
    );
}

// Convierte "HH:MM:SS" o Date a "HH:MM"
function toHora(value) {
    if (!value) return '';
    if (typeof value === 'string') {
        const m = value.match(/^(\d{2}:\d{2})/);
        return m ? m[1] : '';
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
