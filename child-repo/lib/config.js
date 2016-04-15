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

var path = require('path');
var fs   = require('fs');

/**
 * Construct a configuration object.
 *
 * A configuration object may be constructed with either
 * a path to a `keycloak.json` file (which defaults to
 * `$PWD/keycloak.json` if not present, or with a configuration
 * object akin to what parsing `keycloak.json` provides.
 *
 * @param {String|Object} config Configuration path or details.
 *
 * @constructor
 */
function Config(config) {
  if ( ! config ) {
    config = path.join( process.cwd(), 'keycloak.json' );
  }

  if ( typeof config == 'string' ) {
    this.loadConfiguration( config );
  } else {
    this.configure( config );
  }
}

/**
 * Load configuration from a path.
 *
 * @param {String} configPath Path to a `keycloak.json` configuration.
 */
Config.prototype.loadConfiguration = function(configPath) {
  var json = fs.readFileSync( configPath );
  var config = JSON.parse( json.toString() );
  this.configure( config );
};

/**
 * Configure this `Config` object.
 *
 * This will set the internal configuration details.  The details
 * may come from a `keycloak.json` formatted object (with names such
 * as `auth-server-url`) or from an existing `Config` object (using
 * names such as `authServerUrl`).
 *
 * @param {Object} config The configuration to instill.
 */
Config.prototype.configure = function(config) {

  /**
   * Realm ID
   * @type {String}
   */
  this.realm          = config['realm']                      || config.realm;

  /**
   * Client/Application ID
   * @type {String}
   */
  this.clientId       = config['resource']                   || config.clientId;

  /**
   * Client/Application secret
   * @type {String}
   */
  this.secret         = (config['credentials'] || {}).secret || config.secret;

  /**
   * If this is a public application or confidential.
   * @type {String}
   */
  this.public         = config['public-client'] || config.public || false;

  /**
   * Authentication server URL
   * @type {String}
   */
  this.authServerUrl  = config['auth-server-url']            || config.authServerUrl;

  /**
   * Root realm URL.
   * @type {String}
   */
  this.realmUrl      = this.authServerUrl + '/realms/' + this.realm;

  /**
   * Root realm admin URL.
   * @type {String} */
  this.realmAdminUrl = this.authServerUrl + '/admin/realms/' + this.realm;

  var plainKey = config['realm-public-key'];

  /**
   * Formatted public-key.
   * @type {String}
   */
  this.publicKey = "-----BEGIN PUBLIC KEY-----\n";

  for ( i = 0 ; i < plainKey.length ; i = i + 64 ) {
    this.publicKey += plainKey.substring( i, i + 64 );
    this.publicKey += "\n";
  }

  this.publicKey += "-----END PUBLIC KEY-----\n";

  /**
   * If this is a Bearer Only application.
   * @type {Boolean}
   */
  this.bearerOnly = config['bearer-only'] || config.bearerOnly || false;

};

module.exports = Config;