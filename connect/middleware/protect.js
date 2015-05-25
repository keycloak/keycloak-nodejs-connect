var UUID = require('./../uuid' ),
    proxyUtils = require('./../proxy-utils.js');

function forceLogin(keycloak, request, response) {
  var protocol = request.protocol,
      host = request.hostname,
      port = request.app.settings.port || 3000;

  // check to see if we are behind proxy
  if (request.app.get('trust proxy')) {
    port = request.headers['x-forwarded-port'] || request.app.settings.port ;
  }

  var redirectUrl = protocol + '://'+ host + proxyUtils.portForRedirectUrl(port, protocol) + request.url + '?auth_callback=1';

  request.session.auth_redirect_uri = redirectUrl;

  var uuid = UUID();
  var loginURL = keycloak.loginUrl( uuid, redirectUrl );
  response.redirect( loginURL );
}

function simpleGuard(role,token) {
  if ( role.indexOf( "app:" ) === 0 ) {
    return token.hasApplicationRole( role.substring( 4 ) );
  }
  if ( role.indexOf( "realm:" ) === 0 ) {
    return token.hasRealmRole( role.substring( 6 ) );
  }

  return false;
}

module.exports = function(keycloak, spec) {

  var guard;

  if ( typeof spec === 'function' ) {
    guard = spec;
  } else if ( typeof spec === 'string' ) {
    guard = simpleGuard.bind(undefined, spec);
  }

  return function(request, response, next) {
    if ( request.auth && request.auth.grant ) {
      if ( ! guard || guard( request.auth.grant.access_token, request, response ) ) {
        return next();
      }

      return keycloak.accessDenied(request,response,next);
    }

    forceLogin(keycloak, request, response);
  };
};
