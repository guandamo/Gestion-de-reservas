import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_CONFIG = {
    ADMIN: {
        badge: 'Admin',
        initials: 'AD',
        label: 'Administrador'
    },
    USUARIO: {
        badge: 'Usuario',
        initials: 'U',
        label: 'Usuario'
    }
};

const DEFAULT_ROLE = 'USUARIO';

export default function Navbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const roleKey = user?.rol && ROLE_CONFIG[user.rol] ? user.rol : DEFAULT_ROLE;
    const currentRole = ROLE_CONFIG[roleKey];

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const iniciales = user
        ? `${(user.nombre?.[0] || '').toUpperCase()}${(user.apellido?.[0] || '').toUpperCase() || currentRole.initials[1]}`
        : currentRole.initials;
    const nombreVisible = user
        ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || currentRole.label
        : currentRole.label;

    return (
        <header className="bg-verde-principal text-blanco px-6 py-3 flex items-center justify-between shadow-md">
            {/* Sección Izquierda: Logo y Título */}
            <div className="flex items-center gap-3">
                <div className="bg-blanco/20 p-2 rounded-full flex items-center justify-center">
                    ⚽
                </div>
                <h1 className="text-xl font-bold tracking-wide">Gestión de canchas</h1>
                <span className="bg-black/30 text-xs px-2.5 py-1 rounded-full text-verde-claro font-medium border border-verde-claro/20">
                    {currentRole.badge}
                </span>
            </div>

            {/* Sección Derecha: Usuario */}
            <div className="flex items-center gap-3">
                <div className="bg-verde-claro text-verde-principal font-bold w-9 h-9 rounded-full flex items-center justify-center text-sm">
                    {iniciales}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{nombreVisible}</span>

                <button
                    onClick={handleLogout}
                    className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-medium"
                >
                    Cerrar Sesión
                </button>
            </div>
        </header>
    );
}
