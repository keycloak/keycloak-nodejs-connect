'use strict';

const GrantManager = require('../middleware/auth-utils/grant-manager');
const Config = require('../middleware/auth-utils/config');
const t = require('tap');
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

t.setTimeout(360000); // Change timeout from 30 sec to 360 sec

t.test('GrantManager should be able to refresh token after accessTokenLifespan', (t) => {
  t.comment(`START TESTING FILE : ${__filename}`);
  t.plan(5);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-token-test.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('bburke@redhat.com', 'password')
    .then((grant) => {
      return manager.validateAccessToken(grant.access_token)
      .then(firstToken => {
        t.not(firstToken, false, 'Ensure manager.validateAccessToken token is not empty'); // test #1 

        return manager.ensureFreshness(grant)
          .then(grant => {
            t.equal(grant.access_token, firstToken, 'Check manager.ensureFreshness access token is the same as the first token'); // test #2
            //console.log('Delay 10 seconds, please wait for delay to complete.');
            t.comment('Delay 10 seconds, please wait for delay to complete.');
            return grant;
          })
          .then(delay(10000))
          .then(grant => {
            t.ok(grant.access_token.isExpired(), 'Check access token has expired due to delay');  // test #3 
            return grant;
          })
          .then(grant => {
            return manager.ensureFreshness(grant)
              .then(grant => {
                return manager.validateAccessToken(grant.access_token)
                  .then(refreshedToken => {
                    t.not(refreshedToken, false, 'Check refreshed token is not empty');                      // test #4
                    t.not(refreshedToken, firstToken, 'Check original and refreshed token are different');   // test #5
                  });
              });
          });
      });
    })
    .catch((e) => {
      t.fail(e.message);
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager should not be able to refresh token after ssoSessionIdleTimeout', (t) => {
  t.plan(2);

  t.setTimeout(360000); // Change timeout from 30 sec to 360 sec

  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-token-test.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('bburke@redhat.com', 'password')
    .then((grant) => {
      return manager.validateAccessToken(grant.access_token)
      .then(firstToken => {
        t.not(firstToken, false, 'Ensure manager.validateAccessToken token is not empty'); // test #1
        console.log('Delay 135 seconds (2 minutes 15 seconds), please wait for delay to complete.');
        t.comment('Delay 135 seconds (2 minutes 15 seconds), please wait for delay to complete.');
        return grant;
      })
      .then( 
        // 15 second ssoSessionIdleTimeout + 120s IDLE_TIMEOUT_WINDOW_SECONDS from
        //  https://github.com/keycloak/keycloak/blob/master/server-spi-private/src/main/java/org/keycloak/models/utils/SessionTimeoutHelper.java
        delay(135000)
      )
      .then( () => {
        return manager.ensureFreshness(grant);
      })
      .catch((e) => {
        t.equal(e.message, 'Unable to refresh with expired refresh token', 'Check manager.ensureFreshness times out due to waiting before calling manager.ensureFreshness'); // test #2
      });
    })
    .catch((e) => {
      t.fail(e.message);
    })
    .finally( () => {
      t.end();
    })
});
