
module.exports = function(request, response, next) {
  request.kauth = {};
  next();
};
