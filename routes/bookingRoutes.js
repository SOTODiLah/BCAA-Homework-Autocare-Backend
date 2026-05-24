const express = require("express");
const router = express.Router();
const bookingDao = require("../dao/bookingDao");
const vehicleDao = require("../dao/vehicleDao");

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_CREATE_KEYS = ["vehicleId", "serviceType", "date", "timeSlot", "note"];
const ALLOWED_UPDATE_KEYS = ["vehicleId", "serviceType", "date", "timeSlot", "status", "note"];
const VALID_STATUSES = ["Planned", "Completed"];
const VALID_SERVICE_TYPES = ["Oil Change", "Inspection", "Tire Change", "Brake Service", "Other"];

function getUnsupportedKeys(body, allowedKeys) {
  return Object.keys(body).filter((k) => !allowedKeys.includes(k));
}

// ── POST /api/bookings — booking/create ───────────────────────────────────────
router.post("/", (req, res) => {
  const dtoIn = req.body;
  const warnings = [];

  // 1.2 Unsupported keys
  const unsupportedKeys = getUnsupportedKeys(dtoIn, ALLOWED_CREATE_KEYS);
  if (unsupportedKeys.length > 0) {
    warnings.push({
      code: "unsupportedKeys",
      message: "DtoIn contains unsupported keys.",
      params: { unsupportedKeyList: unsupportedKeys },
    });
  }

  // 1.3 Validate required fields
  const missingKeyMap = {};
  if (!dtoIn.vehicleId)   missingKeyMap.vehicleId = "String is required.";
  if (!dtoIn.serviceType) missingKeyMap.serviceType = "String is required.";
  if (!dtoIn.date)        missingKeyMap.date = "String is required.";
  if (!dtoIn.timeSlot)    missingKeyMap.timeSlot = "String is required.";

  const invalidTypeKeyMap = {};
  if (dtoIn.vehicleId && typeof dtoIn.vehicleId !== "string")
    invalidTypeKeyMap.vehicleId = "Value must be a string.";
  if (dtoIn.serviceType && typeof dtoIn.serviceType !== "string")
    invalidTypeKeyMap.serviceType = "Value must be a string.";
  if (dtoIn.date && typeof dtoIn.date !== "string")
    invalidTypeKeyMap.date = "Value must be a string.";
  if (dtoIn.timeSlot && typeof dtoIn.timeSlot !== "string")
    invalidTypeKeyMap.timeSlot = "Value must be a string.";

  const invalidValueKeyMap = {};
  if (dtoIn.date) {
    const parsedDate = new Date(dtoIn.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(parsedDate.getTime())) {
      invalidValueKeyMap.date = "Value must be a valid date string (YYYY-MM-DD).";
    } else if (parsedDate < today) {
      invalidValueKeyMap.date = "Date must not be in the past.";
    }
  }

  if (
    Object.keys(missingKeyMap).length > 0 ||
    Object.keys(invalidTypeKeyMap).length > 0 ||
    Object.keys(invalidValueKeyMap).length > 0
  ) {
    return res.status(400).json({
      errors: [{ code: "invalidDtoIn", message: "DtoIn is not valid.", params: { invalidTypeKeyMap, invalidValueKeyMap, missingKeyMap } }],
      warnings,
    });
  }

  // 2. Check vehicle exists
  const vehicle = vehicleDao.get({ id: dtoIn.vehicleId });
  if (!vehicle) {
    return res.status(404).json({
      errors: [{ code: "vehicleNotFound", message: "Vehicle not found.", params: { vehicleId: dtoIn.vehicleId } }],
      warnings,
    });
  }

  // 2.1 Check time slot availability
  const existingBookings = bookingDao.getAll({ date: dtoIn.date, timeSlot: dtoIn.timeSlot });
  if (existingBookings.length > 0) {
    return res.status(409).json({
      errors: [{ code: "timeSlotNotAvailable", message: "Selected time slot is already taken for this date.", params: { date: dtoIn.date, timeSlot: dtoIn.timeSlot } }],
      warnings,
    });
  }

  // 3. Create booking (status defaults to Planned in DAO)
  const booking = bookingDao.create({
    vehicleId: dtoIn.vehicleId,
    serviceType: dtoIn.serviceType,
    date: dtoIn.date,
    timeSlot: dtoIn.timeSlot,
    note: dtoIn.note || "",
  });

  return res.status(201).json({ ...booking, warnings });
});

// ── GET /api/bookings — booking/list ──────────────────────────────────────────
router.get("/", (req, res) => {
  const { date, month } = req.query;
  let bookings = bookingDao.getAll();

  // Filter by date (for today's dashboard view)
  if (date) {
    bookings = bookings.filter((b) => b.date === date);
  }

  // Filter by month (YYYY-MM format, for monthly overview)
  if (month) {
    bookings = bookings.filter((b) => b.date && b.date.startsWith(month));
  }

  return res.json({ itemList: bookings, count: bookings.length });
});

// ── GET /api/bookings/:id — booking/get ───────────────────────────────────────
router.get("/:id", (req, res) => {
  const warnings = [];
  const booking = bookingDao.get({ id: req.params.id });

  if (!booking) {
    return res.status(404).json({
      errors: [{ code: "bookingNotFound", message: "Booking not found.", params: { id: req.params.id } }],
      warnings,
    });
  }

  return res.json({ ...booking, warnings });
});

// ── PUT /api/bookings/:id — booking/update ────────────────────────────────────
router.put("/:id", (req, res) => {
  const dtoIn = req.body;
  const warnings = [];

  // 1.2 Unsupported keys
  const unsupportedKeys = getUnsupportedKeys(dtoIn, ALLOWED_UPDATE_KEYS);
  if (unsupportedKeys.length > 0) {
    warnings.push({
      code: "unsupportedKeys",
      message: "DtoIn contains unsupported keys.",
      params: { unsupportedKeyList: unsupportedKeys },
    });
  }

  // 1.3 Type and value validation
  const invalidTypeKeyMap = {};
  const invalidValueKeyMap = {};

  if (dtoIn.vehicleId && typeof dtoIn.vehicleId !== "string")
    invalidTypeKeyMap.vehicleId = "Value must be a string.";
  if (dtoIn.serviceType && typeof dtoIn.serviceType !== "string")
    invalidTypeKeyMap.serviceType = "Value must be a string.";
  if (dtoIn.date && typeof dtoIn.date !== "string")
    invalidTypeKeyMap.date = "Value must be a string.";
  if (dtoIn.timeSlot && typeof dtoIn.timeSlot !== "string")
    invalidTypeKeyMap.timeSlot = "Value must be a string.";
  if (dtoIn.status && typeof dtoIn.status !== "string")
    invalidTypeKeyMap.status = "Value must be a string.";

  if (dtoIn.status && !VALID_STATUSES.includes(dtoIn.status)) {
    invalidValueKeyMap.status = `Value must be one of: ${VALID_STATUSES.join(", ")}.`;
  }

  if (
    Object.keys(invalidTypeKeyMap).length > 0 ||
    Object.keys(invalidValueKeyMap).length > 0
  ) {
    return res.status(400).json({
      errors: [{ code: "invalidDtoIn", message: "DtoIn is not valid.", params: { invalidTypeKeyMap, invalidValueKeyMap, missingKeyMap: {} } }],
      warnings,
    });
  }

  // 2. Check booking exists
  const existing = bookingDao.get({ id: req.params.id });
  if (!existing) {
    return res.status(404).json({
      errors: [{ code: "bookingNotFound", message: "Booking not found.", params: { id: req.params.id } }],
      warnings,
    });
  }

  // 2.1 If vehicleId changed, check new vehicle exists
  if (dtoIn.vehicleId && dtoIn.vehicleId !== existing.vehicleId) {
    const vehicle = vehicleDao.get({ id: dtoIn.vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        errors: [{ code: "vehicleNotFound", message: "Vehicle not found.", params: { vehicleId: dtoIn.vehicleId } }],
        warnings,
      });
    }
  }

  // 3. Update and return
  const updated = bookingDao.update({ id: req.params.id }, dtoIn);
  return res.json({ ...updated, warnings });
});

// ── DELETE /api/bookings/:id — booking/delete ─────────────────────────────────
router.delete("/:id", (req, res) => {
  const warnings = [];

  const existing = bookingDao.get({ id: req.params.id });
  if (!existing) {
    return res.status(404).json({
      errors: [{ code: "bookingNotFound", message: "Booking not found.", params: { id: req.params.id } }],
      warnings,
    });
  }

  const removed = bookingDao.remove({ id: req.params.id });
  return res.json({ ...removed, warnings });
});

module.exports = router;
