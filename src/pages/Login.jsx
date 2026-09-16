import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api/client.js';

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

    // Bloqueos según UI: el registro queda deshabilitado por ahora (no estaba en alcance)
    if (!isLoginView) {
        return (
            <div className="min-h-screen flex font-sans animate-fadeIn">
                <div className="hidden lg:flex w-1/2 bg-verde-principal flex-col justify-center items-center p-12">
                    <h1 className="text-6xl font-bold text-white mb-6 text-center leading-tight">
                        Gestión de <br /> Canchas
                    </h1>
                    <div className="w-16 h-1 bg-white rounded"></div>
                </div>
                <div className="w-full lg:w-1/2 bg-[#222222] flex justify-center items-center p-8">
                    <div className="w-full max-w-md text-center text-gray-300">
                        <h2 className="text-3xl font-bold text-white mb-4">Registro no disponible</h2>
                        <p className="text-gray-400 mb-6 text-sm">
                            El alta de cuentas se realiza exclusivamente desde el panel de administración.
                            Si necesitás acceso, contactá al administrador del sistema.
                        </p>
                        <button
                            type="button"
                            onClick={toggleView}
                            className="text-verde-claro hover:text-white font-medium transition"
                        >
                            ← Volver al inicio de sesión
                        </button>
                    </div>
                </div>
            </div>
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
