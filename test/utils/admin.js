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

/**
 * A wrapper to keycloak-admin-client with an initial setup
 */
const keycloakAdminClient = require('keycloak-admin-client');
const parse = require('./helper').parse;

module.exports = {
  AdminHelper: AdminHelper
};

/**
 * Initialize the helper with defaults if nothing is provided
 * @param {object} baseUrl - Keycloak server URL
 * @param {object} username - Username to any user with credentials to create realms
 * @param {object} password - password
 */
function AdminHelper (baseUrl, username, password) {
  var settings = {
    baseUrl: baseUrl || 'http://127.0.0.1:8080/auth',
    username: username || 'admin',
    password: password || 'admin',
    grant_type: 'password',
    client_id: 'admin-cli'
  };
  this.kca = keycloakAdminClient(settings);
}

/**
 * Create realms based on port and name specified
 * @param {object} port - The HTTP port which the client app will listen. This is necessary
 * to provide the proper redirect URIs
 * @param {object} name - Realm name
 * @returns {Promise} A promise that will resolve with the realm object.
 */
AdminHelper.prototype.createRealm = function createRealm (port, name) {
  return this.kca.then((client) => {
    return client.realms.create(parse('test/fixtures/realm-template.json', name, port))
      .then((realm) => {
        return realm;
      }).catch((err) => {
        console.log(err);
      });
  }).catch((err) => {
    console.error(err);
  });
};

/**
 * Remove the realm based on the name provided
 * @param {object} realm - Realm name
 */
AdminHelper.prototype.destroy = function destroy (realm) {
  this.kca.then((client) => {
    return client.realms.remove(realm);
  }).catch((err) => {
    console.error(err);
  });
};
