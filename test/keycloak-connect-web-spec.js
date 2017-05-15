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
const page = require('./utils/webdriver').ConsolePage;
const AdminHelper = require('./utils/admin').AdminHelper;
const TestVector = require('./utils/helper').TestVector;
const NodeApp = require('./fixtures/node-console/index').NodeApp;
const getAdminHelper = (baseUrl, username, password) => new AdminHelper(baseUrl, username, password);
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

let app = new NodeApp().start();
let realmManager = getAdminHelper().createRealm(app.address().port);

test('Should be able to access public page', t => {
  realmManager.then((realm) => {
    t.plan(1);
    page.index(app.address().port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)');
      t.end();
    }).catch((err) => {
      t.fail('Test failed');
    });
  });
})
test('Should login with admin credentials', t => {
  realmManager.then((realm) => {
    t.plan(3);
    page.index(app.address().port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)');
    })

    page.logInButton().click();
    page.login('user', 'password');

    page.events().getText().then(function(text) {
      t.equal(text, 'Auth Success');
    })
    page.logOutButton().click();
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)');
      t.end();
    }).catch((err) => {
      t.fail('Test failed');
    });
  });
})

let nodeApp = new NodeApp('test-realm2');
nodeApp.kcConfig['realm-public-key'] = TestVector.wrongRealmPublicKey;
let app2 = nodeApp.start();

test('Should be forbidden for invalid public key', t => {
  var realmManager = getAdminHelper().createRealm(app2.address().port, 'test-realm2');
  realmManager.then((realm) => {
    t.plan(2);
    page.index(app2.address().port);
    page.output().getText().then(function(text) {
      t.equal(text, 'Init Success (Not Authenticated)');
    })
    page.logInButton().click();
    page.login('user', 'password');
    page.body().getText().then(function (text) {
      t.equal(text, 'Access denied');
      t.end();
    }).catch((err) => {
      t.fail('Test failed');
    });
  })
})

test('teardown', t => {
  app.close();
  app2.close();
  page.quit();
  getAdminHelper().destroy('test-realm');
  getAdminHelper().destroy('test-realm2');
  t.end();
})

