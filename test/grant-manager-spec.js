'use strict';

const GrantManager = require('../middleware/auth-utils/grant-manager');
const Config = require('../middleware/auth-utils/config');
const t = require('tap');
const nock = require('nock');
const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const helper = require('./utils/helper');

t.test('GrantManager with empty configuration', (t) => {
  t.comment(`START TESTING FILE : ${__filename}`);
  t.throws(function () {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let manager = new GrantManager(undefined); 
  }, Error, 'Expect Config to throw error as the fixture does NOT exist!');
  t.end();
});

t.test('GrantManager with rogue configuration', (t) => {
  t.plan(4);
  const rogueManager = new GrantManager({});
  t.equal(rogueManager.access_token, undefined);
  t.equal(rogueManager.client_id, undefined);
  t.equal(rogueManager.publicKey, undefined);
  t.equal(rogueManager.secret, undefined);
  t.end();
});

t.test('GrantManager in public mode should be able to obtain a grant', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.not(grant.access_token, undefined, 'Check for undefined grant.');
    })
    .catch(err => {
      t.fail(err, "Enexpected error thrown");
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should be able to obtain a raw grant', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.not(grant.toString(), undefined, 'Check for undefined grant.');
    })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode with public key configured should be able to obtain a grant', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-with-public-key.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.not(grant.access_token, undefined))
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (expired)');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should be able to refresh a grant', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-with-public-key.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => t.ok(manager.isGrantRefreshable(grant)))
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager should return empty with public key configured but invalid signature', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-with-public-key.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
//      grant.access_token.content.exp = grant.access_token.content.exp + 180*1000; // Add 180 seconds to timeout for debugging purposes
      return manager.validateToken(grant.access_token, 'Bearer');
    })
    .then((token) => {
      t.not(token, undefined, 'Check for validateToken response.');
    })
    .catch((e) => {
      t.equal(e.message, 'invalid token (signature)');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should be able to get userinfo', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => manager.userInfo(grant.access_token))
    .then((user) => t.equal(user.preferred_username, 'test-user'))
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should fail if audience of ID token is not valid', (t) => {
  t.plan(1);

  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = [];
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should fail if audience of ID token is not valid with a dummy client in single array', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = ['public-client-dummy'];
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should fail if audience of ID token is not valid with a dummy client in strings', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = 'public-client-dummy';
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should fail if authorized party for ID token is not valid', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.azp = [];
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (authorized party should match client id)');
    })
    .finally( () => {
      t.end();
    })
});

t.test('GrantManager in public mode should fail if audience of Access token is not valid', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.aud = [];
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
    })
    .finally( () => {
      t.end();
    })
});


t.test('GrantManager in confidential mode should fail if audience of ID token is not valid with a dummy client in strings', (t) => {
  t.plan(1);
  
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = 'confidential-client-dummy';
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
    })
       .finally( () => {
      t.end();
    })
});

t.test('GrantManager in confidential mode should fail if audience of ID token is not valid with a dummy client in single array', (t) => {
  t.plan(1);
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
  const manager = new GrantManager(fixtureConfig);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.id_token.content.aud = ['confidential-client-dummy'];
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
    })
       .finally( () => {
      t.end();
    })
});

t.test('GrantManager using keycloak-confidential.json fixture', (t) => {
  const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-confidential.json');
  const manager = new GrantManager(fixtureConfig);

  t.test('GrantManager in confidential mode should be able to get userinfo', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        return manager.userInfo(grant.access_token);
      })
      .then((user) => {
        t.equal(user.preferred_username, 'test-user')
      })
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to obtain a grant', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => t.not(grant.access_token, undefined))
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to refresh a grant', (t) => {
    t.plan(4);
    let originalAccessToken;
    manager.obtainDirectly('test-user', 'tiger')
      .then(delay(3000))
      .then((grant) => {
        t.not(grant.access_token, undefined);
        t.ok(manager.isGrantRefreshable(grant));
        originalAccessToken = grant.access_token;
        return grant;
      })
      .then((grant) => {
        return manager.ensureFreshness(grant)
      })
      .then((grant) => {
        t.not(grant.access_token, undefined);
        t.not(grant.access_token.token, originalAccessToken.token);
      })
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to validate a valid token', (t) => {
    t.plan(2);
    let originalAccessToken;
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        originalAccessToken = grant.access_token;
        return manager.validateAccessToken(grant.access_token);
      })
      .then((token) => {
        t.not(token, undefined);
        t.equal(token, originalAccessToken);
      })
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to validate an invalid token', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then(delay(3000))
      .then((grant) => manager.validateAccessToken(grant.access_token))
      .then((result) => t.equal(result, false))
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to validate a token has an invalid signature', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.token = grant.access_token.token.replace(/(.+?\..+?\.).*/, '$1.InvalidSignatureIsHereAgain');
        return manager.validateAccessToken(grant.access_token);
      })
      .then((result) => t.equal(result, false))
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to validate a valid token string', (t) => {
    t.plan(2);
    let originalAccessToken;
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        originalAccessToken = grant.access_token.token;
        return manager.validateAccessToken(grant.access_token.token);
      })
      .then((token) => {
        t.not(token, undefined);
        t.equal(token, originalAccessToken);
      })
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to validate an invalid token string', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then(delay(3000))
      .then((grant) => {
        return manager.validateAccessToken(grant.access_token.token);
      })
      .then((result) => t.equal(result, false))
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should be able to obtain a service account grant', (t) => {
    t.plan(1);
    manager.obtainFromClientCredentials()
      .then(delay(3000))
      .then((grant) => {
        return manager.validateAccessToken(grant.access_token.token);
      })
      .then((result) => t.equal(result, false))
      .catch((e) => {
        debugger;
        t.equal(e.message, 'Unexpected error thrown');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should fail if audience of ID token is not valid', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.id_token.content.aud = [];
        return manager.validateGrant(grant);
      })
      .then((grant) => {
        t.equal(grant, undefined);
      })
      .catch((e) => {
        t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
      })
      .finally( () => {
      t.end();
    })
    });

  t.test('GrantManager in confidential mode should fail if authorized party for ID token is not valid', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.id_token.content.azp = [];
        return manager.validateGrant(grant);
      })
      .then((grant) => {
        t.equal(grant, undefined);
      })
      .catch((e) => {
        t.equal(e.message, 'Grant validation failed. Reason: invalid token (authorized party should match client id)');
      })
    .finally( () => {
      t.end();
    })
  });

t.test('GrantManager in confidential mode should fail if audience of Access token is not valid', (t) => {
  t.plan(1);
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.content.aud = [];
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong audience)');
    })
       .finally( () => {
      t.end();
    })
});

t.test('GrantManager should be able to validate tokens in a grant', (t) => {
  t.plan(4);
  let originalAccessToken, originalRefreshToken, orginalIdToken;
  manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      originalAccessToken = grant.access_token;
      originalRefreshToken = grant.refresh_token;
      orginalIdToken = grant.id_token;
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.not(grant.access_token, undefined);
      t.equal(grant.access_token, originalAccessToken);
      t.equal(grant.refresh_token, originalRefreshToken);
      t.equal(grant.id_token, orginalIdToken);
    })
   .catch((e) => {
     debugger;
     t.equal(e.message, 'Unexpected error thrown');
   })
       .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should be able to remove invalid tokens from a grant', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      grant.access_token.signature = Buffer.from('this signature is invalid');
      grant.refresh_token.signature = Buffer.from('this signature is also invalid');
      grant.id_token.signature = Buffer.from('this signature is still invalid');
      return manager.validateGrant(grant);
    })
    .then((grant) => {
      t.equal(grant, undefined);
    })
    .catch((e) => {
      t.equal(e.message, 'Grant validation failed. Reason: invalid token (public key signature)');
    })
       .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should reject with token missing error when bearer only', (t) => {
    t.plan(1);
    const originalBearerOnly = manager.bearerOnly;
    manager.bearerOnly = true;
    manager.createGrant('{ }')
      .then((grant) => {
        t.equal(grant, undefined);
      })
      .then(() => {
        manager.bearerOnly = originalBearerOnly;
      })
      .catch((e) => {
        t.equal(e.message, 'Grant validation failed. Reason: invalid token (missing)');
      })
      .finally( () => {
      t.end();
    })
  })

  t.test('GrantManager should not be able to refresh a grant when bearer only', (t) => {
    t.plan(1);
    const originalBearerOnly = manager.bearerOnly;
    manager.bearerOnly = true;

    try {
      t.notOk(manager.isGrantRefreshable({ 'refresh_token': 'a_refresh_token' }));
    } finally {
      manager.bearerOnly = originalBearerOnly;
      t.end();
    }
  });

  t.test('GrantManager should reject with refresh token missing error', (t) => {
      t.plan(1);
      manager.ensureFreshness({ isExpired: () => true })
      .then((grant) => {
        t.equal(grant, undefined);
      })
      .catch((e) => {
        t.equal(e.message, 'Unable to refresh without a refresh token');
      })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager validate empty access token', (t) => {
    t.plan(1);
    manager.validateAccessToken('')
      .then((result) => {
        t.equal(result, false);
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager return user realm role', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        t.ok(grant.access_token.hasRealmRole('user'));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager validate non existent role', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        t.notOk(grant.access_token.hasRealmRole(''));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should be false for user with no realm level roles', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.content.realm_access = {};
        t.notOk(grant.access_token.hasRealmRole('test'));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager validate non existent role app', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        t.notOk(grant.access_token.hasRole(''));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager validate existent role app', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        t.ok(grant.access_token.hasRole('test'));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager validate role app with empty clientId', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.clientId = '';
        t.notOk(grant.access_token.hasRole('test'));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager validate empty role app', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        t.notOk(grant.access_token.hasApplicationRole('', ''));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager return user realm role based on realm name', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        t.ok(grant.access_token.hasRole('realm:user'));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager in confidential mode should use callback if provided and validate access token', (t) => {
    t.plan(1);
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

  t.test('GrantManager should be able to remove expired access_token token and keep others', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.content.exp = 0;
        return manager.validateGrant(grant);
      })
      .then((grant) => {
        t.equal(grant, undefined);
      })
      .catch((e) => {
        t.equal(e.message, 'Grant validation failed. Reason: invalid token (expired)');
      })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should return empty when trying to obtain from code with empty params', (t) => {
    t.plan(1);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manager.obtainFromCode('', '', '', '', function () {})
      .then((result) => {
        t.equal(result, undefined);
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should raise an error when trying to obtain from code with rogue params', (t) => {
    t.plan(1);
    manager.obtainFromCode('', '', '', '', {})
      .catch((e) => {
        t.equal(e.message, '400 : Bad Request');
      })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should be able to validate invalid ISS', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.content.iss = 'http://wrongiss.com';
        return manager.validateGrant(grant);
      })
      .catch((e) => {
        t.equal(e.message, 'Grant validation failed. Reason: invalid token (wrong ISS)');
      })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should be able to validate invalid iat', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.content.iat = -5;
        return manager.validateGrant(grant);
      })
      .catch((e) => {
        t.equal(e.message, 'Grant validation failed. Reason: invalid token (stale token)');
      })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should be ensure that a grant is fresh', (t) => {
    t.plan(1);
    let originalGrant;
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        originalGrant = Object.assign({}, grant);
        return manager.ensureFreshness(grant);
      })
      .then((result) => {
        t.not(result, originalGrant);
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should raise an error when access token and refresh token do not exist', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token = undefined;
        grant.refresh_token = undefined;
        return manager.ensureFreshness(grant);
      })
      .catch(e => {
        t.equal(e.message, 'Unable to refresh without a refresh token');
      })
      .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should validate unsigned token', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.signed = false;
        return manager.validateToken(grant.access_token, 'Bearer');
      })
      .catch(e => {
        t.equal(e.message, 'invalid token (not signed)');
      })
      .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should not validate token with wrong type', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        return manager.validateToken(grant.access_token, 'Refresh');
      })
      .catch(e => {
        t.equal(e.message, 'invalid token (wrong type)');
      })
      .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should fail to load public key when kid is empty', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.header.kid = {};
        return manager.validateToken(grant.access_token, 'Bearer');
      })
      .catch(e => {
        t.equal(e.message, 'failed to load public key to verify token. Reason: Expected "jwk" to be an Object');
      })
      .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should fail with invalid signature', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.signature = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
        return manager.validateToken(grant.access_token, 'Bearer');
      })
      .catch(e => {
        t.equal(e.message, 'invalid token (public key signature)');
      })
      .finally( () => {
      t.end();
    })
  });

  t.test('GrantManager should return false when resource_access is undefined', (t) => {
    t.plan(1);
    manager.obtainDirectly('test-user', 'tiger')
      .then((grant) => {
        grant.access_token.content = {};
        t.notOk(grant.access_token.hasApplicationRole('test'));
      })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
  });


  t.end()  
});

t.test('GrantManager#validateToken returns error for invalid tokens', async (t) => {
  t.plan(6);

  const fixtureConfig = await new Config('./test/fixtures/auth-utils/keycloak-https.json');
  const manager = await new GrantManager(fixtureConfig);

  const badKIDToken = {
    isExpired: () => false,
    signed: true,
    content: {
            typ: 'Bearer',
            iat: 1,
            iss: manager.realmUrl
    },
    header: {
      "kid" : [ "11111111-2222-3333-4444-555555555555" ],
    }
  };

  const expiredToken = {
    isExpired: () => true,         // BAD item
    signed: true,
    content: {
            typ: 'Bearer',
            iat: 1,
            iss: manager.realmUrl
    }
  };

  const unsignedToken = {
    isExpired: () => false,
    signed: undefined,         // BAD item
    content: {
      typ: 'Bearer',
      iat: 1,
      iss: manager.realmUrl
    }
  };

  const staleToken = {
    isExpired: () => false,
    signed: true,
    content: {
      typ: 'Bearer',
      iat: -1,                   // BAD item
      iss: manager.realmUrl
    }
  };

  const wrongISSToken = {
    isExpired: () => false,
    signed: true,
    content: {
      typ: 'Bearer',
      iat: 1,
      iss: 'BAD'                   // BAD item
    }
  };

  const tokens = [
    { name:'undefined',  token: undefined },
    { name:'badKIDToken',  token: badKIDToken },
    { name:'expiredToken',  token: expiredToken },
    { name:'unsignedToken',  token: unsignedToken },
    { name:'staleToken',  token: staleToken },
    { name:'wrongISSToken',  token: wrongISSToken },
  ];

  for (var tokenID in tokens) {
    await manager.validateToken(tokens[tokenID].token, 'Bearer')
    .then(() => {
      t.fail('validateToken did not throw an error!');
    })
    .catch((err) => {
      t.ok(err instanceof Error, `${tokens[tokenID].name} - ${err.message}`);
    });
  } 
  t.end();
});

t.test('GrantManager#obtainDirectly should work with https', async (t) => {
  t.plan(1);
  nock('https://localhost:8080')
    .post('/auth/realms/nodejs-test/protocol/openid-connect/token', {
      client_id: 'public-client',
      username: 'test-user',
      password: 'tiger',
      grant_type: 'password',
      scope: 'openid'
    })
    .reply(204, helper.dummyReply);

  const fixtureConfig = await new Config('./test/fixtures/auth-utils/keycloak-https.json');
  const manager = await new GrantManager(fixtureConfig);

  manager.validateToken = (t) => { return Promise.resolve(t); };
  manager.ensureFreshness = (t) => { return Promise.resolve(t); };

  return manager.obtainDirectly('test-user', 'tiger')
    .then((grant) => {
      t.equal(grant.access_token.token, 'Dummy access token');
    })
    .catch((e) => {
      debugger;
      t.equal(e.message, 'Unexpected error thrown');
    })
    .finally( () => {
      t.end();
    })
});

// test.skip('GrantManager#ensureFreshness should fetch new access token with client id ', (t) => {
//   t.plan(1);
//   const refreshedToken = {
//     'access_token': 'some.access.token',
//     'expires_in': 300,
//     // 'refresh_expires_in': 1800,
//     'refresh_token': 'i-Am-The-Refresh-Token',
//     'token_type': 'bearer',
//     'id_token': 'some-id-token',
//     //'not-before-policy': 1462208947,
//     'session_state': 'ess-sion-tat-se'
//   };
//   nock('http://localhost:8080')
//     .post('/auth/realms/nodejs-test/protocol/openid-connect/token', {
//       grant_type: 'refresh_token',
//       client_id: 'public-client',
//       refresh_token: 'i-Am-The-Refresh-Token'
//     })
//     .reply(204, refreshedToken);

//   const grant = {
//     isExpired: () => {
//       return true;
//     },
//     refresh_token: {
//       token: 'i-Am-The-Refresh-Token',
//       isExpired: () => {
//        return false;
//       }
//     }
//   };

//   const fixtureConfig = new Config('./test/fixtures/auth-utils/keycloak-public.json');
//   const manager = new GrantManager(fixtureConfig);
//   return manager.ensureFreshness(grant)
//     .then((grant) => {
//       t.ok(grant === JSON.stringify(refreshedToken));
//     })
//     .catch((e) => {
//       debugger;
//       t.equal(e.message, 'Unexpected error thrown');
//     })
//     .finally( () => {
//       t.end();
//     })
// });
