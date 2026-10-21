import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AccountMenu from './AccountMenu.jsx';

const ROLE_CONFIG = {
    ADMIN: {
        badge: 'Admin',
        label: 'Administrador'
    },
    USUARIO: {
        badge: 'Usuario',
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
                <AccountMenu onLogout={handleLogout} roleLabel={currentRole.label}>
                    <span className="text-sm font-medium hidden sm:inline">{nombreVisible}</span>
                </AccountMenu>
            </div>
        </header>
    );
}
