import "dotenv/config";
import { MercadoPagoConfig } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("Falta MP_ACCESS_TOKEN en el .env del backend");
}

export const mercadoPago = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
  },
});

// 