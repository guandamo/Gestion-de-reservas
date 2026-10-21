import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, NetworkError, api } from '../api/client.js';
import ModalVerificacionEmail from '../components/ModalVerificacionEmail.jsx';
import ModalCambiarContrasena from '../components/ModalCambiarContrasena.jsx';

// --- validaciones en espejo del backend ---
function validarNombre(v) {
    const t = (v ?? '').trim();
    if (!t) return 'El nombre es obligatorio.';
    if (t.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (t.length > 50) return 'El nombre debe tener como máximo 50 caracteres.';
    return null;
}
function validarApellido(v) {
    const t = (v ?? '').trim();
    if (!t) return 'El apellido es obligatorio.';
    if (t.length < 2) return 'El apellido debe tener al menos 2 caracteres.';
    if (t.length > 50) return 'El apellido debe tener como máximo 50 caracteres.';
    return null;
}
function validarEmail(v) {
    const t = (v ?? '').trim();
    if (!t) return 'El email es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'El email no tiene un formato válido.';
    return null;
}
function validarPassword(v) {
    if (!v) return 'La contraseña es obligatoria.';
    if (v.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    return null;
}
function validarConfirm(v, password) {
    if (!v) return 'Por favor, confirmá tu contraseña.';
    if (v !== password) return 'Las contraseñas no coinciden.';
    return null;
}

/**
 * Normaliza el email para comparación (`trim()` + `lowercase()`).
 * Coherente con el backend (ver `loginUsuario.js`, `registerUsuario.js`,
 * `emailExiste.js`).
 */
function normalizarEmail(v) {
    return String(v ?? '').trim().toLowerCase();
}

/**
 * GET /api/auth/existe-email?email=...
 *
 * Devuelve `{ existe: boolean }`. Se usa antes de abrir el modal para
 * distinguir registro de recuperación.
 */
async function checkEmailExiste(email, signal) {
    const params = new URLSearchParams({ email: normalizarEmail(email) });
    return api.get(`/auth/existe-email?${params.toString()}`, { signal });
}

export default function Login() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Estado del modal OTP (contexto siempre "recuperacion" en Login).
    const [modalOpen, setModalOpen] = useState(false);
    const [modalEmail, setModalEmail] = useState('');

    // Estado del modal de cambio de contraseña simulado.
    const [cambioSimuladoOpen, setCambioSimuladoOpen] = useState(false);

    // Loading independiente del check de existencia para no bloquear el botón
    // "Ingresar" mientras se consulta el endpoint.
    const [checkingEmail, setCheckingEmail] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from;

    // Guard sincrónico: evita que dos submits rápidos (Enter repetido, doble
    // click) disparen dos requests en vuelo. El `disabled` del botón es
    // asíncrono (depende de un re-render), por lo que no alcanza por sí solo.
    const enCursoRef = useRef(false);
    // AbortController del request en curso; se cancela al reenviar el form.
    const controllerRef = useRef(null);
    // Idem para el check de existencia de email.
    const checkControllerRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (enCursoRef.current) {
            return;
        }

        setError('');

        if (!email || !password) {
            setError('Por favor, completá todos los campos.');
            return;
        }

        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        enCursoRef.current = true;
        setLoading(true);
        try {
            const user = await login(email.trim().toLowerCase(), password, {
                signal: controller.signal,
            });

            const destino =
                from && from !== '/login'
                    ? from
                    : user.rol === 'ADMIN'
                        ? '/admin'
                        : '/user';
            navigate(destino, { replace: true });
        } catch (err) {
            if (err?.name === 'AbortError') {
                return;
            }

            if (err instanceof NetworkError) {
                setError(
                    'No pudimos contactar al servidor. Revisá tu conexión e intentá de nuevo.',
                );
            } else if (err instanceof ApiError && err.status === 401) {
                setError('Correo o contraseña incorrectos.');
            } else if (err instanceof ApiError && err.status >= 500) {
                setError('El servidor tuvo un problema. Intentá de nuevo en unos minutos.');
            } else if (err instanceof ApiError && err.status >= 400) {
                setError(err?.message || 'Revisá los datos ingresados.');
            } else {
                setError(err?.message || 'No se pudo iniciar sesión.');
            }
        } finally {
            enCursoRef.current = false;
            setLoading(false);
            if (controllerRef.current === controller) {
                controllerRef.current = null;
            }
        }
    };

    // Si el componente se desmonta a mitad de un request, lo cancelamos
    // para no actualizar estado de un componente inexistente.
    useEffect(() => {
        return () => {
            controllerRef.current?.abort();
            checkControllerRef.current?.abort();
        };
    }, []);

    /**
     * "Olvidé mi contraseña" desde el formulario de login (mobile y desktop).
     *
     * Distingue tres casos según lo que el usuario haya tipeado:
     *  1. Campo vacío → mensaje "por favor, ingresá un correo para continuar."
     *  2. Formato inválido → mensaje "el correo ingresado no tiene un formato
     *     válido."
     *  3. Formato OK → consulta `/api/auth/existe-email`; si existe, abre el
     *     modal OTP en contexto "recuperacion"; si no, muestra el mensaje
     *     correspondiente y NO abre el modal.
     *
     * Mientras se hace la consulta se bloquea el botón para evitar
     * solicitudes duplicadas (Enter repetido / doble click).
     */
    const handleOlvideContrasena = async () => {
        setError('');

        // Caso 1: campo vacío. `validarEmail` devolvería "El email es
        // obligatorio", pero acá queremos un mensaje específico del flujo.
        if (!email || !email.trim()) {
            setError('Por favor, ingresá un correo para continuar.');
            return;
        }

        // Caso 2: formato inválido.
        const formatoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
        if (!formatoValido) {
            setError('El correo ingresado no tiene un formato válido.');
            return;
        }

        // Evitar duplicar la consulta: si ya hay una en curso, ignoramos.
        if (checkControllerRef.current) {
            return;
        }
        const controller = new AbortController();
        checkControllerRef.current = controller;

        setCheckingEmail(true);
        try {
            const { existe } = await checkEmailExiste(email, controller.signal);
            if (controller.signal.aborted) return;

            if (!existe) {
                setError(
                    'No encontramos una cuenta registrada con ese correo electrónico.',
                );
                return;
            }
            // Caso 3 OK: abrimos el modal OTP reutilizable.
            setModalEmail(normalizarEmail(email));
            setModalOpen(true);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            if (err instanceof ApiError && err.status >= 400) {
                setError(
                    err.message ||
                        'No pudimos verificar tu correo. Intentá de nuevo en unos minutos.',
                );
            } else if (err instanceof NetworkError) {
                setError(
                    'No pudimos verificar tu correo. Revisá tu conexión e intentá de nuevo.',
                );
            } else {
                setError(
                    err?.message || 'No pudimos verificar tu correo.',
                );
            }
        } finally {
            if (checkControllerRef.current === controller) {
                checkControllerRef.current = null;
            }
            setCheckingEmail(false);
        }
    };

    /**
     * "Continuar" en el modal OTP (contexto recuperación):
     *  - Cierra el OTP.
     *  - Abre `ModalCambiarContrasena` en modo simulación (sin PATCH real).
     *  - No navega a ninguna ruta.
     */
    const handleContinuarOtpRecuperacion = () => {
        setModalOpen(false);
        setCambioSimuladoOpen(true);
    };

    /**
     * Al cerrar el modal de cambio de contraseña (botón "Volver al login",
     * "Cancelar" o backdrop), regresamos al login.
     *
     * El mensaje de éxito se muestra DENTRO del propio modal de cambio de
     * contraseña (`ModalCambiarContrasena`), no en esta pantalla.
     */
    const handleCerrarCambioSimulado = () => {
        setCambioSimuladoOpen(false);
        // Por seguridad visual borramos la contraseña que el usuario
        // pudo haber tipeado pero nunca se guardó en la simulación.
        setPassword('');
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError('');
        setEmail('');
        setPassword('');
    };

    if (!isLoginView) {
        return (
            <RegisterView
                onSwitchToLogin={toggleView}
                navigate={navigate}
            />
        );
    }

    return (
        <>
            {/* ───── MOBILE (<lg): prototipo Image 4 ───── */}
            <div className="lg:hidden min-h-screen bg-gris-fondo flex flex-col font-sans animate-fadeIn">
                {/* Header verde con pelota */}
                <div className="bg-verde-principal px-6 pt-10 pb-14 flex flex-col items-center text-blanco rounded-b-[2.5rem] shadow-lg">
                    <div className="bg-blanco/15 p-4 rounded-full mb-5">
                        ⚽
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide">Gestión de canchas</h1>
                </div>

                {/* Card oscura con el form */}
                <div className="flex-1 px-5 -mt-8">
                    <div className="bg-[#222222] rounded-2xl border border-white/5 shadow-2xl p-6">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <label className="block text-sm font-medium text-gray-200">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@email.com"
                                    autoComplete="email"
                                    className="w-full bg-white text-black rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                />
                            </div>

                            <label className="block text-sm font-medium text-gray-200">
                                Contraseña
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-white text-black rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="text-sm text-verde-claro hover:text-blanco transition font-medium disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                    onClick={handleOlvideContrasena}
                                    disabled={loading || checkingEmail}
                                    aria-busy={checkingEmail}
                                >
                                    {checkingEmail && (
                                        <span
                                            className="inline-block w-3.5 h-3.5 border-2 border-verde-claro/40 border-t-verde-claro rounded-full animate-spin"
                                            aria-hidden="true"
                                        />
                                    )}
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-verde-principal text-blanco font-bold text-lg py-3 rounded-lg mt-1 hover:brightness-110 transition disabled:opacity-60 shadow-md"
                            >
                                {loading ? 'Ingresando...' : 'Ingresar'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer: ¿no tenés cuenta? */}
                <div className="text-center mt-6 mb-6 text-sm px-4">
                    <span className="text-gray-400">¿No tenés cuenta?</span>
                    <button
                        type="button"
                        onClick={toggleView}
                        className="text-verde-claro hover:text-blanco ml-1 font-bold transition"
                    >
                        Registrate
                    </button>
                </div>
            </div>

            {/* ───── DESKTOP (≥lg): split original intacto ───── */}
            <div className="hidden lg:flex min-h-screen font-sans animate-fadeIn">

                {/* MITAD IZQUIERDA: Verde con Título */}
                <div className="w-1/2 bg-verde-principal flex-col justify-center items-center p-12 hidden lg:flex">
                    <h1 className="text-6xl font-bold text-white mb-6 text-center leading-tight">
                        Gestión de <br /> Canchas
                    </h1>
                    <div className="w-16 h-1 bg-white rounded"></div>
                </div>

                {/* MITAD DERECHA: Formulario Oscuro */}
                <div className="w-full lg:w-1/2 bg-[#222222] flex justify-center items-center p-8">
                    <div className="w-full max-w-md">

                        <h2 className="text-4xl font-bold text-white mb-2">Bienvenido</h2>
                        <p className="text-gray-400 mb-6 text-sm">Ingresá a tu cuenta para continuar</p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                            {/* EMAIL */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">Correo electrónico</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="usuario@email.com"
                                        autoComplete="email"
                                        className="w-full bg-white text-black rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                    />
                                </div>
                            </div>

                            {/* CONTRASEÑA */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">Contraseña</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="w-full bg-white text-black rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleOlvideContrasena}
                                    disabled={loading || checkingEmail}
                                    aria-busy={checkingEmail}
                                    className="text-sm text-verde-claro hover:text-blanco transition font-medium disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                >
                                    {checkingEmail && (
                                        <span
                                            className="inline-block w-3.5 h-3.5 border-2 border-verde-claro/40 border-t-verde-claro rounded-full animate-spin"
                                            aria-hidden="true"
                                        />
                                    )}
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center mt-2">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-black font-bold text-lg py-3 rounded-lg mt-4 hover:bg-gray-200 transition disabled:opacity-60"
                            >
                                {loading ? 'Ingresando...' : 'Ingresar'}
                            </button>
                        </form>

                        {/* Toggle para cambiar entre Login y Registro */}
                        <div className="text-center mt-8 text-sm">
                            <span className="text-gray-400">¿No tenés cuenta?</span>
                            <button
                                type="button"
                                onClick={toggleView}
                                className="text-verde-claro hover:text-white ml-1 font-medium transition"
                            >
                                Registrate
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Modal OTP — siempre en contexto recuperación desde Login. */}
            <ModalVerificacionEmail
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onContinuar={handleContinuarOtpRecuperacion}
                email={modalEmail}
                contexto="recuperacion"
            />

            {/* Modal de cambio de contraseña simulado (sin PATCH real).
                El modal muestra el mensaje de éxito por sí solo; este
                componente solo gestiona abrir / cerrar y limpiar la
                contraseña escrita en el login. */}
            <ModalCambiarContrasena
                open={cambioSimuladoOpen}
                onClose={handleCerrarCambioSimulado}
                simulacion
            />
        </>
    );
}

// ============================================================
// Registro
// ============================================================
function RegisterView({ onSwitchToLogin, navigate }) {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const checkControllerRef = useRef(null);

    const validarTodo = () => {
        const next = {
            nombre: validarNombre(nombre),
            apellido: validarApellido(apellido),
            email: validarEmail(email),
            password: validarPassword(password),
            confirmPassword: validarConfirm(confirmPassword, password),
        };
        setErrors(next);
        return Object.values(next).every((e) => !e);
    };

    /**
     * El registro valida el form, consulta si el email existe, y si NO existe
     * abre el modal de simulación. La cuenta nunca se crea (lo hará el flujo
     * OTP real cuando se integre). Esto preserva el sistema de auth actual.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (!validarTodo()) return;

        // Anti-duplicado: si ya hay una consulta en vuelo, ignoramos el
        // segundo submit (Enter repetido / doble click).
        if (checkControllerRef.current) {
            return;
        }
        const controller = new AbortController();
        checkControllerRef.current = controller;

        try {
            setLoading(true);
            const { existe } = await checkEmailExiste(email, controller.signal);
            if (controller.signal.aborted) return;

            if (existe) {
                setServerError(
                    'Ya existe una cuenta registrada con ese correo electrónico.',
                );
                return;
            }
            setModalOpen(true);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            if (err instanceof NetworkError) {
                setServerError(
                    'No pudimos verificar tu correo. Revisá tu conexión e intentá de nuevo.',
                );
            } else if (err instanceof ApiError && err.status >= 400) {
                setServerError(
                    err.message ||
                        'No pudimos validar el formulario. Intentá de nuevo en unos minutos.',
                );
            } else {
                setServerError(
                    err?.message || 'No pudimos validar el formulario.',
                );
            }
        } finally {
            setLoading(false);
            if (checkControllerRef.current === controller) {
                checkControllerRef.current = null;
            }
        }
    };

    const handleContinuarModal = () => {
        setModalOpen(false);
        // Cierra la demo del registro sin crear cuenta y sin tocar sesión.
        navigate('/login', { replace: true });
    };

    useEffect(
        () => () => checkControllerRef.current?.abort(),
        [],
    );

    // Para que el botón se habilite solo cuando no hay errores visibles
    const hayErroresVisibles =
        !!errors.nombre ||
        !!errors.apellido ||
        !!errors.email ||
        !!errors.password ||
        !!errors.confirmPassword;

    return (
        <>
            {/* ───── MOBILE (<lg): prototipo Image 4 (registro) ───── */}
            <div className="lg:hidden min-h-screen bg-gris-fondo flex flex-col font-sans animate-fadeIn">
                {/* Header verde con pelota */}
                <div className="bg-verde-principal px-6 pt-10 pb-14 flex flex-col items-center text-blanco rounded-b-[2.5rem] shadow-lg">
                    <div className="bg-blanco/15 p-4 rounded-full mb-5">⚽</div>
                    <h1 className="text-2xl font-bold tracking-wide">Creá tu cuenta</h1>
                </div>

                <div className="flex-1 px-5 -mt-8 pb-8">
                    <div className="bg-[#222222] rounded-2xl border border-white/5 shadow-2xl p-6 space-y-4">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                            <CampoTextoMobile label="Nombre" value={nombre} onChange={setNombre} error={errors.nombre} placeholder="Juan" autoComplete="given-name" />
                            <CampoTextoMobile label="Apellido" value={apellido} onChange={setApellido} error={errors.apellido} placeholder="Pérez" autoComplete="family-name" />
                            <CampoTextoMobile label="Correo electrónico" type="email" value={email} onChange={setEmail} error={errors.email} placeholder="usuario@email.com" autoComplete="email" />
                            <CampoTextoMobile label="Contraseña" type="password" value={password} onChange={setPassword} error={errors.password} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                            <CampoTextoMobile label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirmPassword} placeholder="Repetí tu contraseña" autoComplete="new-password" />

                            {serverError && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center mt-1">
                                    {serverError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || hayErroresVisibles}
                                className="w-full bg-verde-principal text-blanco font-bold text-lg py-3 rounded-lg mt-1 hover:brightness-110 transition disabled:opacity-60 shadow-md"
                            >
                                {loading ? 'Verificando...' : 'Crear cuenta'}
                            </button>

                            <button
                                type="button"
                                onClick={onSwitchToLogin}
                                className="text-center text-sm text-verde-claro hover:text-blanco mt-1 transition font-medium"
                            >
                                ← Ya tengo cuenta, volver al login
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* ───── DESKTOP (≥lg): split original intacto ───── */}
            <div className="hidden lg:flex min-h-screen font-sans animate-fadeIn">
                {/* MITAD IZQUIERDA */}
                <div className="w-1/2 bg-verde-principal flex-col justify-center items-center p-12 hidden lg:flex">
                    <h1 className="text-6xl font-bold text-white mb-6 text-center leading-tight">
                        Creá tu <br /> cuenta
                    </h1>
                    <div className="w-16 h-1 bg-white rounded"></div>
                </div>

                {/* MITAD DERECHA */}
                <div className="w-full lg:w-1/2 bg-[#222222] flex justify-center items-center p-8">
                    <div className="w-full max-w-md">
                        <h2 className="text-4xl font-bold text-white mb-2">Crear Cuenta</h2>
                        <p className="text-gray-400 mb-6 text-sm">
                            Completá tus datos para registrarte
                        </p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                            <CampoTexto
                                label="Nombre"
                                value={nombre}
                                onChange={setNombre}
                                error={errors.nombre}
                                placeholder="Juan"
                                autoComplete="given-name"
                            />
                            <CampoTexto
                                label="Apellido"
                                value={apellido}
                                onChange={setApellido}
                                error={errors.apellido}
                                placeholder="Pérez"
                                autoComplete="family-name"
                            />
                            <CampoTexto
                                label="Correo electrónico"
                                type="email"
                                value={email}
                                onChange={setEmail}
                                error={errors.email}
                                placeholder="usuario@email.com"
                                autoComplete="email"
                            />
                            <CampoTexto
                                label="Contraseña"
                                type="password"
                                value={password}
                                onChange={setPassword}
                                error={errors.password}
                                placeholder="Mínimo 8 caracteres"
                                autoComplete="new-password"
                            />
                            <CampoTexto
                                label="Confirmar contraseña"
                                type="password"
                                value={confirmPassword}
                                onChange={setConfirmPassword}
                                error={errors.confirmPassword}
                                placeholder="Repetí tu contraseña"
                                autoComplete="new-password"
                            />

                            {serverError && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center mt-1">
                                    {serverError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || hayErroresVisibles}
                                className="w-full bg-white text-black font-bold text-lg py-3 rounded-lg mt-2 hover:bg-gray-200 transition disabled:opacity-60"
                            >
                                {loading ? 'Verificando...' : 'Crear cuenta'}
                            </button>

                            <button
                                type="button"
                                onClick={onSwitchToLogin}
                                className="text-center text-sm text-verde-claro hover:text-white mt-2 transition"
                            >
                                ← Ya tengo cuenta, volver al login
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal OTP (contexto registro). Mismo componente reutilizable. */}
            <ModalVerificacionEmail
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onContinuar={handleContinuarModal}
                email={email}
                contexto="registro"
            />
        </>
    );
}

// Campo de texto con estilo mobile-first (input blanco/negro sobre card oscura)
function CampoTextoMobile({ label, value, onChange, error, type = 'text', placeholder, autoComplete }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className={`w-full bg-white text-black rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 border ${
                    error
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-transparent focus:ring-verde-principal'
                }`}
            />
            {error && (
                <p className="text-red-300 text-xs mt-1">{error}</p>
            )}
        </div>
    );
}

// Campo de texto reutilizable, con ícono y mensaje de error debajo (DESKTOP)
function CampoTexto({ label, value, onChange, error, type = 'text', placeholder, autoComplete }) {
    return (
        <div>
            <label className="block text-sm font-medium text-white mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className={`w-full bg-white text-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border ${
                    error
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-transparent focus:ring-verde-principal'
                }`}
            />
            {error && (
                <p className="text-red-400 text-xs mt-1">{error}</p>
            )}
        </div>
    );
}
