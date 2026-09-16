import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import courtRoutes from "./routes/court.routes.js";
import courtTypeRoutes from "./routes/courtType.routes.js";
import reportRoutes from "./routes/report.routes.js";
import auditRoutes from "./routes/audit.routes.js";

const app = express();
const PORT = process.env.PORT || 4000;

// --- Seguridad y parsing ---
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

// --- CORS ---
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir herramientas sin origin (curl, postman) o coincidir con la lista
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// --- Logging ---
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// --- Health ---
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// --- API ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/court-types", courtTypeRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);

// --- 404 + errores ---
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✔ API escuchando en http://localhost:${PORT}`);
});
