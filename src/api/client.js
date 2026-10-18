// Cliente HTTP centralizado.
// Adjunta automáticamente el JWT de localStorage si existe.
// Acepta un AbortSignal externo para cancelar requests en vuelo (e.g. doble submit).

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const TOKEN_KEY = "gr_token";

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY),
};

/**
 * Error de red: el request no llegó al backend (offline, DNS, CORS, abortado).
 * Se distingue de ApiError (HTTP status del backend) para poder mostrar
 * un mensaje específico ("sin conexión") en lugar de "credenciales inválidas".
 */
export class NetworkError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = "NetworkError";
        this.cause = cause;
    }
}

async function request(path, { method = "GET", body, headers = {}, responseType, signal } = {}) {
    const token = tokenStore.get();
    const finalHeaders = {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
    };

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method,
            headers: finalHeaders,
            body: body ? JSON.stringify(body) : undefined,
            signal,
        });
    } catch (fetchError) {
        // fetch rechaza con TypeError en errores de red (offline, DNS, CORS)
        // y con DOMException("AbortError") si signal se aborta.
        if (fetchError?.name === "AbortError") {
            throw fetchError; // El caller puede ignorarlo; no es un error de usuario.
        }
        throw new NetworkError(
            fetchError?.message || "No se pudo conectar con el servidor.",
            fetchError,
        );
    }

    if (responseType === "blob") {
        if (!res.ok) {
            const text = await res.text();
            throw new ApiError(res.status, text || res.statusText);
        }
        return res; // devolvemos la Response para hacer download del blob
    }

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        throw new ApiError(res.status, payload?.error || res.statusText, payload?.details);
    }
    return payload;
}

export class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export const api = {
    get: (path, options) => request(path, { ...options }),
    post: (path, body, options) => request(path, { ...options, method: "POST", body }),
    patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
    delete: (path, options) => request(path, { ...options, method: "DELETE" }),

    /**
     * Descarga un archivo (e.g. PDF) forzando save del navegador.
     */
    download: async (path, suggestedName = "download", options) => {
        const res = await request(path, { ...options, responseType: "blob" });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    },
};
