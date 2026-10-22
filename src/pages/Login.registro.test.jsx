import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, NetworkError, api } from '../api/client.js';
import Login from './Login.jsx';

/**
 * Tests del formulario de REGISTRO (`RegisterView` en Login.jsx).
 *
 * Recubren el bug que dejó el formulario trabado: los errores sólo se
 * calculaban en el submit y el botón quedaba deshabilitado con
 * `hayErroresVisibles`, así que una vez que aparecía un error el usuario ya
 * no podía reenviar y los errores nunca se limpiaban.
 */

const mocks = vi.hoisted(() => ({
    register: vi.fn(),
    login: vi.fn(),
    navigate: vi.fn(),
}));

vi.mock('../context/AuthContext.jsx', () => ({
    useAuth: () => ({
        register: mocks.register,
        login: mocks.login,
        logout: vi.fn(),
        updateUser: vi.fn(),
    }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        useLocation: () => ({ state: null, pathname: '/login' }),
    };
});

// Se reemplaza sólo `api.get` (el que consulta /auth/existe-email); las clases
// de error se conservan reales para que los `instanceof` del componente
// sigan funcionando.
vi.mock('../api/client.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        api: { ...actual.api, get: vi.fn() },
    };
});

// --- helpers ---

// La vista de registro se monta dos veces en el DOM (una para mobile y otra
// para desktop) y el CSS responsive no se aplica en jsdom, así que todos los
// elementos existen siempre. Se toma siempre el primero de cada lista: las dos
// copias comparten el mismo estado y los mismos handlers, así que ejercitan
// la misma lógica.
const campo = (placeholder) => screen.getAllByPlaceholderText(placeholder)[0];

const botonCrearCuenta = () =>
    screen.getAllByRole('button', { name: /Crear cuenta|Verificando/ })[0];

const formulario = () => campo('usuario@email.com').closest('form');

// Los mensajes se renderizan una vez por cada copia (mobile + desktop), así
// que se consulta por lista y no por elemento único.
const visibles = (mensaje) => screen.queryAllByText(mensaje);
const hayError = (mensaje) => visibles(mensaje).length > 0;

const DATOS_VALIDOS = {
    Juan: 'Juan',
    'Pérez': 'Pérez',
    'usuario@email.com': 'juan@mail.com',
    'Ej.: +54 9 221 1234567': '112214534567',
    'Mínimo 8 caracteres': 'clave1234',
    'Repetí tu contraseña': 'clave1234',
};

async function abrirRegistro() {
    const user = userEvent.setup();
    render(<Login />);
    await user.click(screen.getAllByRole('button', { name: 'Registrate' })[0]);
    return user;
}

async function completar(user, sobreescrituras = {}) {
    const datos = { ...DATOS_VALIDOS, ...sobreescrituras };
    for (const [placeholder, valor] of Object.entries(datos)) {
        const input = campo(placeholder);
        await user.clear(input);
        if (valor) await user.type(input, String(valor));
    }
}

beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockReset();
    api.get.mockResolvedValue({ existe: false });
    mocks.register.mockResolvedValue({ id: 'u1', rol: 'USUARIO' });
});

// --- casos ---

describe('Registro: los errores se limpian al corregir el campo', () => {
    it('1. Borra el error del email cuando el usuario lo corrige', async () => {
        const user = await abrirRegistro();
        await completar(user, { 'usuario@email.com': 'juan@mail' });

        await user.click(botonCrearCuenta());

        await waitFor(() => {
            expect(hayError('El email no tiene un formato válido.')).toBe(true);
        });
        expect(botonCrearCuenta().disabled).toBe(true);
        // Con datos inválidos no se consulta al backend.
        expect(api.get).not.toHaveBeenCalled();

        await user.clear(campo('usuario@email.com'));
        await user.type(campo('usuario@email.com'), 'juan@mail.com');

        await waitFor(() => {
            expect(hayError('El email no tiene un formato válido.')).toBe(false);
        });
    });

    it('2. Actualiza un campo obligatorio incorrecto al corregirlo', async () => {
        const user = await abrirRegistro();
        await completar(user, { Juan: 'J' });

        await user.click(botonCrearCuenta());
        await waitFor(() => {
            expect(hayError('El nombre debe tener al menos 2 caracteres.')).toBe(true);
        });

        await user.type(campo('Juan'), 'uan');

        await waitFor(() => {
            expect(hayError('El nombre debe tener al menos 2 caracteres.')).toBe(false);
        });
        expect(hayError('El apellido es obligatorio.')).toBe(false);
    });

    it('2b. Recalcula "confirmar contraseña" cuando cambia la contraseña', async () => {
        const user = await abrirRegistro();
        await completar(user, { 'Repetí tu contraseña': 'otra9999' });

        await user.click(botonCrearCuenta());
        await waitFor(() => {
            expect(hayError('Las contraseñas no coinciden.')).toBe(true);
        });

        // Se corrige la contraseña para que coincida con la confirmación, sin
        // tocar el campo de confirmación: el error combinado debe caer solo.
        await user.clear(campo('Mínimo 8 caracteres'));
        await user.type(campo('Mínimo 8 caracteres'), 'otra9999');

        await waitFor(() => {
            expect(hayError('Las contraseñas no coinciden.')).toBe(false);
        });
    });

    it('3. Habilita "Crear cuenta" solo al corregir todos los errores', async () => {
        const user = await abrirRegistro();
        await completar(user, {
            Juan: 'J',
            'usuario@email.com': 'juan@mail',
            'Ej.: +54 9 221 1234567': '123',
            // Contraseña corta y confirmación distinta: dos errores sobre el
            // mismo par de campos.
            'Mínimo 8 caracteres': 'corta',
            'Repetí tu contraseña': 'clave1234',
        });

        await user.click(botonCrearCuenta());

        await waitFor(() => {
            expect(hayError('El nombre debe tener al menos 2 caracteres.')).toBe(true);
        });
        expect(hayError('El email no tiene un formato válido.')).toBe(true);
        expect(hayError('La contraseña debe tener al menos 8 caracteres.')).toBe(true);
        expect(hayError('Las contraseñas no coinciden.')).toBe(true);
        expect(botonCrearCuenta().disabled).toBe(true);

        await user.type(campo('Juan'), 'uan');
        await user.clear(campo('usuario@email.com'));
        await user.type(campo('usuario@email.com'), 'juan@mail.com');
        await user.clear(campo('Ej.: +54 9 221 1234567'));
        await user.type(campo('Ej.: +54 9 221 1234567'), '112214534567');

        // Al arreglar la contraseña, el error de "no coinciden" también tiene
        // que caer: la confirmación ya vale "clave1234" y quedó válida.
        expect(botonCrearCuenta().disabled).toBe(true);
        await user.clear(campo('Mínimo 8 caracteres'));
        await user.type(campo('Mínimo 8 caracteres'), 'clave1234');

        // Sin recargar: el botón se rehabilita solo.
        await waitFor(() => {
            expect(botonCrearCuenta().disabled).toBe(false);
        });
        expect(botonCrearCuenta().textContent).toContain('Crear cuenta');
        expect(hayError('Las contraseñas no coinciden.')).toBe(false);
        expect(hayError('La contraseña debe tener al menos 8 caracteres.')).toBe(false);
    });

    it('7. No deja continuar mientras haya datos inválidos', async () => {
        const user = await abrirRegistro();
        await completar(user, { 'usuario@email.com': 'no-es-un-mail' });

        await user.click(botonCrearCuenta());

        await waitFor(() => {
            expect(botonCrearCuenta().disabled).toBe(true);
        });
        expect(api.get).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('Registro: flujo de verificación OTP', () => {
    it('4. Abre el modal de verificación con datos válidos', async () => {
        const user = await abrirRegistro();
        await completar(user);

        await user.click(botonCrearCuenta());

        const dialogo = await screen.findByRole('dialog');
        expect(dialogo).toBeTruthy();
        expect(screen.getAllByText('Verificá tu email').length).toBeGreaterThan(0);
        expect(visibles('juan@mail.com').length).toBeGreaterThan(0);
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('5. Muestra el error del backend, permite corregirlo y reintenta', async () => {
        const user = await abrirRegistro();
        await completar(user);
        api.get.mockResolvedValueOnce({ existe: true });

        await user.click(botonCrearCuenta());

        await waitFor(() => {
            expect(
                hayError('Ya existe una cuenta registrada con ese correo electrónico.'),
            ).toBe(true);
        });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(botonCrearCuenta().disabled).toBe(false);

        // El error estaba anclado al email: al corregirlo debe desaparecer.
        await user.clear(campo('usuario@email.com'));
        await user.type(campo('usuario@email.com'), 'juan.nuevo@mail.com');

        await waitFor(() => {
            expect(
                hayError('Ya existe una cuenta registrada con ese correo electrónico.'),
            ).toBe(false);
        });

        await user.click(botonCrearCuenta());
        expect(await screen.findByRole('dialog')).toBeTruthy();
        expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('5b. Un error de conexión sigue visible hasta que se reintenta', async () => {
        const user = await abrirRegistro();
        await completar(user);
        api.get.mockRejectedValueOnce(new NetworkError('offline'));

        await user.click(botonCrearCuenta());

        await waitFor(() => {
            expect(
                hayError(
                    'No pudimos verificar tu correo. Revisá tu conexión e intentá de nuevo.',
                ),
            ).toBe(true);
        });

        // No es un error de dato: editar un campo no lo invalida, así que no
        // debe desaparecer.
        await user.type(campo('Pérez'), '!');
        expect(
            hayError(
                'No pudimos verificar tu correo. Revisá tu conexión e intentá de nuevo.',
            ),
        ).toBe(true);

        // El botón sigue disponible para reintentar.
        await user.click(botonCrearCuenta());
        expect(await screen.findByRole('dialog')).toBeTruthy();
    });

    it('5c. Si el backend rechaza el alta, se puede reintentar desde el modal', async () => {
        const user = await abrirRegistro();
        await completar(user);
        // El backend responde 409 tanto por email repetido como por teléfono
        // ya asociado, con su propio mensaje: el modal debe mostrar ese
        // motivo real, no asumir que siempre es el email.
        mocks.register.mockRejectedValueOnce(
            new ApiError(409, 'Ese teléfono ya está asociado a otra cuenta.'),
        );

        await user.click(botonCrearCuenta());
        await screen.findByRole('dialog');

        const continuar = screen.getByRole('button', { name: 'Continuar' });
        await user.click(continuar);

        await waitFor(() => {
            expect(hayError('Ese teléfono ya está asociado a otra cuenta.')).toBe(true);
        });
        // El modal sigue abierto para reintentar.
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(mocks.register).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: 'Continuar' }));

        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith('/user/reservar', {
                replace: true,
            });
        });
        expect(mocks.register).toHaveBeenCalledTimes(2);
    });
});

describe('Registro: sin envíos duplicados', () => {
    it('6. No dispara dos requests de verificación con clics y Enter seguidos', async () => {
        const user = await abrirRegistro();
        await completar(user);

        let resolver;
        api.get.mockImplementation(
            () => new Promise((resolve) => { resolver = resolve; }),
        );

        await user.click(botonCrearCuenta());

        // Mientras corre la verificación, el botón queda deshabilitado y muestra
        // el estado de carga.
        expect(botonCrearCuenta().disabled).toBe(true);
        expect(botonCrearCuenta().textContent).toContain('Verificando');

        await user.click(botonCrearCuenta());
        // Submit implícito (Enter en un campo) con la petición todavía en vuelo.
        fireEvent.submit(formulario());

        expect(api.get).toHaveBeenCalledTimes(1);

        resolver({ existe: false });
        expect(await screen.findByRole('dialog')).toBeTruthy();
    });

    it('6b. No crea dos cuentas si se pulsa "Continuar" dos veces', async () => {
        const user = await abrirRegistro();
        await completar(user);

        let resolver;
        mocks.register.mockImplementation(
            () => new Promise((resolve) => { resolver = resolve; }),
        );

        await user.click(botonCrearCuenta());
        await screen.findByRole('dialog');

        const continuar = screen.getByRole('button', { name: 'Continuar' });
        await user.click(continuar);

        expect(continuar.disabled).toBe(true);
        await user.click(continuar);

        expect(mocks.register).toHaveBeenCalledTimes(1);

        resolver({ id: 'u1', rol: 'USUARIO' });
        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledTimes(1);
        });
    });
});