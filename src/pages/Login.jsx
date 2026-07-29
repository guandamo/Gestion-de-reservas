import React, { useState } from 'react';

export default function Login({ onLogin }) {
    // Estado para alternar entre "Iniciar Sesión" y "Registrarse"
    const [isLoginView, setIsLoginView] = useState(true);

    // Estados de los campos
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Función que maneja tanto el ingreso como el registro
    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (isLoginView) {
            // --- LÓGICA DE INGRESO ---
            if (!email || !password) {
                setError('Por favor, completá todos los campos.');
                return;
            }

            if (email === 'admin@canchas.com' && password === 'admin123') {
                onLogin('admin');
            } else if (email === 'cliente@correo.com' && password === 'cliente123') {
                onLogin('user');
            } else {
                setError('Correo o contraseña incorrectos.');
            }
        } else {
            // --- LÓGICA DE REGISTRO ---
            if (!nombre || !email || !password) {
                setError('Por favor, completá todos los campos para registrarte.');
                return;
            }
            // Acá a futuro guardarías el usuario en la base de datos.
            // Por ahora lo simulamos y lo ingresamos directo como cliente.
            alert(`¡Cuenta creada para ${nombre}! Iniciando sesión...`);
            onLogin('user');
        }
    };

    // Función para limpiar campos al cambiar de pantalla
    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError('');
        setNombre('');
        setEmail('');
        setPassword('');
    };

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

                    {/* Encabezado dinámico */}
                    <h2 className="text-4xl font-bold text-white mb-2">
                        {isLoginView ? 'Bienvenido' : 'Crear Cuenta'}
                    </h2>
                    <p className="text-gray-400 mb-8 text-sm">
                        {isLoginView
                            ? 'Ingresá a tu cuenta para continuar'
                            : 'Completá tus datos para registrarte'}
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                        {/* Campo NOMBRE (Solo visible en Registro) */}
                        {!isLoginView && (
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">Nombre completo</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Tu nombre"
                                        className="w-full bg-white text-black rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Campo EMAIL */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Correo electrónico</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-gray-500">
                                    {/* Ícono de sobrecito */}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@email.com"
                                    className="w-full bg-white text-black rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                />
                            </div>
                        </div>

                        {/* Campo CONTRASEÑA */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Contraseña</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-gray-500">
                                    {/* Ícono de candado */}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white text-black rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-verde-principal border border-transparent"
                                />
                                <span className="absolute right-3 top-3.5 text-gray-500 cursor-pointer hover:text-gray-700">
                                    {/* Ícono de ojito (visual) */}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                    </svg>
                                </span>
                            </div>
                        </div>

                        {/* Opciones extra: Solo en vista de Login */}
                        {isLoginView && (
                            <div className="flex items-center justify-between mt-1 text-sm">
                                <label className="flex items-center text-white cursor-pointer">
                                    <input type="checkbox" className="mr-2 accent-verde-principal w-4 h-4 rounded" />
                                    Recordarme
                                </label>
                                <a href="#" className="text-verde-claro hover:text-white transition">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        )}

                        {/* Mensaje de error */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center mt-2">
                                {error}
                            </div>
                        )}

                        {/* Botón principal */}
                        <button
                            type="submit"
                            className="w-full bg-white text-black font-bold text-lg py-3 rounded-lg mt-4 hover:bg-gray-200 transition"
                        >
                            {isLoginView ? 'Ingresar' : 'Registrarse'}
                        </button>
                    </form>

                    {/* Toggle para cambiar entre Login y Registro */}
                    <div className="text-center mt-8 text-sm">
                        <span className="text-gray-400">
                            {isLoginView ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}
                        </span>
                        <button
                            type="button"
                            onClick={toggleView}
                            className="text-verde-claro hover:text-white ml-1 font-medium transition"
                        >
                            {isLoginView ? 'Registrate' : 'Ingresá'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}