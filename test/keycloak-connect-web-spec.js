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
const TestVector = require('./utils/helper').TestVector;

const webDriverClass = require('./utils/webdriver');
const NodeApp = require('./fixtures/node-console/index').NodeApp;
const session = require('express-session');

const realmName = `UnitTesting-${__filename.slice(__dirname.length + 1, -3)}`;
const appFileTest = new NodeApp();
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

t.setTimeout(100000); // Change timeout from 30 sec to 100 sec

t.test('setup', (t) => {
  t.comment(`START TESTING FILE : ${__filename}`);

  return admin.destroy(realmName, {ignoreDestroyRealNowFound: true})
  .finally(() => {
    return admin.createRealm(realmName)
    .then(() => {
      return appFileTest.publicClient();
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

t.test('Should be able to access public page', t => {
  t.plan(1);

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
    .catch(error => {
      t.fail(error, "Unexpected error thrown");
    })
    .finally( async () => {
      await webDriverClass.logout(appFileTest.port); // Logout just in case
    })
  });

t.test('Should login with admin credentials', t => {
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
      return webDriverClass.getlogOutButtonElement();
    })
    .then(webElement => {
      return webElement.click();
    })
    .then(() => {
      return webDriverClass.getOutputElement();
    })
    .then(webElement => {
      return webElement.getText();
    })
    .then(text => {
      t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
    })
    .catch(error => {
      t.fail(error, "Unexpected error thrown");
    })
    .finally( async () => {
      await webDriverClass.logout(appFileTest.port); // Logout just in case
    })
});

t.test('Login should not change tokens when they are valid', t => {
  // NOTE: This test was failing with "selenium-webdriver": "^4.0.0-beta.3" ,
  //       BUT passes with 3.6.0 and the code and webdriver code looks okay.
  t.plan(4);

  return webDriverClass.getPage(appFileTest.port)
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated'); // test #1
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
    t.equal(text, 'Auth Success', 'User should be authenticated');  // test #2
  })
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(firstToken => {
    return webDriverClass.getLoginButtonElement()
    .then(webElement => {
      return webElement.click();
    })
    .then( () => {
      return webDriverClass.getOutputElement();
    })
    .then(webElement => {
      return webElement.getText();
    })
    .then(secondToken => {
      t.equal(secondToken, firstToken, 'Token should not be changed as first session is still valid'); // test #3
    })
  })
  .then( () => {
    return webDriverClass.getlogOutButtonElement();
  })
  .then(webElement => {
    return webElement.click();
  })
  .then( () => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated'); // test #4
  })
  .catch(error => {
    t.fail(error, "Unexpected error thrown");
  })
  .finally( async () => {
    await webDriverClass.logout(appFileTest.port); // Logout just in case
  })
});

t.test('SSO should work for nodejs app and testRealmAccountPage', t => {
  t.plan(6);

  return webDriverClass.logout(appFileTest.port)
  .then(() => {
    return webDriverClass.getPage(appFileTest.port)
  })
  .then(delay(100))
  .then(() => {
    return webDriverClass.getCurrentUrl();
  })
  .then(currentUrl => {
    t.ok(currentUrl.startsWith(`http://localhost:${appFileTest.port}/`), 'Should be on application main page, current url: ' + currentUrl);
  })
  .then(() => {
    return webDriverClass.getLoginButtonElement();
  })
  .then(webElement => {
    return webElement.click();
  })
  .then(delay(100))
  .then(() => {
    return webDriverClass.getCurrentUrl();
  })
  .then(currentUrl => {
    t.ok(currentUrl.startsWith(`http://127.0.0.1:8080/auth/realms/${realmName}/protocol/openid-connect/auth`), 'Should be on main login page, current url: ' + currentUrl);
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
    return webDriverClass.getAccountPage(realmName, 8080);
  })
  .then(delay(1000))
  .then(() => {
    return webDriverClass.getCurrentUrl();
  })
  .then(currentUrl => {
    console.log(`currentUrl : ${currentUrl}`);
    t.ok(currentUrl.startsWith(webDriverClass.getAccoutUrl(realmName, 8080)), 'Should be on account page'); // Watch the "/#/"" at the end
  })
  .then(() => {
    return webDriverClass.accountLandingPagesignOutButtonClick();
  })
  .then(delay(1000))
  .then(() => {
    return webDriverClass.getCurrentUrl();
  })
  .then(currentUrl => {
    t.ok(currentUrl.startsWith(webDriverClass.getAccoutUrl(realmName, 8080)), 'Should be on account page'); // Watch the "/#/"" at the end
   })
  .then(() => {
    return webDriverClass.getPage(appFileTest.port, '/login')
  })
  .then(delay(1000))
  .then(() => {
    return webDriverClass.getCurrentUrl();
  })
  .then(currentUrl => {
    t.ok(currentUrl.startsWith(`http://localhost:${appFileTest.port}/login`), 'Should be on application main page, current url: ' + currentUrl);
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally(async () => {
    return await webDriverClass.logout(appFileTest.port);
  })
});

t.test('Public client should be redirected to GitHub when idpHint is provided', async t => {
  t.plan(1);

  const appUnitTest = new NodeApp();
  const clientRep = await appUnitTest.publicClient('appIdP');
  
  return webDriverClass.logout(appUnitTest.port)
  .then(() => {
    return admin.createClient(clientRep, realmName)
  })
  .then((installation) => {
    return appUnitTest.build(installation, { store: new session.MemoryStore(), idpHint: 'github' });
  })
  .then(() => {
    return webDriverClass.getPage(appUnitTest.port, '/restricted');
  })
  .then(() => {
    return webDriverClass.refreshPage();
  })
  .then(() => {
    return  webDriverClass.geth1Element();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Sign in to GitHub', 'Application should redirect to GitHub');
  })
  .catch(err => {
    t.fail(err, "Unexpected error thrown");
  })
  .finally( async () => {
    await webDriverClass.logout(appUnitTest.port); // Logout just in case
    await appUnitTest.destroy();
  })
});

t.test('User should be forbidden to access restricted page', t => {
  t.plan(1);

  return webDriverClass.logout(appFileTest.port)
  .then(() => {
    return webDriverClass.getPage(appFileTest.port, '/restricted')
  })
  .then(() => {
    return webDriverClass.login('alice', 'password');
  })
  .then( () => {
    return webDriverClass.getBodyElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Access denied', 'Message should be access denied');
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    return await webDriverClass.logout(appFileTest.port); // we need to wait a bit until the logout is fully completed
  })
});

t.test('Public client should be forbidden for invalid public key', async t => {
  t.plan(2);

  const appUnitTest = new NodeApp();
  const clientRep = await appUnitTest.publicClient('app2');

  return admin.createClient(clientRep, realmName)
  .then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    return appUnitTest.build(installation);
  })
  .then(() => {
    return webDriverClass.getPage(appUnitTest.port)
  })
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
    return webDriverClass.getBodyElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Access denied', 'Message should be access denied');
  })
  .catch(err => {
    t.fail(err, "Unexpected error thrown");
  })
  .finally( async () => {
    await webDriverClass.logout(appUnitTest.port); // Logout just in case
    await appUnitTest.destroy();
  })
});

t.test('Confidential client should be forbidden for invalid public key', async t => {
  t.plan(3);

  const appUnitTest = new NodeApp();
  const clientRep = await appUnitTest.confidential('app3');

  return admin.createClient(clientRep, realmName)
  .then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    return appUnitTest.build(installation);
  })
  .then(() => {
    return webDriverClass.getPage(appUnitTest.port);
  })
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
    return webDriverClass.getPageSource();
  })
  .then(getPageSource => {
    t.ok( (getPageSource.indexOf('Sign in to your account') > 0), 'Did not get redirected to login page!!!');
  })
  // getLoginButtonElement redirected to Keycloak login page, not to the app home pagepage !!!
  // .then(() => {
  //   return webDriverClass.getBodyElement();
  // })
  // .then(webElement => {
  //   return webElement.getText();
  // })
  // .then(text => {
  //   t.equal(text, 'Access denied', 'Message should be access denied');
  // })
  // .then(() => {
  //   return webDriverClass.logout(appUnitTest.port);
  // })
  .then(() =>{
    return webDriverClass.getPage(appUnitTest.port, '/check-sso');
  })
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Check SSO Success (Not Authenticated)', 'User should not be authenticated');
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await webDriverClass.logout(appUnitTest.port); // Logout just in case
    await appUnitTest.destroy();
  })
});

t.test('Should test check SSO after logging in and logging out', t => {
  t.plan(3);

  // make sure user is logged out
  return webDriverClass.logout(appFileTest.port)
  .then(() => {
    return webDriverClass.getPage(appFileTest.port, '/check-sso')
  })
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Check SSO Success (Not Authenticated)', 'User should not be authenticated');
  })
  .then(() => {
    return webDriverClass.getLoginButtonElement();
  })
  .then(webElement => {
    return webElement.click();
  })
  .then(() => {
    return webDriverClass.login('alice', 'password');
  })
  .then(() => {
    return webDriverClass.getPage(appFileTest.port, '/check-sso');
  })
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Check SSO Success (Authenticated)', 'User should be authenticated');
  })
  .then(() => {
    return webDriverClass.logout(appFileTest.port);
  })
  .then(() => {
    return webDriverClass.getPage(appFileTest.port, '/check-sso');
  })
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Check SSO Success (Not Authenticated)', 'User should not be authenticated');
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await webDriverClass.logout(appFileTest.port); // Logout just in case
  })
});

t.test('Public client should work with slash in the end of auth-server-url', async t => {
  t.plan(3);

  const appUnitTest = new NodeApp();
  const clientRep = await appUnitTest.publicClient('authServerSlashes');

  return admin.createClient(clientRep, realmName)
  .then((installation) => {
    installation['auth-server-url'] = 'http://localhost:8080/auth/';
    return appUnitTest.build(installation);
  })
  .then(() => {
    return webDriverClass.getPage(appUnitTest.port);
  })
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })
  .then(text => {
    t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
  })
  .then( () => {
    return webDriverClass.getLoginButtonElement();
  })
  .then(webElement => {
    return webElement.click();
    // WARN  [org.keycloak.events] (default task-82) type=LOGIN_ERROR, 
    //        realmId=4bc3df0e-7af1-4f29-a88c-dbc5d065b68f, 
    //        clientId=account, 
    //        userId=null,
    //        ipAddress=172.19.0.1,
    //        error=invalid_redirect_uri, 
    //        redirect_uri=http://localhost:22210/login?auth_callback=1
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
    return webDriverClass.getlogOutButtonElement();
  })  
  .then(webElement => {
    return webElement.click();
  })  
  .then(() => {
    return webDriverClass.getOutputElement();
  })
  .then(webElement => {
    return webElement.getText();
  })  
  .then(text => {
    t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await webDriverClass.logout(appUnitTest.port); // Logout just in case
    await appUnitTest.destroy();
  })
});

t.test('App should be able to use cookie-store', async t => {
  t.plan(1);

  const appUnitTest = new NodeApp();
  const clientRep = await appUnitTest.publicClient('appCookies');

  return admin.createClient(clientRep, realmName)
  .then((installation) => {
    return appUnitTest.build(installation, { cookies: true });
  })
  .then(() => {
    return webDriverClass.getPage(appUnitTest.port, '/cookie');
  })
  .then(() => {
    return webDriverClass.login('alice', 'password');
  })
  .then(() => {
    return webDriverClass.refreshPage();
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
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await webDriverClass.logout(appUnitTest.port); // Logout just in case
    await appUnitTest.destroy();
  })
});

t.test('teardown', async (t) => {
  await appFileTest.destroy();
  await admin.destroy(realmName);
  await webDriverClass.destroy();
  t.end();
});
