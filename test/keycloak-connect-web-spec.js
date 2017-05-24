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

const test = require('blue-tape');
const admin = require('./utils/realm');
const TestVector = require('./utils/helper').TestVector;

const page = require('./utils/webdriver').newPage;
const NodeApp = require('./fixtures/node-console/index').NodeApp;

const realmManager = admin.createRealm();
const app = new NodeApp();
let client;

test('setup', t => {
  return client = realmManager.then((realm) => {
    return admin.createClient(app.publicClient());
  });
})

test('Should be able to access public page', t => {
  t.plan(1);

  return client.then((installation) => {
    app.build(installation);

    page.get(app.port);
    return page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
    })
  });
});

test('Should login with admin credentials', t => {
  t.plan(3);

  return client.then((installation) => {
    app.build(installation);
    page.get(app.port);

    return page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
      page.logInButton().click();
      page.login('test-admin', 'password');

      return page.events().getText().then(function(text) {
        t.equal(text, 'Auth Success', 'User should be authenticated');
        page.logOutButton().click();
        return page.output().getText().then(function(text) {
          t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
        })
      })
    })
  });
})

test('User should be forbidden to access restricted page', t => {
  t.plan(1);

  return client.then((installation) => {
    app.build(installation);
    page.get(app.port, '/restricted');
    page.login('alice', 'password');

    return page.body().getText().then(function (text) {
      t.equal(text, 'Access denied', 'Message should be access denied');
    }).then(() => {
      page.get(app.port, '/logout');
    })
  });
})


test('Public client should be forbidden for invalid public key', t => {
  t.plan(2);
  var app = new NodeApp();
  var client = admin.createClient(app.publicClient('app2'));

  return client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);
    page.get(app.port);

    return page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
      page.logInButton().click();
      page.login('test-admin', 'password');

      return page.body().getText().then(function (text) {
        t.equal(text, 'Access denied', 'Message should be access denied');
      }).then(() => {
        app.destroy();
      })
    })
  })
})

test('Confidential client should be forbidden for invalid public key', t => {
  t.plan(2);
  var app = new NodeApp();
  var client = admin.createClient(app.confidential('app3'));

  return client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);
    page.get(app.port);

    return page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
      page.logInButton().click();

      return page.body().getText().then(function (text) {
        t.equal(text, 'Access denied', 'Message should be access denied');
      }).then(() => {
        app.destroy();
      })
    })
  })
})

test('teardown', t => {
  return realmManager.then((realm) => {
    app.destroy();
    admin.destroy('test-realm');
    page.quit();
  });
})

