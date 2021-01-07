'use strict';

const admin = require('./utils/realm');
const NodeApp = require('./fixtures/node-console/restify').NodeApp;

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

test('Should verify during authentication if the token contains the client name as audience.', t => {
  t.plan(3);
  const someapp = new NodeApp();
  var client = admin.createClient(someapp.confidential('audience-app'), realmName);

  return client.then((installation) => {
    installation.verifyTokenAudience = true;
    someapp.build(installation);

    return axios.post(`${someapp.address}/service/grant`, auth)
      .then(response => {
        t.ok(response.data.id_token, 'Response should contain an id_token');
        t.ok(response.data.access_token, 'Response should contain an access_token');
        t.ok(response.data.refresh_token, 'Response should contain an refresh_token');
      })
      .catch(error => {
        t.fail(error.response.data);
      });
  }).then(() => {
    someapp.destroy();
  });
});

test('teardown', t => {
  return realmManager.then((realm) => {
    app.destroy();
    admin.destroy(realmName);
  });
});
