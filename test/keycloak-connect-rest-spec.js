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

const server = require('./fixtures/service-nodejs/index');
const admin = require('./utils/realm');
const type = admin.client;
const TestVector = require('./utils/helper').TestVector;

const test = require('tape');
const roi = require('roi');
const getToken = require('./utils/token');
const NodeApp = require('./fixtures/node-console/index').NodeApp;

test('Should test unprotected route.', t => {
  const opt = {
    'endpoint': 'http://localhost:3000/service/public'
  };

  roi.get(opt)
    .then(x => {
      t.equal(JSON.parse(x.body).message, 'public');
      t.end();
    })
    .catch(e => {
      console.error(e);
      t.fail();
    });
});

test('Should test protected route.', t => {
  const opt = {
    'endpoint': 'http://localhost:3000/service/admin'
  };

  roi.get(opt).then(x => {
    t.fail('Should never reach this block');
  }).catch(e => {
    t.equal(e.toString(), 'Access denied');
    t.end();
  });
});

test('Should test secured route with admin credentials.', t => {
  getToken().then((token) => {
    var opt = {
      endpoint: 'http://localhost:3000/service/admin',
      headers: {
        Authorization: 'Bearer ' + token
      }
    };
    roi.get(opt)
      .then(x => {
        t.equal(JSON.parse(x.body).message, 'admin');
        t.end();
      })
      .catch(e => t.error(e, 'Should return a response to the admin'));

  }).catch((err) => {
    console.error(err);
    t.error(err, 'Unable to retrieve access token');
  })
});

test('Should test secured route with invalid access token.', t => {
  getToken().then((token) => {
    var opt = {
      endpoint: 'http://localhost:3000/service/admin',
      headers: {
        Authorization: 'Bearer ' + token.replace(/(.+?\..+?\.).*/, '$1.Invalid')
      }
    };
    roi.get(opt).then(x => {
      t.fail('Should never reach this block');
    }).catch(e => {
      t.equal(e.toString(), 'Access denied');
      t.end();
    });

  }).catch((err) => {
    console.error(err);
    t.error(err, 'Unable to retrieve access token');
  })
});

test('Status should be not found for bearer client with invalid public key.', t => {
  var app = new NodeApp();
  var client = admin.createClient(type.bearerOnly(app.port, 'wrongkey-app'), 'service-node-realm');

  client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);

    getToken().then((token) => {
      var opt = {
        endpoint: 'http://localhost:' + app.port + '/service/admin',
        headers: {
          Authorization: 'Bearer ' + token
        }
      };
      roi.get(opt).then(x => {
        t.equal(x.statusCode !== 404, true);
        t.end();
      }).then(() => {
        app.close();
      }).catch(e => {
        console.error(e);
        t.fail();
      });
    }).catch((err) => {
      console.error(err);
      t.error(err, 'Unable to retrieve access token');
    })
  });
});

test('teardown', function (t) {
  server.close();
  t.end();
});
