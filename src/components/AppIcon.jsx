// SVG de Lucide, obtenidos de Iconify: https://icon-sets.iconify.design/lucide/
// Licencia ISC; ver src/assets/icons/LICENSE-lucide.txt.
const icons = {
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c7 0 10 7 10 7a16 16 0 0 1-3.1 4.1M6.2 6.2A17 17 0 0 0 2 12s3 7 10 7a11 11 0 0 0 5.8-1.8" /></>,
    'log-out': <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />,
    'calendar-days': <><path d="M8 2v3m8-3v3" /><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" /></>,
    'calendar-plus': <path d="M16 18h6M16 2v3m3 10v6m2-9.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8.3M3 9h18M8 2v3" />,
    'clipboard-list': <><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4 7h4m-4 5h4m-8-5h.01M8 16h.01" /></>,
    'chart-no-axes-combined': <path d="M12 16v5m4-6.361V21m4-10.344V21m2-18l-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15m2 3.463V21m4-6.344V21" />,
    'settings-2': <><path d="M14 17H5M19 7h-9" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></>,
    'users-round': <><path d="M18 21a8 8 0 0 0-16 0" /><circle cx="10" cy="8" r="5" /><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" /></>,
    'user-round': <><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></>,
    // Variante rellena del user-round de Lucide para el avatar de ambos roles.
    'user-filled': <g fill="currentColor" stroke="none"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0Z" /></g>,
    pencil: <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4" />,
    trash: <path d="M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
};

// Decorativo: el nombre accesible lo aporta el texto o aria-label del botón.
export default function AppIcon({ name, className = '' }) {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" focusable="false" className={`h-5 w-5 shrink-0 ${className}`}>
            {icons[name]}
        </svg>
    );
}
