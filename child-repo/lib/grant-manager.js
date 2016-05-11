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
'use strict';

const URL    = require('url');
const http   = require('http');
const https  = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

const Form = require('./form');
const Grant = require('./grant');
const Token = require('./token');

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
  this.public    = config.public;
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
GrantManager.prototype.obtainDirectly = function obtainDirectly (username, password, callback) {
  const url = this.realmUrl + '/protocol/openid-connect/token';
  const options = URL.parse( url );

  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const params = new Form({
    client_id: this.clientId
  });

  if ( this.public ) {
    params.set('grant_type', 'password');
    params.set('username', username);
    params.set('password', password);
  } else {
    params.set('grant_type', 'client_credentials');
    params.set('client_secret', this.secret);
    options.headers['Authorization'] = 'Basic ' + new Buffer( this.clientId + ':' + this.secret ).toString( 'base64' );
  }

  const promise = new Promise((resolve, reject) => {
    const req = getProtocol(options).request( options, (response) => {
      if ( response.statusCode < 200 || response.statusCode > 299 ) {
        return reject( response.statusCode + ':' + http.STATUS_CODES[ response.statusCode ] );
      }
      let json = '';
      response.on('data', (d) => json += d.toString());
      response.on( 'end', () => {
        try {
          resolve( this.createGrant( json ) );
        } catch (err) {
          reject( err );
        }
      });
    });

    req.write( params.encode() );
    req.end();
  });

  return nodeify( promise, callback );
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
GrantManager.prototype.obtainFromCode = function obtainFromCode (request, code, sessionId, sessionHost, callback) {
  const queryObj = {
    application_session_state: sessionId,
    application_session_host: sessionHost,
    code: code,
    grant_type: 'authorization_code',
    client_id: this.clientId,
    redirect_uri: request.session.auth_redirect_uri
  };
  const params = querystring.stringify(queryObj);
  const options = URL.parse( this.realmUrl + '/protocol/openid-connect/token' );

  options.method = 'POST';
  options.headers = {
    'Content-Length': params.length,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const promise = new Promise((resolve, reject) => {
    const req = getProtocol(options).request( options, (response) => {
      let json = '';
      response.on('data', (d) => json += d.toString());
      response.on( 'end', () => {
        try {
          const grant = this.createGrant( json );
          resolve( grant );
        } catch (err) {
          reject( err );
        }
      });
    });
    req.write( params );
    req.end();
  });

  return nodeify( promise, callback );
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
GrantManager.prototype.ensureFreshness = function ensureFreshness(grant, callback) {
  if ( ! grant.isExpired() ) {
    return nodeify( Promise.resolve(grant), callback );
  }

  if ( ! grant.refresh_token ) {
    return nodeify( Promise.reject( new Error( "Unable to refresh without a refresh token" )), callback );
  }

  const options = URL.parse( this.realmUrl + '/protocol/openid-connect/token' );
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + new Buffer( this.clientId + ':' + this.secret ).toString( 'base64' )
  };

  const params = new Form({
    grant_type: 'refresh_token',
    refresh_token: grant.refresh_token.token
  });

  const promise = new Promise((resolve, reject) => {
    const request = getProtocol(options).request( options, (response) => {
      let json = '';
      response.on( 'data', (d) => json += d.toString() );
      response.on( 'end', () => {
        try {
          grant.update( this.createGrant( json ) );
          resolve(grant);
        } catch (err) {
          reject( err );
        }
      });
    });

    request.write( params.encode() );
    request.end();
  });
  return nodeify(promise, callback);
};

/**
 * Perform live validation of an `access_token` against the Keycloak server.
 *
 * @param {Token|String} token The token to validate.
 * @param {Function} callback Callback function if not using promises.
 *
 * @return {boolean} `false` if the token is invalid, or the same token if valid.
 */
GrantManager.prototype.validateAccessToken = function validateAccessToken (token, callback) {
  let t = token;
  if ( typeof token === 'object' ) {
    t = token.token;
  }

  const url = this.realmUrl + '/protocol/openid-connect/token/introspect';
  const options = URL.parse( url );
  options.method = 'POST';

  const params = new Form({
    token: t,
    client_secret: this.secret,
    client_id: this.clientId
  });

  options.headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + new Buffer( this.clientId + ':' + this.secret ).toString( 'base64' )
  };

  const promise = new Promise((resolve, reject) => {
    const req = getProtocol(options).request( options, (response) => {
      let json = '';
      response.on('data', (d) =>json += d.toString());
      response.on( 'end', () => {
        const data = JSON.parse( json );
        if ( !data.active )
          resolve( false );
        else
          resolve( token );
      });
    });
    req.write(params.encode());
    req.end();
  });
  return nodeify( promise, callback );
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
GrantManager.prototype.createGrant = function createGrant(rawData) {
  let grantData = rawData;
  if (typeof rawData !== 'object') grantData = JSON.parse( grantData );

  return this.validateGrant( new Grant({
    access_token: (grantData.access_token ? new Token( grantData.access_token, this.clientId ) : undefined),
    refresh_token: (grantData.refresh_token ?new Token( grantData.refresh_token ) : undefined),
    id_token: (grantData.id_token ? new Token( grantData.id_token ) : undefined),
    expires_in: grantData.expires_in,
    token_type: grantData.token_type,
    __raw: rawData
  }));
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
GrantManager.prototype.validateGrant = function validateGrant (grant) {
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
GrantManager.prototype.validateToken = function validateToken (token) {
  if ( !token || token.isExpired() || token.content.iat < this.notBefore ) return;
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update( token.signed );
  if ( ! verify.verify( this.publicKey, token.signature, 'base64' ) ) return;
  return token;
};

GrantManager.prototype.getAccount = function getAccount (token, callback) {
  const url = this.realmUrl + '/account';
  const options = URL.parse( url );
  options.method = 'GET';

  let t = token;
  if ( typeof token === 'object' ) t = token.token;

  options.headers = {
    'Authorization': 'Bearer ' + t,
    'Accept': 'application/json',
  };

  const promise = new Promise((resolve, reject) => {
    const req = getProtocol(options).request( options, (response) => {
      if ( response.statusCode < 200 || response.statusCode >= 300 ) {
        return reject( "Error fetching account" );
      }
      let json = '';
      response.on('data', (d) => json += d.toString());
      response.on( 'end', () => {
        const data = JSON.parse( json );
        if ( data.error ) reject( data );
        else resolve( data );
      });
    });
    req.end();
  });

  return nodeify( promise, callback );
};

function getProtocol(opts) {
  return opts.protocol === 'https:' ? https : http;
}

function nodeify(promise, cb) {
  if (typeof cb !== 'function') return promise;
  return promise.then( (res) => cb(null, res), (err) =>  cb(err) );
}

module.exports = GrantManager;
