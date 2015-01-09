
module.exports = function(request, response, next) {
  request.auth = {};
  next();
};
