/*!
 * Copyright 2014 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* jshint sub: true */

var Q = require('q');

var URL    = require('url');
var http   = require('http');
var https  = require('https');
var crypto = require('crypto');

var Form = require('./form');
var Grant = require('./grant');
var Token = require('./token');

/**
 * Construct a grant manager.
 *
 * @param {Config} config Config object.
 *
 * @constructor
 */
function GrantManager(config) {
  this.realmUrl  = config.realmUrl;
  this.clientId  = config.clientId;
  this.secret    = config.secret;
  this.publicKey = config.publicKey;
  this.notBefore = 0;
}

/**
 * Use the direct grant API to obtain a grant from Keycloak.
 *
 * The direct grant API must be enabled for the configured realm
 * for this method to work. This function ostensibly provides a
 * non-interactive, programatic way to login to a Keycloak realm.
 *
 * This method can either accept a callback as the last parameter
 * or return a promise.
 *
 * @param {String} username The username.
 * @param {String} password The cleartext password.
 * @param {Function} callback Optional callback, if not using promises.
 */
GrantManager.prototype.obtainDirectly = function(username, password, callback) {
  var deferred = Q.defer();

  var self = this;

  var url = this.realmUrl + '/tokens/grants/access';

  var options = URL.parse( url );
  var protocol = this.getProtocol(options);

  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  var params = new Form({
    username: username,
    password: password,
  });

  if ( this.public ) {
    params.set( 'client_id', this.clientId );
  } else {
    options.headers['Authorization'] = 'Basic ' + new Buffer( this.clientId + ':' + this.secret ).toString( 'base64' );
  }

  var req = protocol.request( options, function(response) {
    if ( response.statusCode < 200 || response.statusCode > 299 ) {
      return deferred.reject( response.statusCode + ':' + http.STATUS_CODES[ response.statusCode ] );
    }
    var json = '';
    response.on('data', function(d) {
      json += d.toString();
    });
    response.on( 'end', function() {
      try {
        return deferred.resolve( self.createGrant( json ) );
      } catch (err) {
        return deferred.reject( err );
      }
    });
  });

  req.write( params.encode() );
  req.end();

  return deferred.promise.nodeify( callback );
};


/**
 * Obtain a grant from a previous interactive login which results in a code.
 *
 * This is typically used by servers which receive the code through a
 * redirect_uri when sending a user to Keycloak for an interactive login.
 *
 * An optional session ID and host may be provided if there is desire for
 * Keycloak to be aware of this information.  They may be used by Keycloak
 * when session invalidation is triggered from the Keycloak console itself
 * during its postbacks to `/k_logout` on the server.
 *
 * This method returns or promise or may optionally take a callback function.
 *
 * @param {String} code The code from a successful login redirected from Keycloak.
 * @param {String} sessionId Optional opaque session-id.
 * @param {String} sessionHost Optional session host for targetted Keycloak console post-backs.
 * @param {Function} callback Optional callback, if not using promises.
 */
GrantManager.prototype.obtainFromCode = function(request, code, sessionId, sessionHost, callback) {
  var deferred = Q.defer();
  var self = this;

  var redirectUri = encodeURIComponent( request.session.auth_redirect_uri );

  var params = 'code=' + code + '&application_session_state=' + sessionId + '&redirect_uri=' + redirectUri + '&application_session_host=' + sessionHost;

  var options = URL.parse( this.realmUrl + '/tokens/access/codes' );
  var protocol = this.getProtocol(options);

  options.method = 'POST';

  options.headers = {
    'Content-Length': params.length,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + new Buffer( this.clientId + ':' + this.secret ).toString('base64' ),
  };

  var request = protocol.request( options, function(response) {
    var json = '';
    response.on('data', function(d) {
      json += d.toString();
    });
    response.on( 'end', function() {
      try {
        var grant = self.createGrant( json );
        return deferred.resolve( grant );
      } catch (err) {
        return deferred.reject( err );
      }
    });
  } );

  request.write( params );
  request.end();

  return deferred.promise.nodeify( callback );
};


/**
 * Ensure that a grant is *fresh*, refreshing if required & possible.
 *
 * If the access_token is not expired, the grant is left untouched.
 *
 * If the access_token is expired, and a refresh_token is available,
 * the grant is refreshed, in place (no new object is created),
 * and returned.
 *
 * If the access_token is expired and no refresh_token is available,
 * an error is provided.
 *
 * The method may either return a promise or take an optional callback.
 *
 * @param {Grant} grant The grant object to ensure freshness of.
 * @param {Function} callback Optional callback if promises are not used.
 */
GrantManager.prototype.ensureFreshness = function(grant, callback) {
  if ( ! grant.isExpired() ) {
    return Q(grant).nodeify( callback );
  }

  if ( ! grant.refresh_token ) {
    return Q.reject( new Error( "Unable to refresh without a refresh token" )).nodeify( callback );
  }

  var self = this;
  var deferred = Q.defer();

  var options = URL.parse( this.realmUrl + '/tokens/refresh' );

  options.method = 'POST';

  options.headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  var protocol = this.getProtocol(options);

  options.headers['Authorization'] = 'Basic ' + new Buffer( this.clientId + ':' + this.secret ).toString( 'base64' );

  var params = new Form({
    grant_type: 'refresh_token',
    refresh_token: grant.refresh_token.token,
  });

  var request = protocol.request( options, function(response) {
    var json = '';
    response.on( 'data', function(d) {
      json += d.toString();
    });
    response.on( 'end', function() {
      try {
        grant.update( self.createGrant( json ) );
        return deferred.resolve(grant);
      } catch (err) {
        return deferred.reject( err );
      }
    });

  });

  request.write( params.encode() );
  request.end();

  return deferred.promise.nodeify(callback);
};

/**
 * Perform live validation of an `access_token` against the Keycloak server.
 *
 * @param {Token|String} token The token to validate.
 * @param {Function} callback Callback function if not using promises.
 *
 * @return {boolean} `false` if the token is invalid, or the same token if valid.
 */
GrantManager.prototype.validateAccessToken = function(token, callback) {
  var deferred = Q.defer();

  var self = this;

  var url = this.realmUrl + '/tokens/validate';

  var options = URL.parse( url );
  var protocol = this.getProtocol(options);

  options.method = 'GET';
  
  var t;
  
  if ( typeof token == 'string' ) {
    t = token;
  } else {
    t = token.token;
  }
  
  var params = new Form({
    access_token: t,
  });
  
  options.path = options.path + '?' + params.encode();

  var req = protocol.request( options, function(response) {
    var json = '';
    response.on('data', function(d) {
      json += d.toString();
    });
    response.on( 'end', function() {
      var data = JSON.parse( json );
      if ( data.error ) {
        return deferred.resolve( false );
      }
      return deferred.resolve( token );
    });
  });

  req.end();

  return deferred.promise.nodeify( callback );

};

/**
 * Create a `Grant` object from a string of JSON data.
 *
 * This method creates the `Grant` object, including
 * the `access_token`, `refresh_token` and `id_token`
 * if available, and validates each for expiration and
 * against the known public-key of the server.
 *
 * @param {String} rawData The raw JSON string received from the Keycloak server or from a client.
 * @return {Grant} A validated Grant.
 */
GrantManager.prototype.createGrant = function(rawData) {

  var grantData = rawData;
  if (typeof rawData !== 'object')
    grantData = JSON.parse( grantData );

  var access_token;
  var refresh_token;
  var id_token;

  if ( grantData.access_token ) {
    access_token = new Token( grantData.access_token, this.clientId );
  }

  if ( grantData.refresh_token ) {
    refresh_token = new Token( grantData.refresh_token );
  }

  if ( grantData.id_token ) {
    id_token = new Token( grantData.id_token );
  }

  var grant = new Grant( {
    access_token: access_token,
    refresh_token: refresh_token,
    id_token: id_token,
    expires_in: grantData.expires_in,
    token_type: grantData.token_type,
  });

  grant.__raw = rawData;

  return this.validateGrant( grant );
};

/**
 * Validate the grant and all tokens contained therein.
 *
 * This method filters a grant (in place), by nulling out
 * any invalid tokens.  After this method returns, the
 * passed in grant will only contain valid tokens.
 *
 * @param {Grant} The grant to validate.
 */
GrantManager.prototype.validateGrant = function(grant) {
  grant.access_token  = this.validateToken( grant.access_token );
  grant.refresh_token = this.validateToken( grant.refresh_token );
  grant.id_token      = this.validateToken( grant.id_token );

  return grant;
};

/**
 * Validate a token.
 *
 * This method accepts a token, and either returns the
 * same token object, if valid, else, it returns `undefined`
 * if any of the following errors are seen:
 *
 * - The token was undefined in the first place.
 * - The token is expired.
 * - The token is not expired, but issued before the current *not before* timestamp.
 * - The token signature does not verify against the known realm public-key.
 *
 * @return {Token} The same token passed in, or `undefined`
 */
GrantManager.prototype.validateToken = function(token) {
  if ( ! token ) {
    return;
  }

  if ( token.isExpired() ) {
    return;
  }

  if ( token.content.iat < this.notBefore ) {
    return;
  }

  var verify = crypto.createVerify('RSA-SHA256');
  verify.update( token.signed );
  if ( ! verify.verify( this.publicKey, token.signature, 'base64' ) ) {
    return;
  }

  return token;
};

GrantManager.prototype.getAccount = function(token, callback) {
  var deferred = Q.defer();

  var self = this;

  var url = this.realmUrl + '/account';

  var options = URL.parse( url );

  options.method = 'GET';

  var t;

  if ( typeof token == 'string' ) {
    t = token;
  } else {
    t = token.token;
  }

  var protocol = this.getProtocol(options);

  options.headers = {
    'Authorization': 'Bearer ' + t,
    'Accept': 'application/json',
  };

  var req = protocol.request( options, function(response) {
    if ( response.statusCode < 200 || response.statusCode >= 300 ) {
      return deferred.reject( "Error fetching account" );
    }
    var json = '';
    response.on('data', function(d) {
      json += d.toString();
    });
    response.on( 'end', function() {
      var data = JSON.parse( json );
      if ( data.error ) {
        return deferred.reject( data );
      }
      return deferred.resolve( data );
    });
  });

  req.end();

  return deferred.promise.nodeify( callback );
};

GrantManager.prototype.getProtocol = function(options) {
  var protocol = http;

  if ( options.protocol == 'https:' ) {
    protocol = https;
  } else {
    protocol = http;
  }
  return protocol;
}

module.exports = GrantManager;
