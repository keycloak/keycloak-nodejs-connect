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
var UUID = require('../uuid');
var express = require('express');
var session = require('express-session');
var request = require('supertest');

var app = express();

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

  var memoryStore = new session.MemoryStore();

  app.use(session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  }));

  app.use(kc.middleware({
    logout: '/logout',
    admin: '/',
  }));

  app.get('/', function (req, res) {
    res.status(200).json({ name: 'unprotected' });
  });

  app.get('/login', kc.protect(), function (req, res) {
    res.json(JSON.stringify(JSON.parse(req.session['keycloak-token'])));
  });

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

test('Should generate a correct UUID.', function (t) {
  var rgx = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  t.equal(rgx.test(UUID()), true);
  t.end();
});

test('Should test unprotected route.', function (t) {
  request(app)
    .get('/')
    .end(function (err, res) {
      t.equal(res.statusCode, 200);
      t.end();
    });
});

test('Should test protected route.', function (t) {
  request(app)
    .get('/login')
    .end(function (err, res) {
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/auth') > 0, true);
      t.equal(res.statusCode, 302);
      t.end();
    });
});

test('Should verify logout feature.', function (t) {
  request(app)
    .get('/logout')
    .end(function (err, res) {
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/logout') > 0, true);
      t.equal(res.statusCode, 302);
      t.end();
    });
});

test('Should produce correct account url.', function (t) {
  t.equal(kc.accountUrl(), 'http://localhost:8080/auth/realms/test-realm/account');
  t.end();
});