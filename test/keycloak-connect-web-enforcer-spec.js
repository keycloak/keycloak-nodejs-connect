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

const t = require('tap');
const admin = require('./utils/realm');
const webDriverClass = require('./utils/webdriver');
const NodeApp = require('./fixtures/node-console/index').NodeApp;

const realmName = `UnitTesting-${__filename.slice(__dirname.length + 1, -3)}`;
const appFileTest = new NodeApp();

t.test('setup', async t => {
  t.comment(`START TESTING FILE : ${__filename}`);
  return admin.destroy(realmName, {ignoreDestroyRealNowFound: true})
  .finally(() => {
    return admin.createRealm(realmName)
    .then(() => {
      return appFileTest.enforcerResourceServer();
    })
    .then((clientRep) => {
      return admin.createClient(clientRep, realmName)
    })
    .then((installation) => {
      return appFileTest.build(installation);
    })
    .catch((err) => {
      console.error('Failure: ', err);
      t.fail(err.message);
    });
  });
});

t.test('Should be able to access resource protected by the policy enforcer', t => {
  t.plan(3);

  return webDriverClass.getPage(appFileTest.port)
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
  })
  .then(() => {
    return webDriverClass.getLoginButtonElement();
  })
  .then(webElement => {
    return webElement.click();
  })
  .then(() => {
    return webDriverClass.login('test-admin', 'password');
  })
  .then(() => {
    return webDriverClass.getEventsElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Auth Success', 'User should be authenticated');
  })
  .then(() => {
    return webDriverClass.getgrantedResourceElement();
  })
  .then(webElement => {
    return webElement.click();
  })
  .then(() => {
    return webDriverClass.getEventsElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Granted', 'User can access resource protected by the policy enforcer');
  })
  .catch((err) => {
    console.error('Failure: ', err);
    t.fail(err.message);
  });
});

t.test('teardown', async t => {
  await appFileTest.destroy();
  await admin.destroy(realmName);
  await webDriverClass.destroy();
  t.end();
});
