const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

////////////////////////////////////////////////////////////////////////
// Validation Middleware
////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////
// Route Middleware
////////////////////////////////////////////////////////////////////////

// Request: GET /orders
function list(req, res) {
  // Respond with the entire orders array
  res.json({ data: orders });
}

// Export route middleware for the router to call
module.exports = {
  list,
};
