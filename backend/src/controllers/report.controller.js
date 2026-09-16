import PDFDocument from "pdfkit";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "../utils/dates.js";

/**
 * GET /api/reports?mes=YYYY-MM
 * Retorna métricas agregadas del mes y del día actual.
 */
export async function getReports(req, res) {
  const { mes } = req.query;

  let desde, hasta, hoy;
  try {
    ({ desde, hasta, hoy } = parseMes(mes));
  } catch (e) {
    throw new HttpError(400, e.message);
  }

  const [
    reservasEnMes,
    pagosPagadosEnMes,
    pagosPendientes,
    turnosHoy,
    turnosReservadosHoy,
  ] = await Promise.all([
    prisma.reserva.findMany({
      where: { fechaAlta: { gte: desde, lte: hasta } },
      select: { id: true, estado: true, fechaAlta: true },
    }),
    prisma.pago.aggregate({
      where: { estado: "PAGADO", fechaPago: { gte: desde, lte: hasta } },
      _sum: { monto: true },
      _count: { _all: true },
    }),
    prisma.pago.count({
      where: { estado: "PENDIENTE" },
    }),
    prisma.turno.count({
      where: { fecha: { gte: hoy, lte: endOfDay() } },
    }),
    prisma.turno.count({
      where: { fecha: { gte: hoy, lte: endOfDay() }, estado: "RESERVADO" },
    }),
  ]);

  const ocupacionHoy =
    turnosHoy > 0 ? Math.round((turnosReservadosHoy / turnosHoy) * 100) : 0;

  return res.json({
    periodo: { desde, hasta, mes: mes ?? null },
    reservasHoy: reservasEnMes.filter((r) => isToday(r.fechaAlta)).length,
    ocupacionHoy,
    turnosHoy,
    turnosReservadosHoy,
    ingresosMes: Number(pagosPagadosEnMes._sum.monto ?? 0),
    pagosMes: pagosPagadosEnMes._count?._all ?? 0,
    pagosPendientes,
    reservasEnMes: reservasEnMes.length,
  });
}

/**
 * GET /api/reports/export?mes=YYYY-MM
 * Devuelve un PDF con las métricas.
 */
export async function exportReports(req, res) {
  const { mes } = req.query;
  let desde, hasta;
  try {
    ({ desde, hasta } = parseMes(mes));
  } catch (e) {
    throw new HttpError(400, e.message);
  }

  const [pagos, reservas] = await Promise.all([
    prisma.pago.findMany({
      where: { fechaPago: { gte: desde, lte: hasta } },
      include: { reserva: true },
      orderBy: { fechaPago: "asc" },
    }),
    prisma.reserva.findMany({
      where: { fechaAlta: { gte: desde, lte: hasta } },
      orderBy: { fechaAlta: "asc" },
    }),
  ]);

  const filename = `reporte_${mes ?? "actual"}.pdf`;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Cabecera
  doc
    .fontSize(20)
    .text("Reporte de Gestión de Canchas", { align: "center" })
    .moveDown(0.5);
  doc
    .fontSize(12)
    .fillColor("#555")
    .text(
      `Período: ${mes ?? "mes actual"} (${formatDate(desde)} al ${formatDate(hasta)})`,
      { align: "center" },
    )
    .fillColor("black")
    .moveDown();

  // Métricas
  const totalIngresos = pagos
    .filter((p) => p.estado === "PAGADO")
    .reduce((acc, p) => acc + Number(p.monto), 0);
  const pagosPendientes = pagos.filter((p) => p.estado === "PENDIENTE").length;
  const confirmadas = reservas.filter((r) => r.estado === "CONFIRMADA").length;
  const canceladas = reservas.filter((r) => r.estado === "CANCELADA").length;

  doc.fontSize(14).text("Métricas", { underline: true }).moveDown(0.5);
  doc
    .fontSize(11)
    .text(`Total de reservas en el período: ${reservas.length}`)
    .text(`  · Confirmadas: ${confirmadas}`)
    .text(`  · Canceladas: ${canceladas}`)
    .text(`Pagos registrados: ${pagos.length}`)
    .text(`Pagos pendientes: ${pagosPendientes}`)
    .text(`Ingresos del período (pagados): $${formatMoney(totalIngresos)}`)
    .moveDown();

  // Tabla simple de pagos
  if (pagos.length > 0) {
    doc.fontSize(14).text("Detalle de pagos", { underline: true }).moveDown(0.5);
    doc.fontSize(10);
    pagos.forEach((p) => {
      doc
        .text(
          `${formatDate(p.fechaPago)} · Reserva #${p.idReserva} · ${p.estado} · $${formatMoney(
            Number(p.monto),
          )} · ${p.metodo}`,
        )
        .moveDown(0.2);
    });
  } else {
    doc.fontSize(11).fillColor("#888").text("Sin pagos registrados en el período.").fillColor("black");
  }

  doc.end();
}

function parseMes(mes) {
  const today = new Date();
  const desde = mes ? startOfMonth(mes) : startOfMonth(today);
  const hasta = mes ? endOfMonth(mes) : endOfMonth(today);
  const hoy = startOfDay();
  return { desde, hasta, hoy };
}

function isToday(date) {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR");
}

function formatMoney(n) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}
