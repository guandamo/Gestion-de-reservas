import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, NetworkError, api } from '../api/client.js';
import { INICIO_POR_ROL, rolPuedeVer } from '../lib/rutas.js';
import ModalVerificacionEmail from '../components/ModalVerificacionEmail.jsx';
import ModalCambiarContrasena from '../components/ModalCambiarContrasena.jsx';
import AppIcon from '../components/AppIcon.jsx';

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
// Espeja la normalización del backend (`registerUsuario.validarTelefono`):
// se aceptan espacios, guiones y paréntesis, pero el valor final tiene que ser
// de 7 a 15 dígitos con un `+` inicial opcional.
function validarTelefono(v) {
    const t = String(v ?? '').trim().replace(/[\s()-]/g, '');
    if (!t) return 'El teléfono es obligatorio.';
    if (!/^\+?[0-9]{7,15}$/.test(t)) return 'Ingresá entre 7 y 15 dígitos.';
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


function normalizarEmail(v) {
    return String(v ?? '').trim().toLowerCase();
}


function destinoTrasLogin(from, rol) {
    const inicio = INICIO_POR_ROL[rol] ?? '/user';

    if (
        typeof from !== 'string' ||
        from === '' ||
        from === '/login' ||
        from === '/'
    ) {
        return inicio;
    }

    return rolPuedeVer(rol, from) ? from : inicio;
}
async function checkEmailExiste(email, signal) {
    const params = new URLSearchParams({ email: normalizarEmail(email) });
    return api.get(`/auth/existe-email?${params.toString()}`, { signal });
}

export default function Login() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalEmail, setModalEmail] = useState('');

    const [cambioSimuladoOpen, setCambioSimuladoOpen] = useState(false);

    const [checkingEmail, setCheckingEmail] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from;

    const enCursoRef = useRef(false);
    const controllerRef = useRef(null);
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

            const destino = destinoTrasLogin(from, user.rol);
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

    useEffect(() => {
        return () => {
            controllerRef.current?.abort();
            checkControllerRef.current?.abort();
        };
    }, []);


    const handleOlvideContrasena = async () => {
        setError('');

        if (!email || !email.trim()) {
            setError('Por favor, ingresá un correo para continuar.');
            return;
        }

        const formatoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
        if (!formatoValido) {
            setError('El correo ingresado no tiene un formato válido.');
            return;
        }

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
    const handleContinuarOtpRecuperacion = () => {
        setModalOpen(false);
        setCambioSimuladoOpen(true);
    };


    const handleCerrarCambioSimulado = () => {
        setMostrarPassword(false);
        setCambioSimuladoOpen(false);
        setPassword('');
    };

    const toggleView = () => {
        setMostrarPassword(false);
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

            <div className="lg:hidden min-h-screen bg-gris-fondo flex flex-col font-sans animate-fadeIn">

                <div className="bg-verde-principal px-6 pt-10 pb-14 flex flex-col items-center text-blanco rounded-b-[2.5rem] shadow-lg">
                    <div className="bg-blanco/15 p-4 rounded-full mb-5">
                        ⚽
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide">Gestión de canchas</h1>
                </div>

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

                            <label htmlFor="login-password-mobile" className="block text-sm font-medium text-gray-200">
                                Contraseña
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                </span>
                                <input
                                    id="login-password-mobile"
                                    type={mostrarPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-white text-black rounded-lg pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                />
                                <PasswordVisibilityButton visible={mostrarPassword} onToggle={() => setMostrarPassword((value) => !value)} inputId="login-password-mobile" />
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


            <div className="hidden lg:flex min-h-screen font-sans animate-fadeIn">


                <div className="w-1/2 bg-verde-principal flex-col justify-center items-center p-12 hidden lg:flex">
                    <h1 className="text-6xl font-bold text-white mb-6 text-center leading-tight">
                        Gestión de <br /> Canchas
                    </h1>
                    <div className="w-16 h-1 bg-white rounded"></div>
                </div>


                <div className="w-full lg:w-1/2 bg-[#222222] flex justify-center items-center p-8">
                    <div className="w-full max-w-md">

                        <h2 className="text-4xl font-bold text-white mb-2">Bienvenido</h2>
                        <p className="text-gray-400 mb-6 text-sm">Ingresá a tu cuenta para continuar</p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">


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


                            <div>
                                <label htmlFor="login-password-desktop" className="block text-sm font-medium text-white mb-2">Contraseña</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                        </svg>
                                    </span>
                                    <input
                                        id="login-password-desktop"
                                        type={mostrarPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="w-full bg-white text-black rounded-lg pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                    />
                                    <PasswordVisibilityButton visible={mostrarPassword} onToggle={() => setMostrarPassword((value) => !value)} inputId="login-password-desktop" />
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


            <ModalVerificacionEmail
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onContinuar={handleContinuarOtpRecuperacion}
                email={modalEmail}
                contexto="recuperacion"
            />


            <ModalCambiarContrasena
                open={cambioSimuladoOpen}
                onClose={handleCerrarCambioSimulado}
                simulacion
            />
        </>
    );
}

function PasswordVisibilityButton({ visible, onToggle, inputId }) {
    return (
        <button type="button" onClick={onToggle}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-controls={inputId} aria-pressed={visible}
            title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:text-verde-principal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde-principal">
            <AppIcon name={visible ? 'eye-off' : 'eye'} />
        </button>
    );
}


function RegisterView({ onSwitchToLogin, navigate }) {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const checkControllerRef = useRef(null);
    const registerControllerRef = useRef(null);

    const { register } = useAuth();

    const validarTodo = () => {
        const next = {
            nombre: validarNombre(nombre),
            apellido: validarApellido(apellido),
            email: validarEmail(email),
            telefono: validarTelefono(telefono),
            password: validarPassword(password),
            confirmPassword: validarConfirm(confirmPassword, password),
        };
        setErrors(next);
        return Object.values(next).every((e) => !e);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (!validarTodo()) return;

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
            setModalError('');
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
    const handleContinuarModal = async () => {
        if (registerControllerRef.current) return;

        registerControllerRef.current?.abort();
        const controller = new AbortController();
        registerControllerRef.current = controller;

        setModalError('');
        setModalLoading(true);
        try {
            const usuario = await register(
                {
                    nombre,
                    apellido,
                    email,
                    telefono,
                    password,
                    confirmPassword,
                },
                { signal: controller.signal },
            );

            if (controller.signal.aborted) return;


            const destino =
                usuario.rol === 'ADMIN' ? '/admin' : '/user/reservar';
            navigate(destino, { replace: true });
        } catch (err) {
            if (err?.name === 'AbortError') return;
            if (err instanceof NetworkError) {
                setModalError(
                    'No pudimos crear tu cuenta. Revisá tu conexión e intentá de nuevo.',
                );
            } else if (err instanceof ApiError && err.status === 409) {
                setModalError(
                    'Ese correo ya fue registrado mientras completabas el código. Volvé a iniciar sesión.',
                );
            } else if (err instanceof ApiError && err.status >= 400) {
                setModalError(
                    err.message ||
                    'No pudimos crear tu cuenta. Revisá los datos e intentá de nuevo.',
                );
            } else {
                setModalError(
                    err?.message ||
                    'No pudimos crear tu cuenta. Intentá de nuevo en unos minutos.',
                );
            }
        } finally {
            if (registerControllerRef.current === controller) {
                registerControllerRef.current = null;
            }
            setModalLoading(false);
        }
    };

    const handleCerrarModal = () => {
        registerControllerRef.current?.abort();
        registerControllerRef.current = null;
        setModalError('');
        setModalLoading(false);
        setModalOpen(false);
    };

    useEffect(
        () => () => {
            checkControllerRef.current?.abort();
            registerControllerRef.current?.abort();
        },
        [],
    );


    const hayErroresVisibles =
        !!errors.nombre ||
        !!errors.apellido ||
        !!errors.email ||
        !!errors.telefono ||
        !!errors.password ||
        !!errors.confirmPassword;

    return (
        <>

            <div className="lg:hidden min-h-screen bg-gris-fondo flex flex-col font-sans animate-fadeIn">

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
                            <CampoTextoMobile label="Teléfono" type="tel" value={telefono} onChange={setTelefono} error={errors.telefono} placeholder="Ej.: +54 9 221 1234567" autoComplete="tel" />
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


            <div className="hidden lg:flex min-h-screen font-sans animate-fadeIn">

                <div className="w-1/2 bg-verde-principal flex-col justify-center items-center p-12 hidden lg:flex">
                    <h1 className="text-6xl font-bold text-white mb-6 text-center leading-tight">
                        Creá tu <br /> cuenta
                    </h1>
                    <div className="w-16 h-1 bg-white rounded"></div>
                </div>


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
                                label="Teléfono"
                                type="tel"
                                value={telefono}
                                onChange={setTelefono}
                                error={errors.telefono}
                                placeholder="Ej.: +54 9 221 1234567"
                                autoComplete="tel"
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


            <ModalVerificacionEmail
                open={modalOpen}
                onClose={handleCerrarModal}
                onContinuar={handleContinuarModal}
                email={email}
                contexto="registro"
                loading={modalLoading}
                error={modalError}
            />
        </>
    );
}


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
                className={`w-full bg-white text-black rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 border ${error
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
                className={`w-full bg-white text-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 border ${error
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
