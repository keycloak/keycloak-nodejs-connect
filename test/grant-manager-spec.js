'use strict'

const GrantManager = require('../middleware/auth-utils/grant-manager')
const Config = require('../middleware/auth-utils/config')
const test = require('tape')
const nock = require('nock')
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))
const getManager = (fixture) => new GrantManager(new Config(fixture))
const helper = require('./utils/helper')

test('GrantManager with empty configuration', (t) => {
  t.plan(1)
  t.throws(function () {
    getManager(undefined)
  }, Error)
})

test('GrantManager with rogue configuration', (t) => {
  t.plan(4)
  const rogueManager = getManager({})
  t.equal(rogueManager.access_token, undefined)
  t.equal(rogueManager.client_id, undefined)
  t.equal(rogueManager.publicKey, undefined)
  t.equal(rogueManager.secret, undefined)
})

test('GrantManager in public mode should be able to obtain a grant', (t) => {
  t.plan(1)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
})

test('GrantManager in public mode should be able to obtain a raw grant', (t) => {
  t.plan(1)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.toString(), undefined))
})

test('GrantManager in public mode with public key configured should be able to obtain a grant', (t) => {
  t.plan(1)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-with-public-key.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
})

test('GrantManager in public mode should be able to refresh a grant', (t) => {
  t.plan(1)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-with-public-key.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.true(manager.isGrantRefreshable(grant)))
})

test('GrantManager should return empty with public key configured but invalid signature', (t) => {
  t.plan(1)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-with-public-key.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
      return manager.validateToken(grant.access_token, 'Bearer')
    })
    .catch((e) => {
      t.equal(e.message, 'invalid token (signature)')
    })
})

test('GrantManager in public mode should be able to get userinfo', (t) => {
  t.plan(1)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => manager.userInfo(grant.access_token))
    .then((user) => t.equal(user.preferred_username, 'test-user'))
})

test('GrantManager in public mode should fail if audience of ID token is not valid', (t) => {
  t.plan(2)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = []
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in public mode should fail if audience of ID token is not valid with a dummy client in single array', (t) => {
  t.plan(2)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = ['public-client-dummy']
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in public mode should fail if audience of ID token is not valid with a dummy client in strings', (t) => {
  t.plan(2)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = 'public-client-dummy'
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in public mode should fail if authorized party for ID token is not valid', (t) => {
  t.plan(2)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.azp = []
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (authorized party should match client id)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in public mode should fail if audience of Access token is not valid', (t) => {
  t.plan(2)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.aud = []
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

const manager = getManager('./test/fixtures/auth-utils/keycloak-confidential.json')

test('GrantManager in confidential mode should be able to get userinfo', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => manager.userInfo(grant.access_token))
    .then((user) => t.equal(user.preferred_username, 'test-user'))
})

test('GrantManager in confidential mode should be able to obtain a grant', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.notEqual(grant.access_token, undefined))
})

test('GrantManager in confidential mode should be able to refresh a grant', (t) => {
  t.plan(4)
  let originalAccessToken
  manager.obtainDirectly('test-user', 'tiger')
    .then(delay(3000))
    .then((grant) => {
      t.notEqual(grant.access_token, undefined)
      t.true(manager.isGrantRefreshable(grant))
      originalAccessToken = grant.access_token
      return grant
    })
    .then((grant) => manager.ensureFreshness(grant))
    .then((grant) => {
      t.notEqual(grant.access_token, undefined)
      t.notEqual(grant.access_token.token, originalAccessToken.token)
    })
})

test('GrantManager in confidential mode should be able to validate a valid token', (t) => {
  t.plan(2)
  let originalAccessToken
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalAccessToken = grant.access_token
      return manager.validateAccessToken(grant.access_token)
    })
    .then((token) => {
      t.notEqual(token, undefined)
      t.equal(token, originalAccessToken)
    })
})

test('GrantManager in confidential mode should be able to validate an invalid token', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then(delay(3000))
    .then((grant) => manager.validateAccessToken(grant.access_token))
    .then((result) => t.equal(result, false))
})

test('GrantManager in confidential mode should be able to validate a token has an invalid signature', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.token = grant.access_token.token.replace(/(.+?\..+?\.).*/, '$1.InvalidSignatureIsHereAgain')
      return manager.validateAccessToken(grant.access_token)
    })
    .then((result) => t.equal(result, false))
})

test('GrantManager in confidential mode should be able to validate a valid token string', (t) => {
  t.plan(2)
  let originalAccessToken
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalAccessToken = grant.access_token.token
      return manager.validateAccessToken(grant.access_token.token)
    })
    .then((token) => {
      t.notEqual(token, undefined)
      t.equal(token, originalAccessToken)
    })
})

test('GrantManager in confidential mode should be able to validate an invalid token string', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then(delay(3000))
    .then((grant) => {
      return manager.validateAccessToken(grant.access_token.token)
    })
    .then((result) => t.equal(result, false))
})

test('GrantManager in confidential mode should be able to obtain a service account grant', (t) => {
  t.plan(1)
  manager.obtainFromClientCredentials()
    .then(delay(3000))
    .then((grant) => {
      return manager.validateAccessToken(grant.access_token.token)
    })
    .then((result) => t.equal(result, false))
})

test('GrantManager in confidential mode should fail if audience of ID token is not valid', (t) => {
  t.plan(2)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = []
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in confidential mode should fail if audience of ID token is not valid with a dummy client in strings', (t) => {
  t.plan(2)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = 'confidential-client-dummy'
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in confidential mode should fail if audience of ID token is not valid with a dummy client in single array', (t) => {
  t.plan(2)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-public.json')
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = ['confidential-client-dummy']
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in confidential mode should fail if authorized party for ID token is not valid', (t) => {
  t.plan(2)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.azp = []
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (authorized party should match client id)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager in confidential mode should fail if audience of Access token is not valid', (t) => {
  t.plan(2)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.aud = []
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager should be able to validate tokens in a grant', (t) => {
  t.plan(4)
  let originalAccessToken, originalRefreshToken, orginalIdToken
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalAccessToken = grant.access_token
      originalRefreshToken = grant.refresh_token
      orginalIdToken = grant.id_token
      return manager.validateGrant(grant)
    })
    .then((grant) => {
      t.notEqual(grant.access_token, undefined)
      t.equal(grant.access_token, originalAccessToken)
      t.equal(grant.refresh_token, originalRefreshToken)
      t.equal(grant.id_token, orginalIdToken)
    })
})

test('GrantManager should be able to remove invalid tokens from a grant', (t) => {
  t.plan(2)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = Buffer.from('this signature is invalid')
      grant.refresh_token.signature = Buffer.from('this signature is also invalid')
      grant.id_token.signature = Buffer.from('this signature is still invalid')
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (public key signature)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager should reject with token missing error when bearer only', (t) => {
  t.plan(2)
  const originalBearerOnly = manager.bearerOnly
  manager.bearerOnly = true
  manager.createGrant('{ }')
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (missing)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
    .then((x) => {
      manager.bearerOnly = originalBearerOnly
    })
})

test('GrantManager should not be able to refresh a grant when bearer only', (t) => {
  t.plan(1)
  const originalBearerOnly = manager.bearerOnly
  manager.bearerOnly = true

  try {
    t.false(manager.isGrantRefreshable({ refresh_token: 'a_refresh_token' }))
  } finally {
    manager.bearerOnly = originalBearerOnly
  }
})

test('GrantManager should reject with refresh token missing error', (t) => {
  t.plan(2)
  manager.ensureFreshness({ isExpired: () => true })
    .catch((e) => {
      t.equal(e.message, 'Unable to refresh without a refresh token')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager validate empty access token', (t) => {
  t.plan(1)
  manager.validateAccessToken('')
    .then((result) => {
      t.equal(result, false)
    })
})

test('GrantManager return user realm role', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.true(grant.access_token.hasRealmRole('user'))
    })
})

test('GrantManager validate non existent role', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.false(grant.access_token.hasRealmRole(''))
    })
})

test('GrantManager should be false for user with no realm level roles', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.realm_access = {}
      t.false(grant.access_token.hasRealmRole('test'))
    })
})

test('GrantManager validate non existent role app', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.false(grant.access_token.hasRole(''))
    })
})

test('GrantManager validate existent role app', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.true(grant.access_token.hasRole('test'))
    })
})

test('GrantManager validate role app with empty clientId', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.clientId = ''
      t.false(grant.access_token.hasRole('test'))
    })
})

test('GrantManager validate empty role app', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.false(grant.access_token.hasApplicationRole('', ''))
    })
})

test('GrantManager return user realm role based on realm name', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.true(grant.access_token.hasRole('realm:user'))
    })
})

test('GrantManager in confidential mode should use callback if provided and validate access token', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      manager.validateAccessToken(grant.access_token, function (err, result) {
        if (err) {
          t.end(err)
        }
        t.equal(result, grant.access_token)
      })
    })
})

test('GrantManager should be able to remove expired access_token token and keep others', (t) => {
  t.plan(2)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.exp = 0
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (expired)')
    })
    .then((grant) => {
      t.equal(grant, undefined)
    })
})

test('GrantManager should return empty when trying to obtain from code with empty params', (t) => {
  t.plan(1)
  manager.obtainFromCode('', '', '', '', function () {})
    .then((result) => {
      t.equal(result, undefined)
    })
})

test('GrantManager should raise an error when trying to obtain from code with rogue params', (t) => {
  t.plan(1)
  manager.obtainFromCode('', '', '', '', {})
    .catch((e) => {
      t.equal(e.message, '400:Bad Request')
    })
})

test('GrantManager should be able to validate invalid ISS', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.iss = 'http://wrongiss.com'
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong ISS)')
    })
})

test('GrantManager should be able to validate invalid iat', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.iat = -5
      return manager.validateGrant(grant)
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (stale token)')
    })
})

test('GrantManager should be ensure that a grant is fresh', (t) => {
  t.plan(1)
  let originalGrant
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalGrant = Object.assign({}, grant)
      return manager.ensureFreshness(grant)
    })
    .then((result) => {
      t.notEqual(result, originalGrant)
    })
})

test('GrantManager should raise an error when access token and refresh token do not exist', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token = undefined
      grant.refresh_token = undefined
      return manager.ensureFreshness(grant)
    })
    .catch(e => {
      t.equal(e.message, 'Unable to refresh without a refresh token')
    })
})

test('GrantManager should validate unsigned token', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signed = false
      return manager.validateToken(grant.access_token, 'Bearer')
    })
    .catch(e => {
      t.equal(e.message, 'invalid token (not signed)')
    })
})

test('GrantManager should not validate token with wrong type', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      return manager.validateToken(grant.access_token, 'Refresh')
    })
    .catch(e => {
      t.equal(e.message, 'invalid token (wrong type)')
    })
})

test('GrantManager should fail to load public key when kid is empty', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.header.kid = {}
      return manager.validateToken(grant.access_token, 'Bearer')
    })
    .catch(e => {
      t.equal(e.message, 'failed to load public key to verify token. Reason: Expected "jwk" to be an Object')
    })
})

test('GrantManager should fail with invalid signature', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
      return manager.validateToken(grant.access_token, 'Bearer')
    })
    .catch(e => {
      t.equal(e.message, 'invalid token (public key signature)')
    })
})

test('GrantManager should return false when resource_access is undefined', (t) => {
  t.plan(1)
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content = {}
      t.false(grant.access_token.hasApplicationRole('test'))
    })
})

test('GrantManager#validateToken returns undefined for an invalid token', (t) => {
  t.plan(4)
  const expiredToken = {
    isExpired: () => true
  }
  const unsignedToken = {
    isExpired: () => false,
    signed: undefined
  }
  const notBeforeToken = {
    isExpired: () => false,
    signed: true,
    content: { iat: -1 }
  }
  const manager = getManager('./test/fixtures/auth-utils/keycloak-https.json')
  const tokens = [
    undefined,
    expiredToken,
    unsignedToken,
    notBeforeToken
  ]

  /* jshint loopfunc:true */
  for (const token of tokens) {
    manager.validateToken(token, 'Bearer')
      .catch((err) => {
        t.true(err instanceof Error, err.message)
      })
  }
})

test('GrantManager#obtainDirectly should work with https', (t) => {
  nock('https://localhost:8080')
    .post('/realms/nodejs-test/protocol/openid-connect/token', {
      client_id: 'public-client',
      username: 'test-user',
      password: 'tiger',
      grant_type: 'password',
      scope: 'openid'
    })
    .reply(204, helper.dummyReply)
  const manager = getManager('./test/fixtures/auth-utils/keycloak-https.json')
  manager.validateToken = (t) => { return Promise.resolve(t) }
  manager.ensureFreshness = (t) => { return Promise.resolve(t) }

  t.plan(1)

  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.equal(grant.access_token.token, 'Dummy access token'))
})

test('GrantManager#ensureFreshness should fetch new access token with client id ', (t) => {
  t.plan(1)

  const refreshedToken = {
    access_token: 'some.access.token',
    expires_in: 30,
    refresh_expires_in: 1800,
    refresh_token: 'i-Am-The-Refresh-Token',
    token_type: 'bearer',
    id_token: 'some-id-token',
    'not-before-policy': 1462208947,
    session_state: 'ess-sion-tat-se'
  }
  nock('http://localhost:8180')
    .post('/realms/nodejs-test-mock/protocol/openid-connect/token', {
      grant_type: 'refresh_token',
      client_id: 'public-client',
      refresh_token: 'i-Am-The-Refresh-Token'
    })
    .reply(204, refreshedToken)

  const grant = {
    isExpired: function () {
      return true
    },
    refresh_token: {
      token: 'i-Am-The-Refresh-Token',
      isExpired: () => false
    }
  }

  const manager = getManager('./test/fixtures/auth-utils/keycloak-public-mock.json')
  manager.createGrant = (t) => { return Promise.resolve(t) }

  manager.ensureFreshness(grant)
    .then((grant) => {
      t.true(grant === JSON.stringify(refreshedToken))
    })
})
