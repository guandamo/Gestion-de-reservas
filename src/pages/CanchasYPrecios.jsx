import React, { useState } from 'react';

// --- Corresponde a la tabla TipoCancha (idTipoCancha PK, descripcion) ---
// TODO: reemplazar por GET /tipos-cancha cuando esté el backend
const mockTiposCancha = [
    { idTipoCancha: 1, descripcion: 'Fútbol 5' },
    { idTipoCancha: 2, descripcion: 'Fútbol 7' },
    { idTipoCancha: 3, descripcion: 'Fútbol 11' },
];

// --- Corresponde a la tabla Cancha (idCancha PK, idTipoCancha FK, nombre, Activa) ---
// Nota: precio y horario NO están acá en el modelo real — viven en Turno.
// TODO: reemplazar por GET /canchas cuando esté el backend
const mockCanchas = [
    { idCancha: 1, idTipoCancha: 3, nombre: 'Cancha 1', activa: true },
    { idCancha: 2, idTipoCancha: 2, nombre: 'Cancha 2', activa: true },
    { idCancha: 3, idTipoCancha: 1, nombre: 'Cancha 3', activa: true },
    { idCancha: 4, idTipoCancha: 1, nombre: 'Cancha 4', activa: false },
];

// --- Valores "base" por cancha, usados para generar los Turno de esa cancha ---
// En el modelo real, PrecioHora/HoraInicio/HoraFin están en cada Turno individual
// (cada franja horaria puede tener su propio precio/estado). Esto es solo el
// default que se usa al crear los turnos de una cancha, no un campo de Cancha.
// TODO: cuando haya backend, esto se resuelve con un endpoint tipo
// POST /canchas/:id/turnos/generar { precioHora, horaInicio, horaFin }
const mockConfigTurnos = {
    1: { precioHora: 4500, horaInicio: '08:00', horaFin: '23:00' },
    2: { precioHora: 3200, horaInicio: '08:00', horaFin: '22:00' },
    3: { precioHora: 2800, horaInicio: '08:00', horaFin: '22:00' },
    4: { precioHora: 2800, horaInicio: '08:00', horaFin: '22:00' },
};

const formVacio = { nombre: '', idTipoCancha: '', precioHora: '', horaInicio: '08:00', horaFin: '22:00', activa: true };

export default function CanchasYPrecios() {
    const [tiposCancha] = useState(mockTiposCancha);
    const [canchas, setCanchas] = useState(mockCanchas);
    const [configTurnos, setConfigTurnos] = useState(mockConfigTurnos);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(formVacio);

    const descripcionTipo = (idTipoCancha) =>
        tiposCancha.find((t) => t.idTipoCancha === Number(idTipoCancha))?.descripcion || '—';

    const abrirNueva = () => {
        setEditandoId(null);
        setForm(formVacio);
        setMostrarForm(true);
    };

    const abrirEditar = (cancha) => {
        const config = configTurnos[cancha.idCancha] || {};
        setEditandoId(cancha.idCancha);
        setForm({
            nombre: cancha.nombre,
            idTipoCancha: cancha.idTipoCancha,
            precioHora: config.precioHora ?? '',
            horaInicio: config.horaInicio ?? '08:00',
            horaFin: config.horaFin ?? '22:00',
            activa: cancha.activa,
        });
        setMostrarForm(true);
    };

    const cerrarForm = () => {
        setMostrarForm(false);
        setEditandoId(null);
        setForm(formVacio);
    };

    const handleGuardar = (e) => {
        e.preventDefault();

        if (!form.nombre || !form.idTipoCancha || !form.precioHora) {
            alert('Completá nombre, tipo de cancha y precio.');
            return;
        }

        const idTipoCancha = Number(form.idTipoCancha);

        if (editandoId) {
            // TODO: PUT /canchas/:id (nombre, idTipoCancha, Activa)
            setCanchas((prev) =>
                prev.map((c) =>
                    c.idCancha === editandoId ? { ...c, nombre: form.nombre, idTipoCancha, activa: form.activa } : c
                )
            );
            // TODO: PUT /canchas/:id/turnos/config (precioHora, horaInicio, horaFin)
            setConfigTurnos((prev) => ({
                ...prev,
                [editandoId]: { precioHora: Number(form.precioHora), horaInicio: form.horaInicio, horaFin: form.horaFin },
            }));
        } else {
            // TODO: POST /canchas (nombre, idTipoCancha, Activa)
            const nuevoId = Math.max(0, ...canchas.map((c) => c.idCancha)) + 1;
            setCanchas((prev) => [...prev, { idCancha: nuevoId, nombre: form.nombre, idTipoCancha, activa: form.activa }]);
            // TODO: POST /canchas/:id/turnos/generar (precioHora, horaInicio, horaFin)
            setConfigTurnos((prev) => ({
                ...prev,
                [nuevoId]: { precioHora: Number(form.precioHora), horaInicio: form.horaInicio, horaFin: form.horaFin },
            }));
        }

        cerrarForm();
    };

    const handleEliminar = (idCancha) => {
        const cancha = canchas.find((c) => c.idCancha === idCancha);
        if (!window.confirm(`¿Eliminar "${cancha?.nombre}"? Esta acción no se puede deshacer.`)) return;

        // TODO: DELETE /canchas/:id (probablemente soft-delete, según el patrón "eliminado" de otras tablas)
        setCanchas((prev) => prev.filter((c) => c.idCancha !== idCancha));
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
                                <option key={t.idTipoCancha} value={t.idTipoCancha}>
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
                            value={form.precioHora}
                            onChange={(e) => setForm({ ...form, precioHora: e.target.value })}
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
                            className="bg-verde-principal hover:bg-verde-principal/90 text-blanco text-sm font-medium px-5 py-2 rounded-lg transition"
                        >
                            {editandoId ? 'Guardar cambios' : 'Crear cancha'}
                        </button>
                    </div>
                </form>
            )}

            <div className="flex flex-col gap-3">
                {canchas.map((cancha) => {
                    const config = configTurnos[cancha.idCancha] || {};
                    return (
                        <div
                            key={cancha.idCancha}
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
                                        {config.precioHora ? `$${config.precioHora.toLocaleString('es-AR')}/hr` : '—'}
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-gray-400 text-xs">Horario</p>
                                    <p className="text-blanco text-sm font-medium">
                                        {config.horaInicio && config.horaFin ? `${config.horaInicio} - ${config.horaFin}` : '—'}
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
                                        onClick={() => handleEliminar(cancha.idCancha)}
                                        className="text-red-400 hover:text-red-300 transition"
                                        aria-label={`Eliminar ${cancha.nombre}`}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {canchas.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No hay canchas cargadas todavía.</p>
                )}
            </div>
        </div>
    );
}