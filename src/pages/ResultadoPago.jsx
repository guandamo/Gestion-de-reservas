import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError, NetworkError, tokenStore } from '../api/client.js';

/**
 * Pantalla de retorno desde el checkout de Mercado Pago.
 *
 * Es una ruta PÚBLICA a propósito: durante el redirect de MP el usuario puede
 * haber perdido la sesión, y aun así tiene que ver qué pasó con su reserva en
 * lugar de caer en un redirect ciego al login.
 *
 * Principio central: **la URL no prueba el pago**. Mercado Pago devuelve
 * `payment_id` y `external_reference` en el query string, pero que el usuario
 * haya llegado a `/pago/exito` no significa que el pago esté aprobado. La
 * pantalla siempre consulta `GET /api/payments/estado`, que valida el pago
 * contra la API de Mercado Pago desde el backend y devuelve el estado real de
 * la base. Todo lo que se muestra sale de esa respuesta, nunca del query.
 *
 * Si el usuario vuelve sin haber pagado, la reserva sigue PENDIENTE y el
 * backend la vence a los 3 minutos liberando el turno (no es esta pantalla la
 * que libera nada).
 *
 * No recibe la variante de la ruta a propósito: que el usuario caiga en
 * `/pago/exito` o en `/pago/fallo` no dice nada sobre el resultado real. Las
 * tres rutas montan el mismo componente y el mensaje sale siempre del backend.
 */
export default function ResultadoPago() {
    const [searchParams] = useSearchParams();
    const [estado, setEstado] = useState({ cargando: true, error: '', sesion: true });

    // Guards contra doble montaje en StrictMode (desarrollo).
    const consultado = useRef(false);

    useEffect(() => {
        if (consultado.current) return;
        consultado.current = true;

        const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id');
        const referencia = searchParams.get('external_reference');

        if (!paymentId && !referencia) {
            setEstado({
                cargando: false,
                error: 'No pudimos identificar el pago. Volvé a tus reservas para ver el estado.',
                sesion: tokenStore.get() != null,
            });
            return;
        }

        const controller = new AbortController();

        const params = new URLSearchParams();
        if (paymentId) params.set('payment_id', paymentId);
        if (referencia) params.set('external_reference', referencia);

        api.get(`/payments/estado?${params.toString()}`, { signal: controller.signal })
            .then((datos) => setEstado({ cargando: false, error: '', sesion: true, datos }))
            .catch((err) => {
                if (err?.name === 'AbortError') return;

                setEstado({
                    cargando: false,
                    sesion: tokenStore.get() != null,
                    error:
                        err instanceof NetworkError
                            ? 'No pudimos conectar con el servidor para verificar tu pago.'
                            : err instanceof ApiError && err.status === 401
                              ? 'Tu sesión expiró. Volvé a iniciar sesión para ver el estado de tu reserva.'
                              : err?.message || 'No pudimos verificar el estado del pago.',
                });
            });

        return () => controller.abort();
    }, [searchParams]);

    return (
        <div className="min-h-dvh bg-[#171717] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <TarjetaResultado
                    cargando={estado.cargando}
                    error={estado.error}
                    sesion={estado.sesion}
                    datos={estado.datos}
                />
            </div>
        </div>
    );
}

function TarjetaResultado({ cargando, error, sesion, datos }) {
    if (cargando) {
        return (
            <Panel>
                <div
                    role="status"
                    aria-live="polite"
                    className="flex flex-col items-center gap-3 py-6 text-center"
                >
                    <span
                        aria-hidden="true"
                        className="h-8 w-8 rounded-full border-2 border-white/10 border-t-verde-claro animate-spin"
                    />
                    <p className="text-blanco font-semibold">Verificando tu pago…</p>
                    <p className="text-gray-400 text-sm">
                        Estamos confirmando la operación con Mercado Pago.
                    </p>
                </div>
            </Panel>
        );
    }

    if (error) {
        return (
            <Panel>
                <Encabezado
                    icono="!"
                    tono="error"
                    titulo="No pudimos verificar el pago"
                />
                <p role="alert" className="text-gray-300 text-sm">
                    {error}
                </p>
                <Acciones mostrarMisReservas={sesion} />
            </Panel>
        );
    }

    const vista = interpretarEstado(datos);

    return (
        <Panel>
            <Encabezado icono={vista.icono} tono={vista.tono} titulo={vista.titulo} />

            <p className="text-gray-300 text-sm">{vista.mensaje}</p>

            {vista.mostrarTurno && datos?.turno ? (
                <dl className="mt-4 space-y-1.5 text-sm">
                    <Dato label="Cancha" valor={datos.turno.cancha} />
                    <Dato
                        label="Fecha"
                        valor={new Date(datos.turno.fecha).toLocaleDateString('es-AR', {
                            timeZone: 'UTC',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        })}
                    />
                    <Dato label="Horario" valor={datos.turno.horaInicio} />
                    <Dato
                        label="Precio"
                        valor={`$${Number(datos.turno.precio).toLocaleString('es-AR')}`}
                    />
                </dl>
            ) : null}

            <Acciones mostrarMisReservas={sesion} />
        </Panel>
    );
}

/**
 * Traduce el estado que devuelve el backend a lo que ve el usuario.
 *
 * El backend es la única fuente de verdad: estos textos NO dependen de la ruta
 * (`/pago/exito`, `/pago/fallo`) ni del `collection_status` que MP agrega a la
 * URL. Un usuario puede caer en `/pago/exito` con un pago rechazado y verá el
 * mensaje correcto.
 */
function interpretarEstado(datos) {
    const resultado = datos?.resultado;
    const pagada = datos?.estadoPago === 'PAGADO';
    const confirmada = datos?.estadoReserva === 'CONFIRMADA';
    const cancelada = datos?.estadoReserva === 'CANCELADA';

    // El pago se acreditó después de que la reserva venciera y el turno ya
    // pudo haber sido tomado por otra persona. La reserva no se toca.
    if (resultado === 'pago_posterior_a_vencimiento') {
        return {
            icono: '!',
            tono: 'aviso',
            titulo: 'Tu pago llegó tarde',
            mensaje:
                'La reserva venció antes de que se confirmara el pago, así que el turno se liberó. ' +
                'Vamos a devolverte el dinero; puede tardar unos días en verse reflejado.',
            mostrarTurno: false,
        };
    }

    if (pagada && confirmada) {
        return {
            icono: '✓',
            tono: 'exito',
            titulo: '¡Pago aprobado!',
            mensaje: 'Tu reserva quedó confirmada. Te esperamos en la cancha.',
            mostrarTurno: true,
        };
    }

    if (pagada && cancelada) {
        return {
            icono: '!',
            tono: 'aviso',
            titulo: 'Tu pago llegó tarde',
            mensaje:
                'La reserva ya no estaba disponible cuando se acreditó el pago. ' +
                'Vamos a devolverte el dinero.',
            mostrarTurno: false,
        };
    }

    if (cancelada) {
        return {
            icono: '×',
            tono: 'error',
            titulo: 'El pago no se completó',
            mensaje: 'La reserva se canceló y el turno volvió a estar disponible.',
            mostrarTurno: false,
        };
    }

    if (resultado === 'sin_pago_en_mp') {
        return {
            icono: '×',
            tono: 'error',
            titulo: 'No encontramos el pago',
            mensaje: 'No hay ningún pago registrado para esta reserva.',
            mostrarTurno: false,
        };
    }

    // Sigue PENDIENTE: el pago puede estar en curso o el usuario volvió sin
    // pagar. La reserva sigue viva hasta su vencimiento.
    const expiraEnMin = datos?.expiraEnMs != null
        ? Math.max(1, Math.ceil(datos.expiraEnMs / 60000))
        : null;

    return {
        icono: '…',
        tono: 'espera',
        titulo: 'Tu pago está en proceso',
        mensaje: expiraEnMin
            ? `Estamos esperando la confirmación. Tu reserva sigue vigente por ${expiraEnMin} ` +
              `minuto${expiraEnMin > 1 ? 's' : ''} más.`
            : 'Estamos esperando la confirmación de Mercado Pago.',
        mostrarTurno: true,
    };
}

function Panel({ children }) {
    return (
        <div className="bg-[#222222] border border-white/5 rounded-xl p-6 flex flex-col gap-4">
            {children}
        </div>
    );
}

const TONOS = {
    exito: 'border-green-500/40 bg-green-500/15 text-green-300',
    error: 'border-red-500/40 bg-red-500/15 text-red-300',
    aviso: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
    espera: 'border-white/10 bg-white/5 text-gray-300',
};

function Encabezado({ icono, tono, titulo }) {
    return (
        <div className="flex items-center gap-3">
            <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg font-bold ${TONOS[tono]}`}
            >
                {icono}
            </span>
            <h1 className="text-blanco text-xl font-bold">{titulo}</h1>
        </div>
    );
}

function Dato({ label, valor }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-400">{label}</dt>
            <dd className="text-blanco font-medium text-right">{valor ?? '—'}</dd>
        </div>
    );
}

function Acciones({ mostrarMisReservas }) {
    return (
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
                to="/login"
                className="flex-1 text-center bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition"
            >
                Iniciar sesión
            </Link>

            {mostrarMisReservas && (
                <Link
                    to="/user/mis-reservas"
                    className="flex-1 text-center bg-verde-principal hover:brightness-110 text-blanco font-bold py-3 rounded-lg transition shadow-md"
                >
                    Ver mis reservas
                </Link>
            )}
        </div>
    );
}