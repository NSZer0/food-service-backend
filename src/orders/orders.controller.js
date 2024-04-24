const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
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

    // Invalid data, format the response message based on propertyName
    let responseMessage = `Order must include a ${propertyName}`;
    if (propertyName === "dishes")
      responseMessage = "Order must include a dish";
    else if (propertyName === "status")
      responseMessage = "Order must have a status of pending, preparing, out-for-delivery, delivered";

    // Return an error
    next({
      status: 400,
      message: responseMessage
    });
  };
}

// Validate the status property
function validateStatusForExistingOrder(req, res, next) {
  // Get the body data from the request
  const { data: { status } } = req.body;
  // Make sure the status property is 'delivered'
  if (status === "delivered") {
    // Data is valid, go to the next function
    return next();
  }

  // Invalid data, return an error
  next({
    status: 400,
    message: "A delivered order cannot be changed"
  });
}

// Validate the dishes property
function validateDishes(req, res, next) {
  // Get the body data from the request
  const { data: { dishes } } = req.body;
  // Make sure the dishes property is an array and has at least 1 item
  if (Array.isArray(dishes) && dishes.length > 0) {
    // Store the array to use later
    res.locals.dishes = dishes;
    return next(); // Data is valid, go to the next function
  }

  // Invalid data, return an error
  next({
    status: 400,
    message: "Order must include at least one dish"
  });
}

// Validate each dish has a valid quantity property
function validateDishesQuantity(req, res, next) {
  // Get the dishes array from res.locals
  const dishes = res.locals.dishes;
  // Check that the dish contains 'quantity' property.
  // Also check that quantity is a number, and that quantity is more than 0
  dishes.every((dish, index) => {
    if (!(dish.hasOwnProperty("quantity") && 
      Number.isInteger(dish["quantity"]) &&
      dish["quantity"] > 0))
    {
      // Invalid data, return an error
      return next({
        status: 400,
        message: `dish ${index} must have a quantity that is an integer greater than 0`
      });
    }
    return true; // Continue iteration
  });

  // Data is valid, go to the next function
  next();
}

// Verify that an order in the orders array has an id that matches the orderId in the request parameter
function orderExists(req, res, next) {
  // Get the orderId from request parameters
  const { orderId } = req.params;
  // Use find to set the order from the orders array matching the orderId
  const foundOrder = orders.find(order => order.id === orderId);
  if (foundOrder) { // Matching order found
    // Store the matching order object in res.locals to use in later functions in the route chain
    res.locals.order = foundOrder;
    // Go to the next function in the chain
    return next();
  }

  // No matching dish was found, return an error
  next({
    status: 404,
    message: `Order does not exist: ${orderId}.`,
  });
}

// Verify that the order id in the request body matches the orderId in the request parameter
function verifyOrderIdDataMatchesRoute(req, res, next) {
  // Get orderId from res.locals because it previously matched orderId from the route
  const orderId = res.locals.order.id;
  // Get the 'id' property from the request body
  const { data: { id } } = req.body;
  if (!id || id === orderId) { // IDs match, or an ID was not in the request body
    // Go to the next function in the chain
    return next();
  }

  // Mismatching IDs, return an error
  next({
    status: 404,
    message: `Order id does not match route id. Order: ${id}, Route: ${orderId}.`,
  });
}

// Verify that the order status is 'pending' before deleting
function verifyOrderIsPending(req, res, next) {
  // Get order from res.locals
  const foundOrder = res.locals.order;
  // Check that status is pending
  if (foundOrder.status === "pending") {
    // Go to the next function in the chain
    return next();
  }

  // Status is not pending, so we can't delete the order
  next({
    status: 404,
    message: "An order cannot be deleted unless it is pending",
  });
}

////////////////////////////////////////////////////////////////////////
// Route Middleware
////////////////////////////////////////////////////////////////////////

// Request: GET /orders
function list(req, res) {
  // Respond with the entire orders array
  res.json({ data: orders });
}

// Request: POST /orders
function create(req, res) {
  // Get the data from the request body
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  // Create the new dish object
  const newOrder = {
    id: nextId(), // Get the ID from nextId function
    deliverTo,
    mobileNumber,
    dishes,
  };
  // Add the new dish object to the array of dishes
  orders.push(newOrder);
  // Respond with a status of 201 and an object containing the new dish
  res.status(201).json({ data: newOrder });
}

// Request: GET /orders/:orderId
function read(req, res, next) {
  // Respond with the order object stored in res.locals
  res.json({ data: res.locals.order });
};

// Request: PUT /orders/:orderId
function update(req, res, next) {
  // Get the matching order from res.locals
  const foundOrder = res.locals.order;
  // Get the new data from the request body
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  // Update the order
  foundOrder.deliverTo = deliverTo;
  foundOrder.mobileNumber = mobileNumber;
  foundOrder.status = status;
  foundOrder.dishes = dishes;

  // Respond with the updated dish
  res.json({ data: foundOrder });
}

// Request: DELETE /orders/:orderId
function destroy(req, res) {
  // Get the order id from res.locals
  const orderId = res.locals.order.id;
  // Find the index of the matching order in the array of orders
  const index = orders.findIndex((order) => order.id === orderId);
  // Remove the matching index from the array of orders
  const deletedOrder = orders.splice(index, 1);
  // send a response with no message
  res.sendStatus(204);
}

// Export route middleware for the router to call
module.exports = {
  list,
  create: [
    requestDataHasProperty("deliverTo"),
    requestDataHasProperty("mobileNumber"),
    requestDataHasProperty("dishes"),
    validateDishes,
    validateDishesQuantity,
    create
  ], // Run validation checks before calling update
  read: [orderExists, read], // Run validation checks before calling update
  update: [
    orderExists,
    requestDataHasProperty("deliverTo"),
    requestDataHasProperty("mobileNumber"),
    requestDataHasProperty("status"),
    validateStatusForExistingOrder,
    requestDataHasProperty("dishes"),
    validateDishes,
    validateDishesQuantity,
    verifyOrderIdDataMatchesRoute,
    update
  ], // Run validation checks before calling update
  delete: [orderExists, verifyOrderIsPending, destroy],
};
