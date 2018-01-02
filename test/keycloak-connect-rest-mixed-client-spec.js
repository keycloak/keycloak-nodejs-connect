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
const roi = require('roi');
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
    'endpoint': app.address + '/service/admin'
  };
  return t.shouldFail(roi.get(opt), 'Access denied', 'Response should be access denied for no credentials');
});

test('Should test protected route with admin credentials.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/service/admin',
      headers: {
        Authorization: 'Bearer ' + token
      }
    };
    return roi.get(opt)
    .then(x => {
      t.equal(JSON.parse(x.body).message, 'admin');
    });
  });
});

test('Should test protected route with invalid access token.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/service/admin',
      headers: {
        Authorization: 'Bearer ' + token.replace(/(.+?\..+?\.).*/, '$1.Invalid')
      }
    };
    return t.shouldFail(roi.get(opt), 'Access denied', 'Response should be access denied for invalid access token');
  });
});

test('Should handle direct access grants.', t => {
  const endpoint = app.address + '/service/grant';
  t.plan(3);

  return roi.post({ endpoint }, auth)
  .then(res => JSON.parse(res.body))
  .then(body => {
    t.ok(body.id_token, 'Response should contain an id_token');
    t.ok(body.access_token, 'Response should contain an access_token');
    t.ok(body.refresh_token, 'Response should contain an refresh_token');
  });
});

test('Should store the grant.', t => {
  const endpoint = app.address + '/service/grant';
  t.plan(3);
  return roi.post({ endpoint }, auth)
  .then(res => getSessionCookie(res))
  .then(cookie => {
    return roi.get({ endpoint, headers: { cookie } })
    .then(res => JSON.parse(res.body))
    .then(body => {
      t.ok(body.id_token, 'Response should contain an id_token');
      t.ok(body.access_token, 'Response should contain an access_token');
      t.ok(body.refresh_token, 'Response should contain an refresh_token');
    });
  });
});

test('Should not store grant on bearer request', t => {
  t.plan(4);
  const endpoint = app.address + '/service/grant';
  let sessionCookie;

  return roi.post({ endpoint }, auth)
  .then(res => {
    const data = {
      cookie: getSessionCookie(res),
      grant: JSON.parse(res.body)
    };
    sessionCookie = data.cookie;
    return data;
  })
  .then(data => {
    const opt = {
      endpoint: app.address + '/service/secured',
      headers: {
        Authorization: 'Bearer ' + data.grant.access_token.token,
        Cookie: data.cookie
      }
    };

    return roi.get(opt)
    .then(res => JSON.parse(res.body))
    .then(body => {
      t.equal(body.message, 'secured');

      const opt = {
        endpoint,
        headers: {
          Cookie: sessionCookie
        }
      };

      return roi.get(opt)
      .then(res => JSON.parse(res.body))
      .then(body => {
        t.ok(body.id_token, 'Response should contain an id_token');
        t.ok(body.access_token, 'Response should contain an access_token');
        t.ok(body.refresh_token, 'Response should contain an refresh_token');
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
