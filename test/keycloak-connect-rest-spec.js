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

const admin = require('./utils/realm');
const TestVector = require('./utils/helper').TestVector;
const NodeApp = require('./fixtures/node-console/index').NodeApp;

const t = require('tap');
const axios = require('axios');
const getToken = require('./utils/token');

const realmName = `UnitTesting-${__filename.slice(__dirname.length + 1, -3)}`;
const appFileTest = new NodeApp();

t.test('setup', async t => {
  t.comment(`START TESTING FILE : ${__filename}`);
  return admin.destroy(realmName, {ignoreDestroyRealNowFound: true})
  .finally(() => {
    return admin.createRealm(realmName)
    .then(() => {
      return appFileTest.bearerOnly();
    })
    .then((clientRep) => {
      return admin.createClient(clientRep, realmName);
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


t.test('Should test unprotected route.', t => {
  t.plan(1);
  const opt = {
    method: 'get',
    url: `${appFileTest.address}/service/public`
  };
  return axios(opt)
    .then(response => {
      t.equal(response.data.message, 'public');
    })
    .catch(error => {
      t.fail(error.response.data);
    });
});

t.test('Should test protected route.', t => {
  t.plan(1);
  const opt = {
    method: 'get',
    url: `${appFileTest.address}/service/admin`
  };
  // return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for no credentials');
  return axios(opt)
  .then(response => {
    t.fail(response.data.message);
  })
  .catch( (error) => {
    t.ok(error.response.status >= 300, `Response Status is bad` );
  });
});

t.test('Should test for bad request on k_logout without any parameters.', t => {
  t.plan(1);
  const opt = {
    method: 'get',
    url: `${appFileTest.address}/k_logout`
  };
  // return t.shouldFail(axios(opt), 'Response should be bad request');
  return axios(opt)
  .then(response => {
    t.fail(response.data.message);
  })
  .catch( (error) => {
    t.ok(error.response.status >= 300, `Response Status is bad` );
  });
});

t.test('Should test protected route with admin credentials.', t => {
  t.plan(1);
  return getToken({ realmName })
    .then((token) => {
      const opt = {
        method: 'get',
        url: `${appFileTest.address}/service/admin`,
        headers: { Authorization: `Bearer ${token}` }
      };
      return axios(opt)
        .then(response => {
          t.equal(response.data.message, 'admin', `Expect the response.data.message to be "admin".`);
        })
        .catch(error => {
          t.fail(error.response.data, `Unexpected restAPI call (via axios) exception occured.`);
        });
    })
    .catch(error => {
      t.fail(error, `Unexpected getToken() call exception occured.`);
    });
});

t.test('Should test protected route with invalid access token.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    const opt = {
      method: 'get',
      url: `${appFileTest.address}/service/admin`,
      headers: {
        Authorization: 'Bearer ' + token.replace(/(.+?\..+?\.).*/, '$1.Invalid')
      }
    };
    // return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for invalid access token');
    return axios(opt)
    .then(response => {
      t.fail(response.data.message);
    })
    .catch( (error) => {
      t.ok(error.response.status >= 300, `Response Status is bad` );
    });
  });
});

t.test('Access should be denied for bearer client with invalid public key.', t => {
  t.plan(1);

  var appUnitTest = new NodeApp();

  return admin.createClient(appUnitTest.bearerOnly('wrongkey-app'), realmName)
  .then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    appUnitTest.build(installation);

    return getToken({ realmName }).then((token) => {
      const opt = {
        method: 'get',
        url: `${appUnitTest.address}/service/admin`,
        headers: {
          Authorization: 'Bearer ' + token
        }
      };

      // return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for invalid public key');
      return axios(opt)
      .then(response => {
        t.fail(response.data.message);
      })
      .catch( (error) => {
        t.ok(error.response.status >= 300, `Response Status is bad` );
      });
    });
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await appUnitTest.destroy();
  })
});

t.test('Should test protected route after push revocation.', t => {
  t.plan(3);

  var appUnitTest = new NodeApp();
  var client = admin.createClient(appUnitTest.bearerOnly('revokeapp'), realmName);

  return client
  .then((installation) => {
    appUnitTest.build(installation);

    return getToken({ realmName })
    .then((token) => {
      t.not(token, undefined, 'Check getToken returned a token.');

      let opt = {
        method: 'get',
        url: `${appUnitTest.address}/service/admin`,
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json'
        }
      };
      
      return axios(opt)
      .then(response => {
        t.equal(response.data.message, 'admin', 'Request expected response to be "admin"');

        opt.url = `${appUnitTest.address}/auth/admin/realms/${realmName}/push-revocation`;
        opt.method = 'post';
        axios(opt);
        opt.url = `${appUnitTest.address}/service/admin`;

        return axios(opt)
        .then(response => {
          t.equal(response.data, 'URL Not found in fake keycloak server!', 'Check for correct axios from app server');
        })
        .catch(error => {
          t.fail(error.response.data, "Unexpected error thrown");
        });
      });
    });
  })
  .catch(err => {
    t.fail(err, "Unexpected error thrown");
  })
  .finally( async () => {
    await appUnitTest.destroy();
  })
});

t.test('Should invoke admin logout.', t => {
  t.plan(3);

  var appUnitTest = new NodeApp();
  var client = admin.createClient(appUnitTest.bearerOnly('anotherapp'), realmName);

  return client
  .then((installation) => {
    appUnitTest.build(installation);

    return getToken({ realmName })
    .then((token) => {
      t.not(token, undefined, 'Check getToken returned a token.');

      let opt = {
        method: 'get',
        url: `${appUnitTest.address}/service/admin`,
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json'
        }
      };
      return axios(opt)
        .then(response => {
          t.equal(response.data.message, 'admin', 'Request expected response to be "admin"');

          opt.url = `${appUnitTest.address}/auth/admin/realms/${realmName}/logout-all`;
          opt.method = 'post';
          axios(opt);
          opt.url = `${appUnitTest.address}/service/admin`;

          return axios(opt)
            .then(response => {
              t.equal(response.data, 'URL Not found in fake keycloak server!', 'Check for correct axios from app server');
            })
            .catch(error => {
              t.fail(error.response.data);
            });
        });
    });
  })
  .catch(err => {
    t.fail(err, "Unexpected error thrown");
  })
  .finally( async () => {
    await appUnitTest.destroy();
  })
});
  
t.test('teardown', async (t) => {
  await appFileTest.destroy();
  await admin.destroy(realmName);
  t.end();
});
