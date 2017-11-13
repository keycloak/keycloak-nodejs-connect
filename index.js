/*
 * Copyright 2016 Red Hat Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var BearerStore = require('./stores/bearer-store');
var CookieStore = require('./stores/cookie-store');
var SessionStore = require('./stores/session-store');

var Config = require('./middleware/auth-utils/config');
var GrantManager = require('./middleware/auth-utils/grant-manager');
var Setup = require('./middleware/setup');
var Admin = require('./middleware/admin');
var Logout = require('./middleware/logout');
var PostAuth = require('./middleware/post-auth');
var GrantAttacher = require('./middleware/grant-attacher');
var Protect = require('./middleware/protect');

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
function Keycloak (config, keycloakConfig) {
  // If keycloakConfig is null, Config() will search for `keycloak.json`.
  this.config = new Config(keycloakConfig);

  this.grantManager = new GrantManager(this.config);

  this.stores = [ BearerStore ];

  if (!config) {
    throw new Error('Adapter configuration must be provided.');
  }

  // Add the custom scope value
  this.config.scope = config.scope;

  if (config && config.store && config.cookies) {
    throw new Error('Either `store` or `cookies` may be set, but not both');
  }

  if (config && config.store) {
    this.stores.push(new SessionStore(config.store));
  } else if (config && config.cookies) {
    this.stores.push(CookieStore);
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
Keycloak.prototype.middleware = function (options) {
  if (!options) {
    options = {logout: '', admin: ''};
  }

  options.logout = options.logout || '/logout';
  options.admin = options.admin || '/';

  var middlewares = [];

  middlewares.push(Setup);
  middlewares.push(PostAuth(this));
  middlewares.push(Admin(this, options.admin));
  middlewares.push(GrantAttacher(this));
  middlewares.push(Logout(this, options.logout));

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
Keycloak.prototype.protect = function (spec) {
  return Protect(this, spec);
};

/**
 * Callback made upon successful authentication of a user.
 *
 * By default, this a no-op, but may assigned to another
 * function for application-specific login which may be useful
 * for linking authentication information from Keycloak to
 * application-maintained user information.
 *
 * The `request.kauth.grant` object contains the relevant tokens
 * which may be inspected.
 *
 * For instance, to obtain the unique subject ID:
 *
 *     request.kauth.grant.id_token.sub => bf2056df-3803-4e49-b3ba-ff2b07d86995
 *
 * @param {Object} request The HTTP request.
 */
Keycloak.prototype.authenticated = function (request) {
  // no-op
};

/**
 * Callback made upon successful de-authentication of a user.
 *
 * By default, this is a no-op, but may be used by the application
 * in the case it needs to remove information from the user's session
 * or otherwise perform additional logic once a user is logged out.
 *
 * @param {Object} request The HTTP request.
 */
Keycloak.prototype.deauthenticated = function (request) {
  // no-op
};

/**
 * Replaceable function to handle access-denied responses.
 *
 * In the event the Keycloak middleware decides a user may
 * not access a resource, or has failed to authenticate at all,
 * this function will be called.
 *
 * By default, a simple string of "Access denied" along with
 * an HTTP status code for 403 is returned.  Chances are an
 * application would prefer to render a fancy template.
 */
Keycloak.prototype.accessDenied = function (request, response) {
  response.status(403);
  response.end('Access denied');
};

/*! ignore */
Keycloak.prototype.getGrant = function (request, response) {
  var rawData;

  for (var i = 0; i < this.stores.length; ++i) {
    rawData = this.stores[i].get(request);
    if (rawData) {
      // store = this.stores[i];
      break;
    }
  }

  var grantData = rawData;
  if (typeof (grantData) === 'string') {
    grantData = JSON.parse(grantData);
  }

  if (grantData && !grantData.error) {
    var self = this;
    return this.grantManager.createGrant(JSON.stringify(grantData))
    .then(grant => { return this.grantManager.ensureFreshness(grant); })
    .then(grant => {
      self.storeGrant(grant, request, response);
      return grant;
    })
    .catch(() => { return Promise.reject(); });
  }

  return Promise.reject();
};

Keycloak.prototype.storeGrant = function (grant, request, response) {
  if (this.stores.length < 2) {
    // cannot store, bearer-only, this is weird
    return;
  }
  if (!grant) {
    this.accessDenied(request, response);
    return;
  }

  this.stores[1].wrap(grant);
  grant.store(request, response);
  return grant;
};

Keycloak.prototype.unstoreGrant = function (sessionId) {
  if (this.stores.length < 2) {
    // cannot unstore, bearer-only, this is weird
    return;
  }

  this.stores[1].clear(sessionId);
};

Keycloak.prototype.getGrantFromCode = function (code, request, response) {
  if (this.stores.length < 2) {
    // bearer-only, cannot do this;
    throw new Error('Cannot exchange code for grant in bearer-only mode');
  }

  var sessionId = request.session.id;

  var self = this;
  return this.grantManager.obtainFromCode(request, code, sessionId)
    .then(function (grant) {
      self.storeGrant(grant, request, response);
      return grant;
    });
};

Keycloak.prototype.loginUrl = function (uuid, redirectUrl) {
  return this.config.realmUrl +
  '/protocol/openid-connect/auth' +
  '?client_id=' + encodeURIComponent(this.config.clientId) +
  '&state=' + encodeURIComponent(uuid) +
  '&redirect_uri=' + encodeURIComponent(redirectUrl) +
  '&scope=' + encodeURIComponent(this.config.scope ? 'openid ' + this.config.scope : 'openid') +
  '&response_type=code';
};

Keycloak.prototype.logoutUrl = function (redirectUrl) {
  return this.config.realmUrl +
  '/protocol/openid-connect/logout' +
  '?redirect_uri=' + encodeURIComponent(redirectUrl);
};

Keycloak.prototype.accountUrl = function () {
  return this.config.realmUrl + '/account';
};

Keycloak.prototype.getAccount = function (token) {
  return this.grantManager.getAccount(token);
};

Keycloak.prototype.redirectToLogin = function (request) {
  return !this.config.bearerOnly;
};

module.exports = Keycloak;
