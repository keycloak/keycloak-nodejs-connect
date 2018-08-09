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
const NodeApp = require('./fixtures/node-console/index').NodeApp;

const test = require('blue-tape');
const roi = require('roi');
const getToken = require('./utils/token');

const realmName = 'policy-enforcer-realm';
const realmManager = admin.createRealm(realmName);
const app = new NodeApp();

test('setup', t => {
  return realmManager.then(() => {
    return admin.createClient(app.enforcerResourceServer(), realmName)
    .then((installation) => {
      return app.build(installation);
    });
  });
});

test('Should test access to protected resource and scope view.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/protected/enforcer/resource',
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return roi.get(opt)
    .then(x => {
      t.equal(JSON.parse(x.body).message, 'resource:view');
    });
  });
});

test('Should test access to protected resource and scope update.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/protected/enforcer/resource',
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return roi.post(opt)
    .then(x => {
      t.equal(JSON.parse(x.body).message, 'resource:update');
    });
  });
});

test('Should test no access to protected resource and scope delete.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/protected/enforcer/resource',
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return t.shouldFail(roi.del(opt), 'Access denied', 'Response should be access denied for resource:delete');
  });
});

test('Should test no access to protected resource and scope view and delete.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/protected/enforcer/resource-view-delete',
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return t.shouldFail(roi.get(opt), 'Access denied', 'Response should be access denied for resource:delete');
  });
});

test('Should test access to protected resource pushing claims.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/protected/enforcer/resource-claims?user_agent=mozilla',
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return roi.get(opt)
    .then(x => {
      t.equal(JSON.parse(x.body).message, 'mozilla');
    });
  });
});

test('Should test no access to protected resource wrong claims.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/protected/enforcer/resource-claims?user_agent=ie',
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return t.shouldFail(roi.get(opt), 'Access denied', 'Response should be access denied for resource:delete');
  });
});

test('Should test access to resources without any permission defined.', t => {
  t.plan(1);
  return getToken({ realmName }).then((token) => {
    var opt = {
      endpoint: app.address + '/protected/enforcer/no-permission-defined',
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    return roi.get(opt)
    .then(x => {
      t.equal(JSON.parse(x.body).message, 'always grant, no permissions defined');
    });
  });
});

test('teardown', t => {
  return realmManager.then((realm) => {
    app.destroy();
    admin.destroy(realmName);
  });
});
