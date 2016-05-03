
module.exports = function setup(request, response, next) {
  request.kauth = {};
  next();
};
