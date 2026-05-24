const express = require("express");
const router = express.Router();
const vehicleDao = require("../dao/vehicleDao");

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_CREATE_KEYS = ["make", "model", "year", "licensePlate"];
const ALLOWED_UPDATE_KEYS = ["make", "model", "year", "licensePlate"];

function getUnsupportedKeys(body, allowedKeys) {
  return Object.keys(body).filter((k) => !allowedKeys.includes(k));
}

// ── POST /api/vehicles — vehicle/create ──────────────────────────────────────
router.post("/", (req, res) => {
  const dtoIn = req.body;
  const warnings = [];
  const errors = [];

  // 1.2 Check unsupported keys
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
  if (!dtoIn.make)         missingKeyMap.make = "String is required.";
  if (!dtoIn.model)        missingKeyMap.model = "String is required.";
  if (!dtoIn.year)         missingKeyMap.year = "Number is required.";
  if (!dtoIn.licensePlate) missingKeyMap.licensePlate = "String is required.";

  const invalidTypeKeyMap = {};
  if (dtoIn.make && typeof dtoIn.make !== "string")
    invalidTypeKeyMap.make = "Value must be a string.";
  if (dtoIn.model && typeof dtoIn.model !== "string")
    invalidTypeKeyMap.model = "Value must be a string.";
  if (dtoIn.year && typeof dtoIn.year !== "number")
    invalidTypeKeyMap.year = "Value must be a number.";
  if (dtoIn.licensePlate && typeof dtoIn.licensePlate !== "string")
    invalidTypeKeyMap.licensePlate = "Value must be a string.";

  if (
    Object.keys(missingKeyMap).length > 0 ||
    Object.keys(invalidTypeKeyMap).length > 0
  ) {
    errors.push({
      code: "invalidDtoIn",
      message: "DtoIn is not valid.",
      params: { invalidTypeKeyMap, invalidValueKeyMap: {}, missingKeyMap },
    });
    return res.status(400).json({ errors, warnings });
  }

  // 2. Create vehicle
  const vehicle = vehicleDao.create({
    make: dtoIn.make,
    model: dtoIn.model,
    year: dtoIn.year,
    licensePlate: dtoIn.licensePlate,
  });

  // 3. Return dtoOut
  return res.status(201).json({ ...vehicle, warnings });
});

// ── GET /api/vehicles — vehicle/list ─────────────────────────────────────────
router.get("/", (req, res) => {
  const vehicles = vehicleDao.getAll();
  return res.json({ itemList: vehicles, count: vehicles.length });
});

// ── GET /api/vehicles/:id — vehicle/get ──────────────────────────────────────
router.get("/:id", (req, res) => {
  const warnings = [];
  const vehicle = vehicleDao.get({ id: req.params.id });

  if (!vehicle) {
    return res.status(404).json({
      errors: [{ code: "vehicleNotFound", message: "Vehicle not found.", params: { id: req.params.id } }],
      warnings,
    });
  }

  return res.json({ ...vehicle, warnings });
});

// ── PUT /api/vehicles/:id — vehicle/update ────────────────────────────────────
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

  // 1.3 Type validation
  const invalidTypeKeyMap = {};
  if (dtoIn.make && typeof dtoIn.make !== "string")
    invalidTypeKeyMap.make = "Value must be a string.";
  if (dtoIn.model && typeof dtoIn.model !== "string")
    invalidTypeKeyMap.model = "Value must be a string.";
  if (dtoIn.year && typeof dtoIn.year !== "number")
    invalidTypeKeyMap.year = "Value must be a number.";
  if (dtoIn.licensePlate && typeof dtoIn.licensePlate !== "string")
    invalidTypeKeyMap.licensePlate = "Value must be a string.";

  if (Object.keys(invalidTypeKeyMap).length > 0) {
    return res.status(400).json({
      errors: [{ code: "invalidDtoIn", message: "DtoIn is not valid.", params: { invalidTypeKeyMap, invalidValueKeyMap: {}, missingKeyMap: {} } }],
      warnings,
    });
  }

  // 2. Check vehicle exists
  const existing = vehicleDao.get({ id: req.params.id });
  if (!existing) {
    return res.status(404).json({
      errors: [{ code: "vehicleNotFound", message: "Vehicle not found.", params: { id: req.params.id } }],
      warnings,
    });
  }

  // 3. Update and return
  const updated = vehicleDao.update({ id: req.params.id }, dtoIn);
  return res.json({ ...updated, warnings });
});

// ── DELETE /api/vehicles/:id — vehicle/delete ─────────────────────────────────
router.delete("/:id", (req, res) => {
  const warnings = [];

  const existing = vehicleDao.get({ id: req.params.id });
  if (!existing) {
    return res.status(404).json({
      errors: [{ code: "vehicleNotFound", message: "Vehicle not found.", params: { id: req.params.id } }],
      warnings,
    });
  }

  const removed = vehicleDao.remove({ id: req.params.id });
  return res.json({ ...removed, warnings });
});

module.exports = router;
