'use strict';

module.exports = function (resolver) {
  return function setup (request, response, next) {
    request.kauth = {realmName: resolver(request)};
    if (!request.kauth.realmName) {
      throw new Error('Realm name cannot be resolved');
    }
    next();
  };
};
