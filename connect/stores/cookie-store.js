
CookieStore = {};

CookieStore.TOKEN_KEY = 'keycloak-token';

CookieStore.get = function(request) {
  var value = request.cookies[ CookieStore.TOKEN_KEY ];
  if ( value ) {
    try {
      return JSON.parse( value );
    } catch (err) {
      // ignore
    }
  }
};

var store = function(request, response) {
  response.cookie( CookieStore.TOKEN_KEY, JSON.stringify( this ) );
};

var unstore = function(request, response) {
  response.clearCookie( CookieStore.TOKEN_KEY );
};

CookieStore.wrap = function(grant) {
  grant.store   = store;
  grant.unstore = unstore;
};

module.exports = CookieStore;