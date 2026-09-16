import UserLayout from '../layouts/UserLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function UserDashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <UserLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-blanco">Vista de Cliente</h2>
                    {user && (
                        <p className="text-gray-400 text-sm mt-1">
                            {user.nombre} {user.apellido} · {user.email}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-medium"
                >
                    Cerrar Sesión
                </button>
            </div>

            <div className="border-2 border-dashed border-verde-claro/30 rounded-xl p-8 text-center text-gray-300">
                <h3 className="text-lg font-semibold text-blanco mb-2">
                    ¡Bienvenido a la sección de reservas!
                </h3>
                <p>
                    El flujo de reservas y calendario para clientes pertenece a otra rama del proyecto.
                    Esta sección queda autenticada contra el backend (JWT / bcrypt) y lista para integrarse.
                </p>
            </div>
        </UserLayout>
    );
}
