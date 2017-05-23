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
const TestVector = require('./utils/helper').TestVector;
const NodeApp = require('./fixtures/node-console/index').NodeApp;

const test = require('blue-tape');
const roi = require('roi');
const getToken = require('./utils/token');

const realmManager = admin.createRealm('service-node-realm');

// FIXME To be removed after merge service-nodejs and node-console
const type = admin.client;
const app = type.bearerOnly('3000');

test('setup', t => {
  return realmManager.then((realm) => {
    return admin.createClient(app, 'service-node-realm');
  })
})

test('Should test unprotected route.', t => {
  t.plan(1);
  const opt = {
    'endpoint': app.adminUrl + '/service/public'
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
  t.plan(1);
  const opt = {
    'endpoint': app.adminUrl + '/service/admin'
  };

  roi.get(opt).then(x => {
    t.fail('Should never reach this block');
  }).catch(e => {
    t.equal(e.toString(), 'Access denied');
    t.end();
  });
});

test('Should test protected route with admin credentials.', t => {
  t.plan(1);
  getToken().then((token) => {
    var opt = {
      endpoint: app.adminUrl + '/service/admin',
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

test('Should test protected route with invalid access token.', t => {
  t.plan(1);
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

test('Access should be denied for bearer client with invalid public key.', t => {
  t.plan(1);
  var someApp = new NodeApp();
  var client = admin.createClient(type.bearerOnly(someApp.port, 'wrongkey-app'), 'service-node-realm');

  client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    someApp.build(installation);

    getToken().then((token) => {
      var opt = {
        endpoint: 'http://localhost:' + someApp.port + '/service/admin',
        headers: {
          Authorization: 'Bearer ' + token
        }
      };
      roi.get(opt).then(x => {
        t.fail('Should never reach this block');
      }).catch(e => {
        t.equal(e.toString(), 'Access denied');
        someApp.close();
        t.end();
      });
    }).catch((err) => {
      console.error(err);
      t.error(err, 'Unable to retrieve access token');
    })
  });
});

test('Should test protected route after push revocation.', t => {
  t.plan(2);

  getToken().then((token) => {
    var opt = {
      endpoint: app.adminUrl + '/service/admin',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json'
      }
    };
    roi.get(opt)
      .then(x => {
        t.equal(JSON.parse(x.body).message, 'admin');
      })
      .catch(e => t.error(e, 'Should return a response to the admin'));

    opt.endpoint = 'http://localhost:8080/auth/admin/realms/service-node-realm/push-revocation';
    roi.post(opt);
    opt.endpoint = app.adminUrl + '/service/admin';

    roi.get(opt).then(x => {
      t.equal(x.body, 'Not found!');
      t.end();
    }).catch(e => {
      console.error(e);
      t.fail();
    });

  }).catch((err) => {
    console.error(err);
    t.error(err, 'Unable to retrieve access token');
  })
});

test('Should invoke admin logout', t => {
  t.plan(2);

  getToken().then((token) => {
    var opt = {
      endpoint: app.adminUrl + '/service/admin',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json'
      }
    };
    roi.get(opt)
      .then(x => {
        t.equal(JSON.parse(x.body).message, 'admin');
      })
      .catch(e => t.error(e, 'Should return a response to the admin'));

    opt.endpoint = 'http://localhost:8080/auth/admin/realms/service-node-realm/logout-all';
    roi.post(opt);
    opt.endpoint = app.adminUrl + '/service/admin';

    roi.get(opt).then(x => {
      t.equal(x.body, 'Not found!');
      t.end();
    }).catch(e => {
      console.error(e);
      t.fail();
    });

  }).catch((err) => {
    console.error(err);
    t.error(err, 'Unable to retrieve access token');
  })
});

test('teardown', t => {
  return realmManager.then((realm) => {
    server.close();
    admin.destroy('service-node-realm');
  });
})

