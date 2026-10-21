import React from 'react';

/**
 * Frontera de errores de la app.
 *
 * Sin esto, un throw durante el render (por ejemplo un `data.tipos` que
 * viene `undefined` porque la API respondió otra cosa) tumba el árbol
 * entero de React y el usuario ve una pantalla en blanco, sin forma de
 * salir. Con la frontera ve un mensaje y puede volver al login o recargar.
 *
 * Sólo atrapa errores de RENDER. No atrapa:
 *  - errores de event handlers (los de onClick / onSubmit)
 *  - errores de promesas sin catch
 *  - errores de carga de imágenes/estilos
 * Para ésos, cada pantalla ya muestra su propio `error` en línea.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // En producción no hay consola abierta, pero queda en los logs del
        // navegador del usuario y sirve para reportar el stack real.
        console.error('[ErrorBoundary] la vista falló al renderizar', error, info);
    }

    render() {
        const { error } = this.state;

        if (!error) return this.props.children;

        return (
            <div className="min-h-screen bg-gris-fondo flex items-center justify-center p-6 font-sans">
                <div className="w-full max-w-md bg-[#222222] rounded-2xl border border-white/5 shadow-2xl p-6 text-center">
                    <div className="text-4xl mb-3" aria-hidden="true">
                        ⚠️
                    </div>
                    <h1 className="text-xl font-bold text-blanco mb-2">
                        Something went wrong
                    </h1>
                    <p className="text-sm text-gray-400 mb-6">
                        No pudimos mostrar esta pantalla. Podés recargar la página o
                        volver a iniciar sesión.
                    </p>

                    {/* El mensaje técnico ayuda a reportar el problema sin que
                        el usuario tenga que abrir la consola. */}
                    <p className="text-xs text-gray-500 mb-6 break-words">
                        {error?.message || String(error)}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            type="button"
                            onClick={() => this.setState({ error: null })}
                            className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-blanco transition"
                        >
                            Reintentar
                        </button>
                        <a
                            href="/login"
                            className="px-4 py-2 text-sm rounded-lg bg-verde-principal text-blanco font-medium hover:brightness-110 transition"
                        >
                            Ir al login
                        </a>
                    </div>
                </div>
            </div>
        );
    }
}