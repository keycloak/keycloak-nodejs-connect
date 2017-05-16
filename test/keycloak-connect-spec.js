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

const driver = require('./utils/webdriver').driver;
const page = require('./utils/webdriver').ConsolePage;

const AdminHelper = require('./utils/admin').AdminHelper;
const test = require('tape');
const roi = require('roi');
const connect = require('./fixtures/node-console/index');
const getAdminHelper = (baseUrl, username, password) => new AdminHelper(baseUrl, username, password);
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

let realmManager = getAdminHelper().createRealm('test/fixtures/testrealm.json');

test('Should be forbidden for invalid public key.', t => {
  realmManager.then((realm) => {
    const app = connect.start('test/fixtures/public-client-wrong-realm-key.json');
    driver.get('http://localhost:3000');
    page.logInButton().click();
    page.login('user','password');
    page.body().getText().then(function(text) {
      t.equal(text, 'Access denied');
      t.end();
    }).then(() => {
      getAdminHelper().destroy(realm);
      app.close();
    }).catch((err) => {
      console.error(err);
    });
  }).then(delay(3000))
    .then(() => {
      driver.close();
    }).catch((err) => {
      console.error(err);
    });
});
