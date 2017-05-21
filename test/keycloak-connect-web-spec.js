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
const admin = require('./utils/realm');
const type = admin.client;
const TestVector = require('./utils/helper').TestVector;

const page = require('./utils/webdriver').newPage;
const NodeApp = require('./fixtures/node-console/index').NodeApp;

let realmManager = admin.createRealm();
let app = new NodeApp();
let client;

test('setup', t => {
  client = realmManager.then((realm) => {
    return admin.createClient(type.publicClient(app.port));
  });
  t.end();
})

test('Should be able to access public page', t => {
  client.then((installation) => {
    app.build(installation);

    t.plan(1);
    page.get(app.port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
      t.end();
    }).catch((err) => {
      t.fail('Test failed');
    });
  });
});
test('Should login with admin credentials', t => {
  client.then((installation) => {
    app.build(installation);

    t.plan(3);
    page.get(app.port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
    })

    page.logInButton().click();
    page.login('test-admin', 'password');

    page.events().getText().then(function(text) {
      t.equal(text, 'Auth Success', 'User should be authenticated');
    })
    page.logOutButton().click();
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
      t.end();
    }).catch((err) => {
      t.fail('Test failed');
    });
  });
})

test('User should be forbidden to access restricted page', t => {
  client.then((installation) => {
    app.build(installation);

    t.plan(1);
    page.get(app.port, '/restricted');
    page.login('alice', 'password');
    page.body().getText().then(function (text) {
      t.equal(text, 'Access denied', 'Message should be access denied');
      t.end();
    })
    page.get(app.port, '/logout');
  });
})


test('Public client should be forbidden for invalid public key', t => {
  var app = new NodeApp();
  var client = admin.createClient(type.publicClient(app.port, 'app2'));

  client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);

    t.plan(2);
    page.get(app.port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
    })
    page.logInButton().click();
    page.login('test-admin', 'password');
    page.body().getText().then(function (text) {
      t.equal(text, 'Access denied', 'Message should be access denied');
      t.end();
    }).then(() => {
      app.close();
    }).catch((err) => {
      t.fail('Test failed');
    });
  })
})

test('Confidential client should be forbidden for invalid public key', t => {
  var app = new NodeApp();
  var client = admin.createClient(type.confidential(app.port, 'app3'));

  client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);

    t.plan(2);
    page.get(app.port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
    })
    page.logInButton().click();
    page.body().getText().then(function (text) {
      t.equal(text, 'Access denied', 'Message should be access denied');
      t.end();
    }).then(() => {
      app.close();
    }).catch((err) => {
      t.fail('Test failed');
    });
  })
})

test('Bearer client should be forbidden for invalid public key', t => {
  var app = new NodeApp();
  var client = admin.createClient(type.bearerOnly(app.port, 'app4'));

  client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);

    t.plan(2);
    page.get(app.port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
    })
    page.logInButton().click();
    page.body().getText().then(function (text) {
      t.equal(text, 'Access denied', 'Message should be access denied');
      t.end();
    }).then(() => {
      app.close();
    }).catch((err) => {
      t.fail('Test failed');
    });
  })
})

test('teardown', t => {
  app.close();
  admin.destroy('test-realm');
  page.quit();
  t.end();
})

