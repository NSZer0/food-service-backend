const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

////////////////////////////////////////////////////////////////////////
// Validation Middleware
////////////////////////////////////////////////////////////////////////

// Validate the the request body contains a specific property
function requestDataHasProperty(propertyName) {
  return function (req, res, next) {
    // Get the body data from the request
    const { data = {} } = req.body;
    // Make sure the property exists and is not empty
    if (data[propertyName])    
      return next(); // Data is valid, go to the next function

    // Invalid data, return an error
    next({
      status: 400,
      message: `Dish must include a ${propertyName}`
    });
  };
}

// Validate that the price property is a number and above 0
function priceDataIsValid(req, res, next) {
  const { data: { price }  = {} } = req.body;
  // Test for property 'price' is a number and greater than 0
  if (price <= 0 || !Number.isInteger(price)) {
    return next({
      status: 400,
      message: "Dish must have a price that is an integer greater than 0"
    });
  }

  // Price is valid, go to the next function
  next();
}

// Validate that the image_url property is valid
function imageUrlDataIsValid(req, res, next) {
  const { data: { image_url }  = {} } = req.body;
  // Test property 'image_url' is a valid url
  try {
    // Thorws an error on malformed url
    let url = new URL(image_url);
  }
  catch (error) {
    return next({
      status: 400,
      message: "Malformed URL in property 'image_url'."
    });
  }
  finally {
    // Url is valid, go to the next function
    next();
  }
}

// Verify that a dish in the dishes array has an id that matches the dishId in the request parameter
function dishExists(req, res, next) {
  // Get the dishId from request parameters
  const { dishId } = req.params;
  // Use find to set the dish from dishes array matching dishId
  const foundDish = dishes.find(dish => dish.id === dishId);
  if (foundDish) { // Matching dish found
    // Store the matchin dish object in res.locals to use in later functions in the route chain
    res.locals.dish = foundDish;
    // Go to the next function in the chain
    return next();
  }

  // No matching dish was found, return an error
  next({
    status: 404,
    message: `Dish does not exist: ${dishId}.`,
  });
};

// Verify that the dish id in the request body matches the dishId in the request parameter

////////////////////////////////////////////////////////////////////////
// Route Middleware
////////////////////////////////////////////////////////////////////////

// Request: GET /dishes
function list(req, res) {
  // Respond with the entire dishes array
  res.json({ data: dishes });
}

// Request: POST /dishes
function create(req, res) {
  // Get the data from the request body
  const { data: { name, description, price, image_url } = {} } = req.body;
  // Create the new dish object
  const newDish = {
    id: nextId(), // Get the ID from nextId function
    name,
    description,
    price,
    image_url,
  };
  // Add the new dish object to the array of dishes
  dishes.push(newDish);
  // Respond with a status of 201 and an object containing the new dish
  res.status(201).json({ data: newDish });
}

// Request: GET /dishes/:dishId
function read(req, res, next) {
  // Respond with the dish object stored in res.locals
  res.json({ data: res.locals.dish });
};

// Export route middleware for the router to call
module.exports = {
  list,
  create: [
    requestDataHasProperty("name"),
    requestDataHasProperty("description"),
    requestDataHasProperty("price"),
    requestDataHasProperty("image_url"),
    priceDataIsValid,
    imageUrlDataIsValid,
    create
  ], // Run validation checks before calling create
  read: [dishExists, read],
};
