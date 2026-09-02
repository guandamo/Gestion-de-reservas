import React from 'react';
import UserLayout from '../layouts/UserLayout';


export default function UserDashboard({ onLogout }) {
    return (
        <UserLayout onLogout={onLogout} />
    );
}
