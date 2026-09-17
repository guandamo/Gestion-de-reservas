import { useLocation } from 'react-router-dom';
import MisReservas from '../components/MisReservas.jsx';

/**
 * Vista "Mis reservas" del usuario.
 * Se refresca automáticamente cuando el usuario navega a esta ruta
 * (la key cambia si viene de una reserva recién creada).
 */
export default function MisReservasView() {
    const location = useLocation();
    const refreshKey = location.state?.refresh ?? 0;

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-2xl font-bold text-blanco">Mis reservas</h2>
                <p className="text-gray-400 text-sm">
                  Tus reservas activas y pasadas
                </p>
            </div>

            <MisReservas refreshKey={refreshKey} />
        </div>
    );
}
