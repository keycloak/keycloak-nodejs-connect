module.exports = function(keycloak, logoutUrl) {
  return function(request, response, next) {

    if ( request.url != logoutUrl ) {
      return next();
    }

    if ( request.kauth.grant ) {
      keycloak.deauthenticated( request );
      request.kauth.grant.unstore(request, response);
      delete request.kauth.grant;
    }

    var host = request.hostname;
    var port = request.app.settings.port || 3000;

    var redirectUrl = 'http://' + host + ( port == 80 ? '' : ':' + port ) + '/';

    var keycloakLogoutUrl = keycloak.logoutUrl(redirectUrl);

    response.redirect( keycloakLogoutUrl );
  };
};
