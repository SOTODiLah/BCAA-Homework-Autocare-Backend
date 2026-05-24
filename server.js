const express = require("express");
const cors = require("cors");
const vehicleRoutes = require("./routes/vehicleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ name: "AutoCare API", version: "1.0.0", status: "running" });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    errors: [{ code: "routeNotFound", message: "Requested route does not exist." }],
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AutoCare backend running on http://localhost:${PORT}`);
});

module.exports = app;
