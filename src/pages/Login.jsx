import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api/client.js';

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

export default function Login() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Por favor, completá todos los campos.');
            return;
        }

        try {
            setLoading(true);
            const user = await login(email.trim().toLowerCase(), password);

            const destino =
                from && from !== '/login'
                    ? from
                    : user.rol === 'ADMIN'
                        ? '/admin'
                        : '/user';
            navigate(destino, { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError('Correo o contraseña incorrectos.');
            } else {
                setError(err?.message || 'No se pudo iniciar sesión.');
            }
        } finally {
            setLoading(false);
        }
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
                from={from}
            />
        );
    }

    return (
        <div className="min-h-screen flex font-sans animate-fadeIn">

            {/* MITAD IZQUIERDA: Verde con Título (Se oculta en celulares pequeños) */}
            <div className="hidden lg:flex w-1/2 bg-verde-principal flex-col justify-center items-center p-12">
                <h1 className="text-6xl font-bold text-white mb-6 text-center leading-tight">
                    Gestión de <br /> Canchas
                </h1>
                <div className="w-16 h-1 bg-white rounded"></div>
            </div>

            {/* MITAD DERECHA: Formulario Oscuro */}
            <div className="w-full lg:w-1/2 bg-[#222222] flex justify-center items-center p-8">
                <div className="w-full max-w-md">

                    <h2 className="text-4xl font-bold text-white mb-2">Bienvenido</h2>
                    <p className="text-gray-400 mb-8 text-sm">Ingresá a tu cuenta para continuar</p>

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
    );
}

// ============================================================
// Registro
// ============================================================
function RegisterView({ onSwitchToLogin, navigate, from }) {
    const { register } = useAuth();

    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (!validarTodo()) return;

        try {
            setLoading(true);
            const user = await register({
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                email: email.trim().toLowerCase(),
                password,
                confirmPassword,
            });
            const destino =
                from && from !== '/login'
                    ? from
                    : user.rol === 'ADMIN'
                        ? '/admin'
                        : '/user';
            navigate(destino, { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                setServerError(
                    'Ya existe una cuenta registrada con ese correo electrónico.',
                );
            } else if (err instanceof ApiError && err.status === 400) {
                setServerError(err.message || 'Datos inválidos.');
            } else {
                setServerError(err?.message || 'No se pudo crear la cuenta.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Para que el botón se habilite solo cuando no hay errores visibles
    const hayErroresVisibles =
        !!errors.nombre ||
        !!errors.apellido ||
        !!errors.email ||
        !!errors.password ||
        !!errors.confirmPassword;

    return (
        <div className="min-h-screen flex font-sans animate-fadeIn">
            {/* MITAD IZQUIERDA */}
            <div className="hidden lg:flex w-1/2 bg-verde-principal flex-col justify-center items-center p-12">
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
                            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
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
    );
}

// Campo de texto reutilizable, con ícono y mensaje de error debajo
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
