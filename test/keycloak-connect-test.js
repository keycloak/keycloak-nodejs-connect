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

const test = require('tape');
const Keycloak = require('../index');
const UUID = require('../uuid');
const express = require('express');
const session = require('express-session');
const request = require('supertest');

let app = express();
let kc = null;

test('setup', t => {
  let kcConfig = {
    'realm': 'test-realm',
    'realm-public-key': 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrVrCuTtArbgaZzL1hvh0xtL5mc7o0NqPVnYXkLvgcwiC3BjLGw1tGEGoJaXDuSaRllobm53JBhjx33UNv+5z/UMG4kytBWxheNVKnL6GgqlNabMaFfPLPCF8kAgKnsi79NMo+n6KnSY8YeUmec/p2vjO2NjsSAVcWEQMVhJ31LwIDAQAB',
    'auth-server-url': 'http://localhost:8080/auth',
    'ssl-required': 'external',
    'resource': 'nodejs-connect',
    'public-client': true
  };

  let memoryStore = new session.MemoryStore();

  app.use(session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
  }));

  kc = new Keycloak({store: memoryStore}, kcConfig);

  app.use(kc.middleware({
    logout: '/logout',
    admin: '/callbacks'
  }));

  app.get('/', (req, res) => {
    res.status(200).json({ name: 'unprotected' });
  });

  app.get('/complain', kc.protect(), (req, res) => {
    res.status(200).json({ foo: 'bar' });
  });

  app.get('/complain2', kc.protect('special'), (req, res) => {
    res.status(200).json({ foo: 'bar' });
  });

  app.get('/login', kc.protect(), (req, res) => {
    res.json(JSON.stringify(JSON.parse(req.session['keycloak-token'])));
  });

  t.end();
});

test('Should verify the realm name of the config object.', t => {
  t.equal(kc.config.realm, 'test-realm');
  t.end();
});

test('Should verify if login URL has the configured realm.', t => {
  t.equal(kc.loginUrl().indexOf(kc.config.realm) > 0, true);
  t.end();
});

test('Should verify if logout URL has the configured realm.', t => {
  t.equal(kc.logoutUrl().indexOf(kc.config.realm) > 0, true);
  t.end();
});

test('Should generate a correct UUID.', t => {
  const rgx = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  t.equal(rgx.test(UUID()), true);
  t.end();
});

test('Should test unprotected route.', t => {
  request(app)
    .get('/')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.statusCode, 200);
      t.end();
    });
});

test('Should test protected route.', t => {
  request(app)
    .get('/login')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/auth') > 0, true);
      t.equal(res.statusCode, 302);
      t.end();
    });
});

test('Should add auth_callback as a new query string to original request without a query string.', t => {
  request(app)
      .get('/login')
      .end((err, res) => {
        if (err) {
          console.log(err);
        }
        t.equal(res.headers.location.indexOf('%3Fauth_callback%3D1&') > 0, true);
        t.equal(res.statusCode, 302);
        t.end();
      });
});

test('Should append auth_callback to original request with existing query string.', t => {
  request(app)
        .get('/login?foo=bar')
        .end((err, res) => {
          if (err) {
            console.log(err);
          }
          t.equal(res.headers.location.indexOf('%26auth_callback%3D1') > 0, true);
          t.equal(res.statusCode, 302);
          t.end();
        });
});

test('Should verify logout feature.', t => {
  request(app)
    .get('/logout')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/logout') > 0, true);
      t.equal(res.statusCode, 302);
      t.end();
    });
});

test('Should verify custom logout.', t => {
  app.use(kc.middleware({ logout: '/logoff' }));
  request(app)
    .get('/logoff')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/logout') > 0, true);
      t.equal(res.statusCode, 302);
      t.end();
    });
});

test('Should produce correct account url.', t => {
  t.equal(kc.accountUrl(), 'http://localhost:8080/auth/realms/test-realm/account');
  t.end();
});

test('Should call complain after logout.', t => {
  request(app)
    .get('/logout')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/logout') > 0, true);
      t.equal(res.statusCode, 302);
    });

  request(app)
    .get('/complain')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/auth') > 0, true);
    });

  request(app)
    .get('/complain2')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.text.indexOf('Redirecting to http://localhost:8080/auth/realms/test-realm/protocol/openid-connect/auth') > 0, true);
      t.end();
    });
});

test('Should test empty defaults.', t => {
  let kcConfig = {
    'realm': 'test-realm',
    'realm-public-key': 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrVrCuTtArbgaZzL1hvh0xtL5mc7o0NqPVnYXkLvgcwiC3BjLGw1tGEGoJaXDuSaRllobm53JBhjx33UNv+5z/UMG4kytBWxheNVKnL6GgqlNabMaFfPLPCF8kAgKnsi79NMo+n6KnSY8YeUmec/p2vjO2NjsSAVcWEQMVhJ31LwIDAQAB',
    'auth-server-url': 'http://localhost:8080/auth',
    'resource': 'nodejs-connect',
    'public-client': true
  };

  kc = new Keycloak({}, kcConfig);

  app = express();

  app.use(kc.middleware({}));

  app.get('/', (req, res) => {
    res.status(200).json({ name: 'unprotected' });
  });

  app.get('/foo', kc.protect(), (req, res) => {
    res.status(200).json({ foo: 'bar' });
  });

  request(app)
    .get('/')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.statusCode, 200);
    });

  request(app)
    .get('/foo')
    .end((err, res) => {
      if (err) {
        console.log(err);
      }
      t.equal(res.statusCode, 302);
      t.end();
    });
});
