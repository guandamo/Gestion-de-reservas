import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ModalCambiarContrasena from '../components/ModalCambiarContrasena.jsx';

const EMPTY_PROFILE = { nombre: '', apellido: '', email: '', telefono: '' };

export default function Perfil() {
    const { updateUser } = useAuth();
    const [perfil, setPerfil] = useState(EMPTY_PROFILE);
    const [cargando, setCargando] = useState(true);
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [errorPerfil, setErrorPerfil] = useState('');
    const [mensajePerfil, setMensajePerfil] = useState('');
    const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);

    useEffect(() => {
        let vigente = true;

        async function cargarPerfil() {
            try {
                const data = await api.get('/auth/me');
                if (!vigente) return;
                setPerfil({
                    nombre: data.usuario.nombre ?? '',
                    apellido: data.usuario.apellido ?? '',
                    email: data.usuario.email ?? '',
                    telefono: data.usuario.telefono ?? '',
                });
            } catch (error) {
                if (vigente) setErrorPerfil(error.message || 'No se pudo cargar tu perfil.');
            } finally {
                if (vigente) setCargando(false);
            }
        }

        cargarPerfil();
        return () => { vigente = false; };
    }, []);

    const handlePerfilChange = (event) => {
        const { name, value } = event.target;
        setPerfil((actual) => ({ ...actual, [name]: value }));
    };

    const guardarPerfil = async (event) => {
        event.preventDefault();
        setErrorPerfil('');
        setMensajePerfil('');
        setGuardandoPerfil(true);

        try {
            const data = await api.patch('/auth/me', perfil);
            setPerfil({
                nombre: data.usuario.nombre ?? '',
                apellido: data.usuario.apellido ?? '',
                email: data.usuario.email ?? '',
                telefono: data.usuario.telefono ?? '',
            });
            updateUser(data.usuario);
            setMensajePerfil('Tus datos se actualizaron correctamente.');
        } catch (error) {
            setErrorPerfil(error.message || 'No se pudieron actualizar tus datos.');
        } finally {
            setGuardandoPerfil(false);
        }
    };

    if (cargando) {
        return <p className="text-gray-400">Cargando perfil...</p>;
    }

    return (
        <section className="max-w-3xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-blanco">Mi perfil</h2>
                <p className="mt-1 text-sm text-gray-400">Actualizá tus datos personales y tu contraseña.</p>
            </div>

            <form onSubmit={guardarPerfil} className="rounded-xl border border-white/10 bg-[#222222] p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-blanco">Datos personales</h3>
                        <p className="mt-1 text-sm text-gray-400">
                            Mantené tu información actualizada para que podamos contactarte.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setModalPasswordAbierto(true)}
                        className="self-start rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blanco transition hover:bg-white/10"
                    >
                        Cambiar contraseña
                    </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre" name="nombre" value={perfil.nombre} onChange={handlePerfilChange} required />
                    <Field label="Apellido" name="apellido" value={perfil.apellido} onChange={handlePerfilChange} required />
                    <Field label="Correo electrónico" name="email" type="email" value={perfil.email} onChange={handlePerfilChange} required />
                    <Field label="Teléfono" name="telefono" type="tel" value={perfil.telefono} onChange={handlePerfilChange} placeholder="Ej.: +5492211234567" />
                </div>

                {errorPerfil && <p className="mt-4 text-sm text-red-300">{errorPerfil}</p>}
                {mensajePerfil && <p className="mt-4 text-sm text-green-300">{mensajePerfil}</p>}

                <button type="submit" disabled={guardandoPerfil} className="mt-5 rounded-lg bg-verde-principal px-4 py-2 text-sm font-semibold text-blanco transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                    {guardandoPerfil ? 'Guardando...' : 'Guardar datos'}
                </button>
            </form>

            <ModalCambiarContrasena
                open={modalPasswordAbierto}
                onClose={() => setModalPasswordAbierto(false)}
            />
        </section>
    );
}

function Field({ label, name, type = 'text', ...props }) {
    return (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-200">
            {label}
            <input
                name={name}
                type={type}
                className="rounded-lg border border-white/10 bg-[#171717] px-3 py-2 text-blanco outline-none transition focus:border-verde-claro"
                {...props}
            />
        </label>
    );
}