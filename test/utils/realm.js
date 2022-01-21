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
/* eslint new-cap: ["error", { "newIsCap": false }] */
const keycloakAdminClient = require('@keycloak/keycloak-admin-client');
const parse = require('./helper').parse;
const settings = require('./config');
const realmTemplate = 'test/fixtures/testrealm.json';

const kca = new keycloakAdminClient.default(settings);

/**
 * Create realms based on port and name specified
 * @param {object} port - The HTTP port which the client app will listen. This is necessary
 * to provide the proper redirect URIs
 * @param {object} name - Realm name
 * @returns {Promise} A promise that will resolve with the realm object.
 */
function createRealm (realmName) {
  const name = realmName || 'test-realm';
  return kca.auth(settings).then(() => {
    return kca.realms.create(parse(realmTemplate, name)).then(() => {
      return kca.realms.findOne({ realm: realmName });
    });
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
  const realm = realmName || 'test-realm';
  kca.setConfig({ realmName: 'master' });
  return kca.auth(settings).then(() => {
    kca.setConfig({ realmName: realm });
    return kca.clients.create(clientRep).then((rep) => {
      return kca.clients.getInstallationProviders({ id: rep.id, providerId: 'keycloak-oidc-keycloak-json' });
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
  kca.setConfig({ realmName: 'master' });
  kca.auth(settings).then(() => {
    return kca.realms.del({ realm });
  }).catch((err) => {
    console.error('Realm was not found to remove:', err);
  });
}

module.exports = {
  createRealm: createRealm,
  createClient: createClient,
  destroy: destroy
};
