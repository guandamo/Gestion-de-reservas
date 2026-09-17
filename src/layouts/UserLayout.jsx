import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import UserSidebar from '../components/UserSidebar.jsx';

export default function UserLayout() {
    return (
        <div className="min-h-screen bg-gris-fondo text-blanco flex flex-col">
            <Navbar />
            <div className="flex flex-1">
                <UserSidebar />
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
