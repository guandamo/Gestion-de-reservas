import React from 'react';

export default function UserLayout({ children }) {
    return (
        <div className="min-h-screen bg-gris-fondo text-blanco flex flex-col">
            {/* Header simplificado para clientes */}
            <header className="bg-verde-principal text-blanco px-6 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-blanco/20 p-2 rounded-full flex items-center justify-center">
                        ⚽
                    </div>
                    <h1 className="text-xl font-bold tracking-wide">Reserva de Canchas</h1>
                    <span className="bg-black/30 text-xs px-2.5 py-1 rounded-full text-verde-claro font-medium border border-verde-claro/20">
                        Cliente
                    </span>
                </div>
            </header>

            {/* Área de contenido del usuario */}
            <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
}