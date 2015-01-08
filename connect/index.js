
var Q = require('q');

var crypto = require('crypto');

var BearerStore  = require('./stores/bearer-store');
var CookieStore  = require('./stores/cookie-store');
var SessionStore = require('./stores/session-store');

var Config        = require('keycloak-auth-utils').Config;
var GrantManager  = require('keycloak-auth-utils').GrantManager;

var fs   = require('fs');
var path = require('path');
var url  = require('url');
var http = require('http');

var AdminLogout   = require('./middleware/admin-logout');
var Logout        = require('./middleware/logout');
var PostAuth      = require('./middleware/post-auth' );
var GrantAttacher = require('./middleware/grant-attacher' );
var Protect       = require('./middleware/protect');

/**
 * Instantiate a Keycloak.
 *
 * The `config` and `keycloakConfig` hashes are both optional.
 *
 * The `config` hash, if provided, may include either `store`, pointing
 * to the actual session-store used by your application, or `cookies`
 * with boolean `true` as the value to support using cookies as your
 * authentication store.
 *
 * A session-based store is recommended, as it allows more assured control
 * from the Keycloak console to explicitly logout some or all sessions.
 *
 * In all cases, also, authentication through a Bearer authentication
 * header is supported for non-interactive APIs.
 *
 * The `keycloakConfig` object, by default, is populated by the contents of
 * a `keycloak.json` file installed alongside your application, copied from
 * the Keycloak administration console when you provision your application.
 *
 * @constructor
 *
 * @param      {Object}    config          Configuration for the Keycloak connector.
 * @param      {Object}    keycloakConfig  Keycloak-specific configuration.
 *
 * @return     {Keycloak}  A constructed Keycloak object.
 *
 */
function Keycloak(config, keycloakConfig) {

  // If keycloakConfig is null, Config() will search for `keycloak.json`.
  this.config = new Config(keycloakConfig);

  this.grantManager = new GrantManager( this.config );

  this.stores = [ BearerStore ];

  if ( config && config.store && config.cookies ) {
    throw new Error( "Either `store` or `cookies` may be set, but not both" );
  }

  if ( config && config.store ) {
    this.stores.push( new SessionStore( config.store ) );
  } else if ( config && config.cookies ) {
    this.stores.push( CookieStore );
  }
}


/**
 * Obtain an array of middleware for use in your application.
 *
 * Generally this should be installed at the root of your application,
 * as it provides general wiring for Keycloak interaction, without actually
 * causing Keycloak to get involved with any particular URL until asked
 * by using `protect(...)`.
 *
 * Example:
 *
 *     var app = express();
 *     var keycloak = new Keycloak();
 *     app.use( keycloak.middleware() );
 *
 * Options:
 *
 *  - `logout` URL for logging a user out. Defaults to `/logout`.
 *  - `admin` Root URL for Keycloak admin callbacks.  Defaults to `/`.
 *
 * @param {Object} options Optional options for specifying details.
 */
Keycloak.prototype.middleware = function(options) {

  options.logout = options.logout || '/logout';
  options.admin  = options.admin  || '/';

  var middlewares = [];

  middlewares.push( PostAuth(this) );
  middlewares.push( AdminLogout(this, options.admin) );
  middlewares.push( GrantAttacher(this) );
  middlewares.push( Logout(this, options.logout) );

  return middlewares;
};

/**
 * Apply protection middleware to an application or specific URL.
 *
 * If no `spec` parameter is provided, the subsequent handlers will
 * be invoked if the user is authenticated, regardless of what roles
 * he or she may or may not have.
 *
 * If a user is not currently authenticated, the middleware will cause
 * the authentication workflow to begin by redirecting the user to the
 * Keycloak installation to login.  Upon successful login, the user will
 * be redirected back to the originally-requested URL, fully-authenticated.
 *
 * If a `spec` is provided, the same flow as above will occur to ensure that
 * a user it authenticated.  Once authenticated, the spec will then be evaluated
 * to determine if the user may or may not access the following resource.
 *
 * The `spec` may be either a `String`, specifying a single required role,
 * or a function to make more fine-grained determination about access-control
 *
 * If the `spec` is a `String`, then the string will be interpreted as a
 * role-specification according to the following rules:
 *
 *  - If the string starts with `realm:`, the suffix is treated as the name
 *    of a realm-level role that is required for the user to have access.
 *  - If the string contains a colon, the portion before the colon is treated
 *    as the name of an application within the realm, and the portion after the
 *    colon is treated as a role within that application.  The user then must have
 *    the named role within the named application to proceed.
 *  - If the string contains no colon, the entire string is interpreted as
 *    as the name of a role within the current application (defined through
 *    the installed `keycloak.json` as provisioned within Keycloak) that the
 *    user must have in order to proceed.
 *
 * Example
 *
 *     // Users must have the `special-people` role within this application
 *     app.get( '/special/:page', keycloak.protect( 'special-people' ), mySpecialHandler );
 *
 * If the `spec` is a function, it may take up to two parameters in order to
 * assist it in making an authorization decision: the access token, and the
 * current HTTP request.  It should return `true` if access is allowed, otherwise
 * `false`.
 *
 * The `token` object has a method `hasRole(...)` which follows the same rules
 * as above for `String`-based specs.
 *
 *     // Ensure that users have either `nicepants` realm-level role, or `mr-fancypants` app-level role.
 *     function pants(token, request) {
 *       return token.hasRole( 'realm:nicepants') || token.hasRole( 'mr-fancypants');
 *     }
 *
 *     app.get( '/fancy/:page', keycloak.protect( pants ), myPantsHandler );
 *
 * With no spec, simple authentication is all that is required:
 *
 *     app.get( '/complain', keycloak.protect(), complaintHandler );
 *
 * @param {String} spec The protection spec (optional)
 */
Keycloak.prototype.protect = function(spec) {
  return Protect( this, spec );
};


/*! ignore */
Keycloak.prototype.getGrant = function(request, response) {

  var deferred = Q.defer();

  var rawData;

  for ( var i = 0 ; i < this.stores.length ; ++i ) {
    rawData = this.stores[i].get( request );
    if ( rawData ) {
      store = this.stores[i];
      break;
    }
  }

  if ( rawData ) {
    var grant = this.grantManager.createGrant( rawData );
    var self = this;

    this.grantManager.ensureFreshness(grant)
      .then( function(grant) {
        self.storeGrant( grant, request, response );
        deferred.resolve( grant );
      });

    return deferred.promise;
  }

  deferred.reject();
  return deferred.promise;
};

Keycloak.prototype.storeGrant = function(grant, request, response) {
  if ( this.stores.length < 2 ) {
    // cannot store, bearer-only, this is weird
    return;
  }

  this.stores[1].wrap( grant );
  grant.store(request, response);
  return grant;
};

Keycloak.prototype.unstoreGrant = function(sessionId) {
  if ( this.stores.length < 2 ) {
    // cannot unstore, bearer-only, this is weird
    return;
  }

  this.stores[1].clear( sessionId );
};

Keycloak.prototype.getGrantFromCode = function(code, request, response) {
  if ( this.stores.length < 2 ) {
    // bearer-only, cannot do this;
    throw new Error( "Cannot exchange code for grant in bearer-only mode" );
  }

  var sessionId = this.stores[1].getId( request );

  var self = this;
  return this.grantManager.obtainFromCode( code, sessionId )
    .then( function(grant) {
      self.storeGrant(grant, request, response);
      return grant;
    });
};

Keycloak.prototype.loginUrl = function(uuid, redirectUrl ) {
  return this.config.realmUrl + '/tokens/login?client_id=' + encodeURIComponent( this.config.clientId ) +
    '&state=' + encodeURIComponent( uuid ) +
    '&redirect_uri=' + encodeURIComponent( redirectUrl );
};

Keycloak.prototype.logoutUrl = function(redirectUrl) {
  return this.config.realmUrl + '/tokens/logout?redirect_uri=' + encodeURIComponent( redirectUrl );
};






module.exports = Keycloak;
