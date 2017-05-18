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
const parseClient = require('./helper').parseClient;
const defaultRealm = 'test-realm';

module.exports = {
  AdminHelper: AdminHelper,
  Type: Type
};

function Type () {}
Type.bearerOnly = function (port, app) {
  var name = app || 'bearer-app';
  return parseClient('test/fixtures/templates/bearerOnly-template.json', port, name);
};

Type.publicClient = function (port, app) {
  var name = app || 'public-app';
  return parseClient('test/fixtures/templates/public-template.json', port, name);
};

Type.confidential = function (port, app) {
  var name = app || 'confidential-app';
  return parseClient('test/fixtures/templates/confidential-template.json', port, name);
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
AdminHelper.prototype.createRealm = function createRealm () {
  return this.kca.then((client) => {
    return client.realms.create(parse('test/fixtures/testrealm.json'))
      .then((realm) => {
        return realm;
      }).catch((err) => {
        console.log(err);
      });
  }).catch((err) => {
    console.error(err);
  });
};

AdminHelper.prototype.createClient = function createClient (clientRep, name) {
  clientRep.clientId = name || clientRep.clientId;
  return this.kca.then((client) => {
    return client.clients.create(defaultRealm, clientRep).then((newClient) => {
      return client.clients.installation(defaultRealm, newClient.id);
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
