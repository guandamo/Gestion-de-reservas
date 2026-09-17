import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendario from '../components/Calendario.jsx';
import ModalConfirmacionReserva from '../components/ModalConfirmacionReserva.jsx';

/**
 * Vista "Reservar" del usuario.
 * Renderiza el Calendario + el Modal de confirmación.
 * Al confirmarse la reserva, redirige a /user/mis-reservas.
 */
export default function ReservarView() {
    const navigate = useNavigate();
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);

    const handleSeleccionarTurno = (turno, cancha) => {
        setTurnoSeleccionado(turno);
        setCanchaSeleccionada(cancha);
    };

    const handleCerrarModal = () => {
        setTurnoSeleccionado(null);
        setCanchaSeleccionada(null);
    };

    const handleReservaCreada = () => {
        handleCerrarModal();
        navigate('/user/mis-reservas');
    };

    return (
        <>
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-blanco">Reservar cancha</h2>
                    <p className="text-gray-400 text-sm">
                        Seleccioná una cancha y un horario disponible
                    </p>
                </div>

                <Calendario onSeleccionarTurno={handleSeleccionarTurno} />
            </div>

            <ModalConfirmacionReserva
                open={!!turnoSeleccionado}
                turno={turnoSeleccionado}
                cancha={canchaSeleccionada}
                onClose={handleCerrarModal}
                onSuccess={handleReservaCreada}
            />
        </>
    );
}
