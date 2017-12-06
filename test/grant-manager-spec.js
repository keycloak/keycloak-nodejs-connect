'use strict';

const GrantManager = require('../middleware/auth-utils/grant-manager');
const Config = require('../middleware/auth-utils/config');
const test = require('tape');
const nock = require('nock');
const extend = require('util')._extend;
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const getManager = (fixture) => new GrantManager(new Config(fixture));
const helper = require('./utils/helper');

test('GrantManager with empty configuration', (t) => {
  t.throws(function () {
    getManager(undefined);
  }, Error);
  t.end();
});

test('GrantManager with rogue configuration', (t) => {
  const rogueManager = getManager({});
  t.equal(rogueManager.access_token, undefined);
  t.equal(rogueManager.client_id, undefined);
  t.equal(rogueManager.publicKey, undefined);
  t.equal(rogueManager.secret, undefined);
  t.end();
});

test('GrantManager in public mode should be able to obtain a grant', (t) => {
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
    .then(t.end);
});

test('GrantManager in public mode should be able to obtain a raw grant', (t) => {
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.toString(), undefined))
    .then(t.end);
});

test('GrantManager in public mode with public key configured should be able to obtain a grant', (t) => {
  const manager = getManager('./test/fixtures/auth-utils/keycloak-with-public-key.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
    .then(t.end);
});

test('GrantManager should return empty with public key configured but invalid signature', (t) => {
  const manager = getManager('./test/fixtures/auth-utils/keycloak-with-public-key.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
      return manager.validateToken(grant.access_token);
    })
    .catch((e) => {
      t.equal(e.message, 'invalid token (signature)');
    })
    .then(t.end);
});

test('GrantManager in public mode should be able to get userinfo', (t) => {
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json');
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => manager.userInfo(grant.access_token))
    .then((user) => t.equal(user.preferred_username, 'test-user'))
    .then(t.end);
});

const manager = getManager('./test/fixtures/auth-utils/keycloak-confidential.json');

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

test('GrantManager in confidential mode should be able to obtain a service account grant', (t) => {
  manager.obtainFromClientCredentials()
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
      grant.access_token.signature = new Buffer('this signature is invalid');
      grant.refresh_token.signature = new Buffer('this signature is also invalid');
      grant.id_token.signature = new Buffer('this signature is still invalid');
      return manager.validateGrant(grant);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (public key signature)');
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .then(t.end);
});

test('GrantManager should reject with token missing error when bearer only', (t) => {
  const originalBearerOnly = manager.bearerOnly;
  manager.bearerOnly = true;
  manager.createGrant('{ }')
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (missing)');
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .then((x) => {
      manager.bearerOnly = originalBearerOnly;
      t.end();
    });
});

test('GrantManager should reject with refresh token missing error', (t) => {
  manager.createGrant('{ }')
  .catch((e) => {
    t.equal(e.message, 'Unable to refresh without a refresh token');
  })
  .then((grant) => {
    t.equal(grant, undefined);
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

test('GrantManager should be false for user with no realm level roles', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.realm_access = {};
      t.false(grant.access_token.hasRealmRole('test'));
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

test('GrantManager in confidential mode should use callback if provided and validate access token', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      manager.validateAccessToken(grant.access_token, function (err, result) {
        if (err) {
          t.end(err);
        }
        t.equal(result, grant.access_token);
        t.end();
      });
    });
});

test('GrantManager should be able to remove expired access_token token and keep others', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.exp = 0;
      return manager.validateGrant(grant);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (expired)');
    })
    .then((grant) => {
      t.equal(grant, undefined);
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
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong ISS)');
    })
    .then(t.end);
});

test('GrantManager should be able to validate invalid iat', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.iat = -5;
      return manager.validateGrant(grant);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (future dated)');
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
      t.equal(e.message, 'Unable to refresh without a refresh token');
    })
    .then(t.end);
});

test('GrantManager should validate unsigned token', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signed = false;
      return manager.validateToken(grant.access_token);
    })
    .catch(e => {
      t.equal(e.message, 'invalid token (not signed)');
    })
    .then(t.end);
});

test('GrantManager should fail to load public key when kid is empty', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.header.kid = {};
      return manager.validateToken(grant.access_token);
    })
    .catch(e => {
      t.equal(e.message, 'failed to load public key to verify token');
    })
    .then(t.end);
});

test('GrantManager should fail with invalid signature', (t) => {
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
      return manager.validateToken(grant.access_token);
    })
    .catch(e => {
      t.equal(e.message, 'invalid token (public key signature)');
    })
    .then(t.end);
});

test('GrantManager#obtainDirectly should work with https', (t) => {
  nock('https://localhost:8080')
    .post('/auth/realms/nodejs-test/protocol/openid-connect/token', {
      client_id: 'public-client',
      username: 'test-user',
      password: 'tiger',
      grant_type: 'password',
      scope: 'openid'
    })
    .reply(204, helper.dummyReply);
  const manager = getManager('./test/fixtures/auth-utils/keycloak-https.json');
  manager.validateToken = (t) => { return Promise.resolve(t); };
  manager.ensureFreshness = (t) => { return Promise.resolve(t); };

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
  const manager = getManager('./test/fixtures/auth-utils/keycloak-https.json');
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
