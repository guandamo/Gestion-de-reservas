import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import UserLayout from '../layouts/UserLayout.jsx';
import Calendario from '../components/Calendario.jsx';
import MisReservas from '../components/MisReservas.jsx';
import ModalConfirmacionReserva from '../components/ModalConfirmacionReserva.jsx';

export default function UserDashboard() {
    const { user } = useAuth();
    const [vista, setVista] = useState('reservar'); // 'reservar' | 'mis-reservas'
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSeleccionarTurno = (turno, cancha) => {
        setTurnoSeleccionado(turno);
        setCanchaSeleccionada(cancha);
    };

    const handleCerrarModal = () => {
        setTurnoSeleccionado(null);
        setCanchaSeleccionada(null);
    };

    const handleReservaCreada = (data) => {
        handleCerrarModal();
        // Refrescar la lista de reservas y forzar recarga del calendario
        setRefreshKey((k) => k + 1);
        setVista('mis-reservas');
    };

    return (
        <UserLayout>
            <div className="flex flex-col gap-6">
                {/* Header con tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-blanco">
                            Hola, {user?.nombre ?? ''}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Reservá tu cancha o consultá tus reservas activas
                        </p>
                    </div>

                    <div className="inline-flex bg-[#222222] rounded-lg p-1 border border-white/10">
                        <TabButton
                            active={vista === 'reservar'}
                            onClick={() => setVista('reservar')}
                            icon="📅"
                            label="Reservar"
                        />
                        <TabButton
                            active={vista === 'mis-reservas'}
                            onClick={() => setVista('mis-reservas')}
                            icon="📋"
                            label="Mis reservas"
                        />
                    </div>
                </div>

                {/* Vista según tab */}
                {vista === 'reservar' ? (
                    <div>
                        <Calendario
                            onSeleccionarTurno={handleSeleccionarTurno}
                            refreshKey={refreshKey}
                        />
                    </div>
                ) : (
                    <MisReservas refreshKey={refreshKey} />
                )}
            </div>

            <ModalConfirmacionReserva
                open={!!turnoSeleccionado}
                turno={turnoSeleccionado}
                cancha={canchaSeleccionada}
                onClose={handleCerrarModal}
                onSuccess={handleReservaCreada}
            />
        </UserLayout>
    );
}

function TabButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                active
                    ? 'bg-verde-principal text-blanco shadow-sm'
                    : 'text-gray-400 hover:text-blanco hover:bg-white/5'
            }`}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );
}
