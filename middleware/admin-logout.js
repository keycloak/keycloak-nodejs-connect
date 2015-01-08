function AdminLogout(keycloak, url) {
  this._keycloak = keycloak;
  if ( url[ url.length - 1 ] != '/' ) {
    url += '/;';
  }
  this._url = url + 'k_logout';
}

AdminLogout.prototype.getFunction = function() {
  return this._adminLogout.bind(this);
};

module.exports = function(keycloak, adminUrl) {

  var url = adminUrl;
  if ( url[ url.length - 1 ] != '/' ) {
    url = url + '/';
  }

  url += 'k_logout';

  return function(request, response, next) {
    if ( request.url != url ) {
      return next();
    }

    var data = '';
    var self = this;

    request.on( 'data', function(d) {
      data += d.toString();
    });

    request.on( 'end', function() {
      var parts = data.split('.');
      var payload =  JSON.parse( new Buffer( parts[1], 'base64' ).toString() );
      if ( payload.action == 'LOGOUT' ) {
        var sessionIDs = payload.adapterSessionIds;
        if ( ! sessionIDs ) {
          keycloak.grantManager.notBefore = payload.notBefore;
          response.send( 'ok' );
          return;
        }
        if ( sessionIDs && sessionIDs.length > 0 ) {
          var seen = 0;
          sessionIDs.forEach( function(id) {
            keycloak.unstoreGrant(id);
            ++seen;
            if ( seen == sessionIDs.length ) {
              response.send( 'ok' );
            }
          });
        } else {
          response.send( 'ok' );
        }
      }
    });
  };
};

