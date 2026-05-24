const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const FILE = path.join(__dirname, "../data/bookings.json");

function readAll() {
  const raw = fs.readFileSync(FILE, "utf-8");
  return JSON.parse(raw);
}

function writeAll(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf-8");
}

// create (uuObject) -> uuObject
function create(uuObject) {
  const all = readAll();
  const newObject = { id: uuidv4(), status: "Planned", ...uuObject };
  all.push(newObject);
  writeAll(all);
  return newObject;
}

// get (filter) -> uuObject
function get(filter) {
  const all = readAll();
  return all.find((item) => {
    return Object.keys(filter).every((key) => item[key] === filter[key]);
  }) || null;
}

// getAll (filter) -> uuObject[]
function getAll(filter = {}) {
  const all = readAll();
  if (Object.keys(filter).length === 0) return all;
  return all.filter((item) => {
    return Object.keys(filter).every((key) => item[key] === filter[key]);
  });
}

// update (filter, uuObject) -> uuObject
function update(filter, uuObject) {
  const all = readAll();
  const index = all.findIndex((item) => {
    return Object.keys(filter).every((key) => item[key] === filter[key]);
  });
  if (index === -1) return null;
  all[index] = { ...all[index], ...uuObject };
  writeAll(all);
  return all[index];
}

// remove (filter) -> uuObject
function remove(filter) {
  const all = readAll();
  const index = all.findIndex((item) => {
    return Object.keys(filter).every((key) => item[key] === filter[key]);
  });
  if (index === -1) return null;
  const removed = all[index];
  all.splice(index, 1);
  writeAll(all);
  return removed;
}

module.exports = { create, get, getAll, update, remove };
