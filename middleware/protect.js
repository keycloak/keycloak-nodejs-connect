var UUID = require('./../uuid' );

function forceLogin(keycloak, request, response) {
  var host = request.hostname;
  var headerHost = request.headers.host.split(':');
  var port = headerHost[1] || '';
  var protocol = request.protocol;

  var redirectUrl = protocol + '://' + host + ( port === '' ? '' : ':' + port ) + (request.originalUrl || request.url) + '?auth_callback=1';

  if ( request.session ) {
    request.session.auth_redirect_uri = redirectUrl;
  }

  var uuid = UUID();
  var loginURL = keycloak.loginUrl( uuid, redirectUrl );
  response.redirect( loginURL );
}

function simpleGuard(role,token) {
  return token.hasRole(role);
}

module.exports = function(keycloak, spec) {

  var guard;

  if ( typeof spec == 'function' ) {
    guard = spec;
  } else if ( typeof spec == 'string' ) {
    guard = simpleGuard.bind(undefined, spec);
  }

  return function protect(request, response, next) {
    if ( request.kauth && request.kauth.grant ) {
      if ( ! guard || guard( request.kauth.grant.access_token, request, response ) ) {
        return next();
      }

      return keycloak.accessDenied(request,response,next);
    }

    if (keycloak.config.bearerOnly){
      return keycloak.accessDenied(request,response,next);
    }else{
      forceLogin(keycloak, request, response);
    }

  };
};
