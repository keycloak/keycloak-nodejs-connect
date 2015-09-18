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

    var host = request.hostname;
    var headerHost = request.headers.host.split(':');
    var port = headerHost[1] || '';

    var redirectUrl = request.protocol + '://' + host + ( port == '' ? '' : ':' + port ) + '/';

    var keycloakLogoutUrl = keycloak.logoutUrl(redirectUrl);

    response.redirect( keycloakLogoutUrl );
  };
};
