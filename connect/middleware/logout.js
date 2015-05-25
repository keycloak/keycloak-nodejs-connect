var proxyUtils = require('./../proxy-utils');

module.exports = function(keycloak, logoutUrl) {
  return function(request, response, next) {

    if ( request.url != logoutUrl ) {
      return next();
    }

    if ( request.auth.grant ) {
      keycloak.deauthenticated( request );
      request.auth.grant.unstore(request, response);
      delete request.auth.grant;
    }

    var protocol = request.protocol,
        host = request.hostname,
        port = request.app.settings.port || 3000;

    if (request.app.get('trust proxy')) {
        port = request.headers['x-forwarded-port'] || request.app.settings.port ;
    }

    var redirectUrl = protocol + '://' + host + proxyUtils.portForRedirectUrl(port, protocol) + '/';

    var keycloakLogoutUrl = keycloak.logoutUrl(redirectUrl);

    response.redirect( keycloakLogoutUrl );
  };
};
