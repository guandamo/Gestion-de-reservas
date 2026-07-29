import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen bg-gris-fondo text-blanco flex flex-col">
            {/* Navbar superior */}
            <Navbar />

            <div className="flex flex-1">
                {/* Sidebar lateral */}
                <Sidebar />

                {/* Área de contenido principal */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}