'use strict';

const GrantManager = require('../../index').GrantManager;
const Config = require('../../index').Config;
const test = require('tape');
const nock = require('nock');

const getManager = (fixture) => new GrantManager(new Config(fixture));
const reply = {
  'access_token': 'Dummy access token',
  'expires_in': 2,
  'refresh_expires_in': 1800,
  'refresh_token': 'Dummy refresh token',
  'token_type': 'bearer',
  'id_token': 'Dummy id token',
  'not-before-policy': 1462208947,
  'session_state': '22e0b5bd-fb0f-4f99-93aa-a60c4b934c88'
};

test('GrantManager#obtainDirectly should work with https', (t) => {
  nock('https://localhost:8080')
    .post('/auth/realms/nodejs-test/protocol/openid-connect/token', {
      client_id: 'public-client',
      username: 'test-user',
      password: 'tiger',
      grant_type: 'password'
    })
    .reply(204, reply);
  const manager = getManager('test/fixtures/keycloak-https.json');
  manager.validateToken = (t) => { return Promise.resolve(t); };

  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.equal(grant.access_token.token, 'Dummy access token'))
    .then(t.end);
});

test('GrantManager#validateToken returns undefined for an invalid token', (t) => {
  const expiredToken = {
    isExpired: () => true
  };
  const unsignedToken = {
    isExpired: () => false,
    signed: undefined
  };
  const notBeforeToken = {
    isExpired: () => false,
    signed: true,
    content: { iat: -1 }
  };
  const manager = getManager('test/fixtures/keycloak-https.json');
  const tokens = [
    undefined,
    expiredToken,
    unsignedToken,
    notBeforeToken
  ];

  /* jshint loopfunc:true */
  for (const token of tokens) {
    manager.validateToken(token)
    .catch((err) => {
      t.true(err instanceof Error, err.message);
    });
  }
  t.end();
});
