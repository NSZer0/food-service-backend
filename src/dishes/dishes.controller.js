const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Validation Middleware
function requestDataHasProperty(propertyName) {
  return function (req, res, next) {
    // Get the body data from the request
    const { data = {} } = req.body;
    // Make sure the property exists and is not empty
    if (data[propertyName]) {
      // If property is 'price' make sure it's a number and greater than 0
      if (propertyName === "price" && ((typeof price !== "number") || (price <= 0))) {
        // Invalid price data, return an error
        return next({ status: 400, message: "Dish must have a price that is an integer greater than 0" });
      }

      // Data is valid, go to the next function
      return next();
    }

    // Invalid data, return an error
    next({ status: 400, message: `Dish must include a ${propertyName}` });
  };
}

// Route Middleware
function list(req, res) {
  res.json({ data: dishes });
}

module.exports = {
  list,
};
