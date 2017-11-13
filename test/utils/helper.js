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
 * A helper for test cases and fixtures
 */
const fs = require('fs');

/**
 * Utility to parse realm templates
 * @param {object} file - Realm template JSON file
 * @param {object} realmName - Realm name
 * @param {object} port - The HTTP port which the client app will listen. This is necessary
 * to provide the proper redirect URIs
 * @param {object} hostname - Host name which the client app will listen.
 */

function parse (file, realmName) {
  var content = fs.readFileSync(file, 'utf8')
    .replace(/{{realm}}/g, realmName);
  return JSON.parse(content);
}

function parseClient (file, httpPort, name) {
  var port = httpPort || '3000';
  var content = fs.readFileSync(file, 'utf8')
    .replace(/{{name}}/g, name)
    .replace(/{{port}}/g, port);
  var json = JSON.parse(content);
  return json;
}

/**
 * Utility to provide testing vectors instead of
 * a bunch of duplicate files with small changes
 */
function TestVector () {
}

TestVector.wrongRealmPublicKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAikGBvYGniAJ59ZjpaSDw2o+j40Ila/dWfN8qA1dzXJesH9Z1sZrcevJB+rfxoZDaWMz2l9Q3OxG/qolTpsQl8NBdb5tymic9qDkAIsiyKThzjcfs5lOSxfnkHn6+Z0QbrYnXQs/cGvQ1Ai81M1M1O6BHDWu05n8c977h+BsfLmqGj7MZZj9gw9RM84RIKDGHTbFh9YyXBJVtqbOhRD7hcB0O9olDZb7mQ5A8gsMctcUhsVBy3xKCLMD41XU92rQ9FAlsV9mBglLqaVWr2mxQItN3lgjE02L8UyorI3T0uprIsnv7B2NwUC5ZhwZGfnBznUPVrT6makEJklpg5if3qQIDAQAB';

module.exports = {
  parse: parse,
  TestVector: TestVector,
  parseClient: parseClient,
  dummyReply: {
    'access_token': 'Dummy access token',
    'expires_in': 2,
    'refresh_expires_in': 1800,
    'refresh_token': 'Dummy refresh token',
    'token_type': 'bearer',
    'id_token': 'Dummy id token',
    'not-before-policy': 1462208947,
    'session_state': '22e0b5bd-fb0f-4f99-93aa-a60c4b934c88'
  }
};
