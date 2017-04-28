'use strict';

const GrantManager = require('../../index').GrantManager;
const Config = require('../../index').Config;
const test = require('tape');
const extend = require('util')._extend;
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const getManager = (fixture) => new GrantManager(new Config(fixture));

test('GrantManager in public mode should be able to obtain a grant', (t) => {
  const manager = getManager('test/fixtures/keycloak-public.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
    .then(t.end);
});

test('GrantManager in public mode with public key configured should be able to obtain a grant', (t) => {
  const manager = getManager('test/fixtures/keycloak-with-public-key.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
    .then(t.end);
});

test('GrantManager in public mode should be able to get userinfo', (t) => {
  const manager = getManager('test/fixtures/keycloak-public.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => manager.userInfo(grant.access_token))
    .then((user) => t.equal(user.preferred_username, 'test-user'))
    .then(t.end);
});

const manager = getManager('test/fixtures/keycloak-confidential.json');

test('GrantManager in confidential mode should be able to get userinfo', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => manager.userInfo(grant.access_token))
    .then((user) => t.equal(user.preferred_username, 'test-user'))
    .then(t.end);
});

test('GrantManager in confidential mode should be able to obtain a grant', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
    .then(t.end);
});

test('GrantManager in confidential mode should be able to refresh a grant', (t) => {
  let originalAccessToken;
  manager.obtainDirectly('test-user', 'tiger')
    .then(delay(3000))
    .then((grant) => {
      t.notEqual(grant.access_token, undefined);
      originalAccessToken = grant.access_token;
      return grant;
    })
    .then((grant) => manager.ensureFreshness(grant))
    .then((grant) => {
      t.notEqual(grant.access_token, undefined);
      t.notEqual(grant.access_token.token, originalAccessToken.token);
    })
    .then(t.end);
});

test('GrantManager in confidential mode should be able to validate a valid token', (t) => {
  let originalAccessToken;
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalAccessToken = grant.access_token;
      return manager.validateAccessToken(grant.access_token);
    })
    .then((token) => {
      t.notEqual(token, undefined);
      t.equal(token, originalAccessToken);
    })
    .then(t.end);
});

test('GrantManager in confidential mode should be able to validate an invalid token', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then(delay(3000))
    .then((grant) => manager.validateAccessToken(grant.access_token))
    .then((result) => t.equal(result, false))
    .then(t.end);
});

test('GrantManager in confidential mode should be able to validate a token has an invalid signature', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.token = grant.access_token.token.replace(/(.+?\..+?\.).*/, '$1.InvalidSignatureIsHereAgain');
      return manager.validateAccessToken(grant.access_token);
    })
    .then((result) => t.equal(result, false))
    .then(t.end);
});

test('GrantManager in confidential mode should be able to validate a valid token string', (t) => {
  let originalAccessToken;
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalAccessToken = grant.access_token.token;
      return manager.validateAccessToken(grant.access_token.token);
    })
    .then((token) => {
      t.notEqual(token, undefined);
      t.equal(token, originalAccessToken);
    })
    .then(t.end);
});

test('GrantManager in confidential mode should be able to validate an invalid token string', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then(delay(3000))
    .then((grant) => {
      return manager.validateAccessToken(grant.access_token.token);
    })
    .then((result) => t.equal(result, false))
    .then(t.end);
});

test('GrantManager should be able to validate tokens in a grant', (t) => {
  let originalAccessToken, originalRefreshToken, orginalIdToken;
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalAccessToken = grant.access_token;
      originalRefreshToken = grant.refresh_token;
      orginalIdToken = grant.id_token;
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.notEqual(grant.access_token, undefined);
      t.equal(grant.access_token, originalAccessToken);
      t.equal(grant.refresh_token, originalRefreshToken);
      t.equal(grant.id_token, orginalIdToken);
    })
    .then(t.end);
});

test('GrantManager should be able to remove invalid tokens from a grant', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = Buffer.from('this signature is invalid');
      grant.refresh_token.signature = Buffer.from('this signature is also invalid');
      grant.id_token.signature = Buffer.from('this signature is still invalid');
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant.access_token, undefined);
      t.equal(grant.refresh_token, undefined);
      t.equal(grant.id_token, undefined);
    })
    .then(t.end);
});

test('GrantManager should return empty access token data', (t) => {
  manager.createGrant('{ }')
    .then((grant) => {
      t.equal(grant.access_token, undefined);
      t.equal(grant.refresh_token, undefined);
      t.equal(grant.id_token, undefined);
      t.equal(grant.token_type, undefined);
      t.equal(grant.expires_in, undefined);
    })
    .then(t.end);
});

test('GrantManager validate empty access token', (t) => {
  manager.validateAccessToken('')
    .then((result) => {
      t.equal(result, false);
    })
    .then(t.end);
});

test('GrantManager return user realm role', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.true(grant.access_token.hasRealmRole('user'));
    })
    .then(t.end);
});

test('GrantManager validate non existent role', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.false(grant.access_token.hasRealmRole(''));
    })
    .then(t.end);
});

test('GrantManager validate non existent role app', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.false(grant.access_token.hasRole(''));
    })
    .then(t.end);
});

test('GrantManager validate existent role app', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.true(grant.access_token.hasRole('test'));
    })
    .then(t.end);
});

test('GrantManager validate role app with empty clientId', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.clientId = '';
      t.false(grant.access_token.hasRole('test'));
    })
    .then(t.end);
});

test('GrantManager validate empty role app', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.false(grant.access_token.hasApplicationRole('', ''));
    })
    .then(t.end);
});

test('GrantManager return user realm role based on realm name', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.true(grant.access_token.hasRole('realm:user'));
    })
    .then(t.end);
});

test('GrantManager should be able to remove expired access_token token and keep others', (t) => {
  let originalGrant;
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalGrant = extend({}, grant);
      grant.access_token.content.exp = 0;
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant.access_token, undefined);
      t.equal(grant.refresh_token, originalGrant.refresh_token);
      t.equal(grant.id_token, originalGrant.id_token);
    })
    .then(t.end);
});

test('GrantManager should return empty when trying to obtain from code with empty params', (t) => {
  manager.obtainFromCode('', '', '', '', function () {})
    .then((result) => {
      t.equal(result, undefined);
    })
    .then(t.end);
});

test('GrantManager should raise an error when trying to obtain from code with rogue params', (t) => {
  manager.obtainFromCode('', '', '', '', {})
    .catch((e) => {
      t.equal(e, '400:Bad Request');
      t.end();
    });
});

test('GrantManager should be able to validate invalid ISS', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.iss = 'http://wrongiss.com';
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant.access_token, undefined);
    })
    .then(t.end);
});

test('GrantManager should be able to validate invalid iat', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.iat = -5;
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant.access_token, undefined);
    })
    .then(t.end);
});
test('GrantManager should be ensure that a grant is fresh', (t) => {
  let originalGrant;
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalGrant = extend({}, grant);
      return manager.ensureFreshness(grant);
    })
    .then((result) => {
      t.notEqual(result, originalGrant);
    })
    .then(t.end);
});

test('GrantManager should raise an error when access token and refresh token do not exist', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant['access_token'] = undefined;
      grant['refresh_token'] = undefined;
      return manager.ensureFreshness(grant);
    })
    .catch(e => {
      t.equal(e.toString(), 'Error: Unable to refresh without a refresh token');
    })
    .then(t.end);
});
