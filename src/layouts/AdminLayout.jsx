import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import MobileTopBar from '../components/MobileTopBar.jsx';
import MobileDrawer from '../components/MobileDrawer.jsx';
import { adminItems } from '../components/sidebarItems.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLayout() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-gris-fondo text-blanco flex flex-col">
            {/* Desktop top bar */}
            <div className="hidden lg:block">
                <Navbar />
            </div>

            {/* Mobile top bar */}
            <MobileTopBar roleLabel="Admin" onOpenDrawer={() => setDrawerOpen(true)} />

            <div className="flex flex-1 min-h-0">
                <Sidebar />
                <main className="flex-1 p-4 lg:p-6 min-w-0 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>

            <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                items={adminItems}
                currentUser={user}
                onLogout={handleLogout}
            />
        </div>
    );
}