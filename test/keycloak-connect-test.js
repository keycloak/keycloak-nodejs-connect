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
var test = require('tape');
var Keycloak = require('../index');

var kc = null;

test('setup', function (t) {

  var kcConfig = {
    "realm": "test-realm",
    "realm-public-key": "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrVrCuTtArbgaZzL1hvh0xtL5mc7o0NqPVnYXkLvgcwiC3BjLGw1tGEGoJaXDuSaRllobm53JBhjx33UNv+5z/UMG4kytBWxheNVKnL6GgqlNabMaFfPLPCF8kAgKnsi79NMo+n6KnSY8YeUmec/p2vjO2NjsSAVcWEQMVhJ31LwIDAQAB",
    "auth-server-url": "http://localhost:8080/auth",
    "ssl-required": "external",
    "resource": "nodejs-connect",
    "public-client": true
  };

  kc = new Keycloak({}, kcConfig);
  t.end();
});

test('Should verify the realm name of the config object.', function (t) {
  t.equal(kc.config.realm, 'test-realm');
  t.end();
});

test('Should verify if login URL has the configured realm.', function (t) {
  t.equal(kc.loginUrl().indexOf(kc.config.realm) > 0, true);
  t.end();
});

test('Should verify if logout URL has the configured realm.', function (t) {
  t.equal(kc.logoutUrl().indexOf(kc.config.realm) > 0, true);
  t.end();
});