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

const test = require('blue-tape');
const axios = require('axios');
const getToken = require('./utils/token');

const realmName = 'mixed-mode-realm';
const realmManager = admin.createRealm(realmName);
const app = new NodeApp();

const auth = {
  username: 'test-admin',
  password: 'password'
};

const getSessionCookie = response => response.headers['set-cookie'][0].split(';')[0];

test('setup', t => {
  return realmManager.then(() => {
    return admin.createClient(app.confidential(), realmName)
      .then((installation) => {
        return app.build(installation);
      });
  });
});

test('Should test protected route.', t => {
  t.plan(1);
  const opt = {
    url: `${app.address}/service/admin`
  };
  return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for no credentials');
});

test('Should test protected route with admin credentials.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    const opt = {
      url: `${app.address}/service/admin`,
      headers: { Authorization: `Bearer ${token}` }
    };
    return axios(opt)
      .then(response => {
        t.equal(response.data.message, 'admin');
      })
      .catch(error => {
        t.fail(error.response.data);
      });
  });
});

test('Should test protected route with invalid access token.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    const opt = {
      url: `${app.address}/service/admin`,
      headers: {
        Authorization: 'Bearer ' + token.replace(/(.+?\..+?\.).*/, '$1.Invalid')
      }
    };
    return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for invalid access token');
  });
});

test('Should handle direct access grants.', t => {
  t.plan(3);
  return axios.post(`${app.address}/service/grant`, auth)
    .then(response => {
      t.ok(response.data.id_token, 'Response should contain an id_token');
      t.ok(response.data.access_token, 'Response should contain an access_token');
      t.ok(response.data.refresh_token, 'Response should contain an refresh_token');
    })
    .catch(error => {
      t.fail(error.response.data);
    });
});

test('Should store the grant.', t => {
  t.plan(3);
  const endpoint = `${app.address}/service/grant`;
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

test('Should not store grant on bearer request', t => {
  t.plan(4);
  const endpoint = `${app.address}/service/grant`;
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
        url: `${app.address}/service/secured`,
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

test('teardown', t => {
  return realmManager.then((realm) => {
    app.destroy();
    admin.destroy(realmName);
  });
});
