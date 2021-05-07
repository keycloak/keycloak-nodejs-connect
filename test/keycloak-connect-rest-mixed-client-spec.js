/*
 * Copyright 2017 Red Hat Inc. All rights reserved.
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
const NodeApp = require('./fixtures/node-console/index').NodeApp;
const TestVector = require('./utils/helper').TestVector;

const t = require('tap');
const axios = require('axios');
const getToken = require('./utils/token');

const realmName = `UnitTesting-${__filename.slice(__dirname.length + 1, -3)}`;
const appFileTest = new NodeApp();

const auth = {
  username: 'test-admin',
  password: 'password'
};

const getSessionCookie = response => response.headers['set-cookie'][0].split(';')[0];

t.test('setup', async t => {
  t.comment(`START TESTING FILE : ${__filename}`);
  return admin.destroy(realmName, {ignoreDestroyRealNowFound: true})
  .finally(() => {
    return admin.createRealm(realmName)
    .then(() => {
      return appFileTest.confidential();
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

t.test('Should test protected route - redirect to login page.', t => {
  t.plan(2);
  const opt = {
    url: `${appFileTest.address}/service/admin`
  };
  return axios(opt)
  .then(response => {
    t.equal(response.status, 200);
    t.ok(response.data, "Response contains data.");
    if (response.data.indexOf('Sign in to your account') == 0) {
      t.fail('protect did not redirect to login page!!!');
    }
  })
  .catch( (error) => {
    t.fail(error, "Unexpected error thrown");
  });
});

t.test('Should test protected route with admin credentials.', t => {
  t.plan(3);
  return getToken({ realmName })
  .then((token) => {
    const opt = {
      url: `${appFileTest.address}/service/admin`,
      headers: { Authorization: `Bearer ${token}` }
    };
    return axios(opt);
  })
  .then(response => {
    t.equal(response.status, 200);
    t.ok(response.data, "Response contains data.");
    t.equal(response.data.message, 'admin');
  })
  .catch(error => {
    t.fail(error, "Unexpected error thrown");
  });
});

t.test('Should test protected route with invalid access token.', t => {
  t.plan(2);
  return getToken({ realmName }).then((token) => {
    const opt = {
      url: `${appFileTest.address}/service/admin`,
      headers: {
        Authorization: 'Bearer ' + token.replace(/(.+?\..+?\.).*/, '$1.Invalid')
      }
    };
    // return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for invalid access token');
    return axios(opt)
    .then(response => {
      t.equal(response.status, 200);
      t.ok(response.data, "Response contains data.");
      if (response.data.indexOf('Sign in to your account') == 0) {
        t.fail('protect did not redirect to login page!!!');
      }
    })
    .catch( (error) => {
      t.fail(error, "Unexpected error thrown");
    });
  });
});

t.test('Should handle direct access grants.', t => {
  t.plan(3);
  return axios.post(`${appFileTest.address}/service/grant`, auth)
    .then(response => {
      t.ok(response.data.id_token, 'Response should contain an id_token');
      t.ok(response.data.access_token, 'Response should contain an access_token');
      t.ok(response.data.refresh_token, 'Response should contain an refresh_token');
    })
    .catch(error => {
      t.fail(error.response.data);
    });
});

t.test('Should store the grant.', t => {
  t.plan(3);
  const endpoint = `${appFileTest.address}/service/grant`;
  return axios.post(endpoint, auth)
    .then(response => getSessionCookie(response))
    .then(cookie => {
      return axios.get(endpoint, { headers: { cookie } })
        .then(response => {
          t.ok(response.data.id_token, 'Response should contain an id_token');
          t.ok(response.data.access_token, 'Response should contain an access_token');
          t.ok(response.data.refresh_token, 'Response should contain an refresh_token');
        });
    });
});

t.test('Should not store grant on bearer request', t => {
  t.plan(4);
  const endpoint = `${appFileTest.address}/service/grant`;
  let sessionCookie;

  return axios.post(endpoint, auth)
    .then(response => {
      const data = {
        cookie: getSessionCookie(response),
        grant: response.data
      };
      sessionCookie = data.cookie;
      return data;
    })
    .then(data => {
      const opt = {
        url: `${appFileTest.address}/service/secured`,
        headers: {
          Authorization: 'Bearer ' + data.grant.access_token.token,
          Cookie: data.cookie
        }
      };

      return axios(opt)
        .then(response => {
          t.equal(response.data.message, 'secured');

          const opt = {
            url: endpoint,
            headers: {
              Cookie: sessionCookie
            }
          };

          return axios(opt)
            .then(response => {
              t.ok(response.data.id_token, 'Response should contain an id_token');
              t.ok(response.data.access_token, 'Response should contain an access_token');
              t.ok(response.data.refresh_token, 'Response should contain an refresh_token');
            });
        });
    });
});

t.test('Should test admin logout endpoint with incomplete payload', t => {
  t.plan(2);

  var appUnitTest = new NodeApp();
  var client = admin.createClient(appUnitTest.confidential('adminapp'), realmName);

  return client.then((installation) => {
    appUnitTest.build(installation);

    let opt = {
      method: 'post',
      url: `${appUnitTest.address}/k_logout`,
      data: TestVector.logoutIncompletePayload
    };
    return axios(opt).catch(err => {
      t.equal(err.response.status, 401);
      /* eslint no-useless-escape: "error" */
      t.equal(err.response.data, 'Cannot read property \'kid\' of undefined');
    });
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally(async () => {
    await appUnitTest.destroy();
  })
});

t.test('Should test admin logout endpoint with payload signed by a different key pair', t => {
  t.plan(2);

  var appUnitTest = new NodeApp();
  var client = admin.createClient(appUnitTest.confidential('adminapp2'), realmName);

  return client.then((installation) => {
    appUnitTest.build(installation);

    let opt = {
      method: 'post',
      url: `${appUnitTest.address}/k_logout`,
      data: TestVector.logoutWrongKeyPairPayload
    };
    return axios(opt).catch(err => {
      t.equal(err.response.status, 401);
      t.equal(err.response.data, 'admin request failed: invalid token (signature)');
    });
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally(async () => {
    await appUnitTest.destroy();
  })
});

t.test('Should test admin logout endpoint with valid payload', t => {
  t.plan(1);

  var appUnitTest = new NodeApp();
  var client = admin.createClient(appUnitTest.confidential('adminapp3'), realmName);

  return client.then((installation) => {
    appUnitTest.build(installation);
    let opt = {
      method: 'post',
      url: `${appUnitTest.address}/k_logout`,
      data: TestVector.logoutValidPayload
    };
    return axios(opt).then(response => {
      t.equal(response.status, 200);
    }).catch(err => {
      t.fail(err.response.data);
    });
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async() => {
    await appUnitTest.destroy();
  })
});

t.test('Should test admin push_not_before endpoint with incomplete payload', t => {
  t.plan(2);

  var appUnitTest = new NodeApp();
  var client = admin.createClient(appUnitTest.confidential('adminapp5'), realmName);

  return client.then((installation) => {
    appUnitTest.build(installation);

    let opt = {
      method: 'post',
      url: `${appUnitTest.address}/k_push_not_before`,
      data: TestVector.notBeforeIncompletePayload
    };
    return axios(opt).catch(err => {
      t.equal(err.response.status, 401);
      /* eslint no-useless-escape: "error" */
      t.equal(err.response.data, 'Cannot read property \'kid\' of undefined');
    });
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async() => {
    await appUnitTest.destroy();
  })
});

t.test('Should test admin push_not_before endpoint with payload signed by a different key pair', t => {
  t.plan(2);

  var appUnitTest = new NodeApp();
  var client = admin.createClient(appUnitTest.confidential('adminapp6'), realmName);

  return client.then((installation) => {
    appUnitTest.build(installation);

    let opt = {
      method: 'post',
      url: `${appUnitTest.address}/k_push_not_before`,
      data: TestVector.notBeforeWrongKeyPairPayload
    };
    return axios(opt).catch(err => {
      t.equal(err.response.status, 401);
      t.equal(err.response.data, 'admin request failed: invalid token (signature)');
    });
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await appUnitTest.destroy();
  })
});

t.test('Should verify during authentication if the token contains the client name as audience.', async t => {
  t.plan(3);
  const appUnitTest = new NodeApp();
  const clientRep = await appUnitTest.confidential('audience-app');
  
  return admin.createClient(clientRep, realmName)
  .then((installation) => {  
    installation.verifyTokenAudience = true;
    return appUnitTest.build(installation);
  })
  .then(() => {
    return axios.post(`${appUnitTest.address}/service/grant`, auth)
  })
  .then(response => {
    t.ok(response.data.id_token, 'Response should contain an id_token');
    t.ok(response.data.access_token, 'Response should contain an access_token');
    t.ok(response.data.refresh_token, 'Response should contain an refresh_token');
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await appUnitTest.destroy();
  })
});

t.test('Should test admin push_not_before endpoint with valid payload', async t => {
  t.plan(1);
  const appUnitTest = new NodeApp();
  const clientRep = await appUnitTest.confidential('adminapp7');
  
  return admin.createClient(clientRep, realmName)
  .then((installation) => {
    return appUnitTest.build(installation);
  })
  .then(() => {    
    let opt = {
      method: 'post',
      url: `${appUnitTest.address}/k_push_not_before`,
      data: TestVector.notBeforeValidPayload
    };
    return axios(opt)
  })
  .then(response => {
    t.equal(response.status, 200);
  })
  .catch(err => {
    t.fail(err, "Enexpected error thrown");
  })
  .finally( async () => {
    await appUnitTest.destroy();
  })
});

t.test('Should logout with redirect url', t => {
  t.plan(1);
  const serviceEndpoint = `${appFileTest.address}/service/grant`;
  const logoutEndpoint = `${appFileTest.address}/logout?redirect_url=http%3A%2F%2Flocalhost%3A${appFileTest.port}%2Fbye`;
  return axios.post(serviceEndpoint, auth)
    .then(response => getSessionCookie(response))
    .then(cookie => {
      return axios.get(logoutEndpoint, { headers: { cookie } })
        .then(response => {
          t.assert(response.request.path, '/bye', 'Expected redirect after logout');
        });
    });
});

t.test('teardown', async (t) => {
  await appFileTest.destroy();
  await admin.destroy(realmName);
  t.end();
});
