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
'use strict';
/**
 * A wrapper to keycloak-admin-client with an initial setup
 */
const keycloakAdminClient = require('keycloak-admin-client');
const parse = require('./helper').parse;
const settings = require('./config');
const realmTemplate = 'test/fixtures/testrealm.json';

var kca = keycloakAdminClient(settings);

/**
 * Create realms based on port and name specified
 * @param {object} port - The HTTP port which the client app will listen. This is necessary
 * to provide the proper redirect URIs
 * @param {object} name - Realm name
 * @returns {Promise} A promise that will resolve with the realm object.
 */
function createRealm (realmName) {
  var name = realmName || 'test-realm';
  return kca.then((client) => {
    return client.realms.create(parse(realmTemplate, name));
  }).catch((err) => {
    console.error('Failure: ', err);
  });
}

/**
 * Create clients based the representation and name provided
 * @param {object} clientRep - Representation of a client
 * @param {object} name - client name
 * @returns {Promise} A promise that will resolve with the realm object.
 */
function createClient (clientRep, realmName) {
  var realm = realmName || 'test-realm';
  return kca.then((client) => {
    return client.clients.create(realm, clientRep).then((rep) => {
      return client.clients.installation(realm, rep.id);
    });
  }).catch(err => {
    console.error(err);
  });
}
/**
 * Remove the realm based on the name provided
 * @param {object} realm - Realm name
 */
function destroy (realm) {
  kca.then((client) => {
    return client.realms.remove(realm);
  }).catch((err) => {
    console.error('Realm was not found to remove:', err);
  });
}

module.exports = {
  createRealm: createRealm,
  createClient: createClient,
  destroy: destroy
};
