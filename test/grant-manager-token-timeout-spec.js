'use strict'

const GrantManager = require('../middleware/auth-utils/grant-manager')
const Config = require('../middleware/auth-utils/config')
const test = require('tape')
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))
const getManager = (fixture) => new GrantManager(new Config(fixture))

test('GrantManager should be able to refresh token after accessTokenLifespan', (t) => {
  const manager = getManager('./test/fixtures/auth-utils/keycloak-token-test.json')
  manager.obtainDirectly('bburke@redhat.com', 'password')
    .then((grant) => {
      return manager.validateAccessToken(grant.access_token).then(firstToken => {
        t.notEqual(firstToken, false)

        return manager.ensureFreshness(grant)
          .then(grant => {
            t.equal(grant.access_token, firstToken)
            return grant
          })
          .then(delay(10000))
          .then(grant => {
            t.true(grant.access_token.isExpired())
            return grant
          })
          .then(grant => {
            return manager.ensureFreshness(grant).then(grant => {
              return manager.validateAccessToken(grant.access_token)
                .then(refreshedToken => {
                  t.notEqual(refreshedToken, false)
                  t.notEqual(refreshedToken, firstToken)
                })
            })
          })
      })
    })
    .then(t.end)
})

test('GrantManager should not be able to refresh token after ssoSessionIdleTimeout', (t) => {
  const manager = getManager('./test/fixtures/auth-utils/keycloak-token-test.json')
  manager.obtainDirectly('bburke@redhat.com', 'password')
    .then((grant) => {
      return manager.validateAccessToken(grant.access_token).then(firstToken => {
        t.notEqual(firstToken, false)
        return grant
      })
        .then(delay(15000 + 120000)) // 15 second ssoSessionIdleTimeout + 120s IDLE_TIMEOUT_WINDOW_SECONDS from https://github.com/keycloak/keycloak/blob/master/server-spi-private/src/main/java/org/keycloak/models/utils/SessionTimeoutHelper.java
        .then(grant => manager.ensureFreshness(grant))
        .catch((e) => {
          t.equal(e.message, 'Unable to refresh with expired refresh token')
        })
    })
    .then(t.end)
})
