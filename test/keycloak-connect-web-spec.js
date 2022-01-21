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

const test = require('blue-tape');
const admin = require('./utils/realm');
const TestVector = require('./utils/helper').TestVector;

const page = require('./utils/webdriver').newPage;
const realmAccountPage = require('./utils/webdriver').realmAccountPage;
const driver = require('./utils/webdriver').driver;
const NodeApp = require('./fixtures/node-console/index').NodeApp;
const session = require('express-session');

const realmManager = admin.createRealm();
const app = new NodeApp();

test('setup', t => {
  return realmManager.then(() => {
    return admin.createClient(app.publicClient())
      .then((installation) => {
        return app.build(installation);
      });
  });
});

// test('setup', t => {
//   return client = realmManager.then((realm) => {
//     return admin.createClient(app.publicClient());
//   });
// });

test('Should be able to access public page', t => {
  t.plan(1);

  return page.get(app.port)
    .then(() => page.output().getText()
      .then(text => {
        t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
      })
    );
});

test('Should login with admin credentials', t => {
  t.plan(3);

  return page.get(app.port)
    .then(() => page.output().getText()
      .then(text => {
        t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
        return page.logInButton()
          .then(webElement => webElement.click())
          .then(() => page.login('test-admin', 'password'))
          .then(() => page.events().getText().then(text => {
            t.equal(text, 'Auth Success', 'User should be authenticated');

            return page.logOutButton()
              .then(webElement => webElement.click())
              .then(() => page.output().getText()
                .then(text => {
                  t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
                })
              );
          }));
      })
    );
});

test('Login should not change tokens when they are valid', t => {
  t.plan(3);

  return page.get(app.port).then(() =>
    page.logInButton().click().then(() =>
      page.login('test-admin', 'password').then(() =>
        page.events().getText().then(text => {
          t.equal(text, 'Auth Success', 'User should be authenticated');
          return page.output().getText().then(firstToken =>
            page.logInButton().click().then( // Invoke login for the second time, token shouldn't be changed
              page.output().getText().then(secondToken => {
                t.equal(secondToken, firstToken, 'Token should not be changed as first session is still valid');
                page.logOutButton().click();
                return page.output().getText().then(text => {
                  t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
                });
              })
            )
          );
        })
      )
    )
  );
});

test('SSO should work for nodejs app and testRealmAccountPage', t => {
  return page.get(app.port).then(() =>
    page.logInButton().click().then(() =>
      page.login('test-admin', 'password').then(() =>
        page.events().getText().then(text => {
          t.equal(text, 'Auth Success', 'User should be authenticated');

          return realmAccountPage.get().then(() =>
            driver.getCurrentUrl().then(currentUrl => {
              t.equal(currentUrl, realmAccountPage.getUrl(), 'Should be on account page');

              return realmAccountPage.logout().then(() =>
                driver.getCurrentUrl().then(currentUrl => {
                  t.true(currentUrl.startsWith('http://127.0.0.1:8080/auth/realms/test-realm/protocol/openid-connect/auth'), 'Should be on login page after AccountPage logout, current url: ' + currentUrl);

                  return page.get(app.port, '/login').then(() =>
                    t.true(currentUrl.startsWith('http://127.0.0.1:8080/auth/realms/test-realm/protocol/openid-connect/auth'), 'Should be on login page, current url: ' + currentUrl)
                  );
                })
              );
            })
          );
        })
      )
    )
  );
});

test('Public client should be redirected to GitHub when idpHint is provided', t => {
  t.plan(1);
  const app = new NodeApp();
  const client = admin.createClient(app.publicClient('appIdP'));

  return client.then((installation) => {
    app.build(installation, { store: new session.MemoryStore(), idpHint: 'github' });
    return page.get(app.port, '/restricted')
      .then(() =>
        page.h1().getText().then(text => {
          t.equal(text, 'Sign in to GitHub', 'Application should redirect to GitHub');
        })
      ).then(() => {
        app.destroy();
      }).catch(err => {
        app.destroy();
        throw err;
      });
  });
});

test('User should be forbidden to access restricted page', t => {
  return page.get(app.port, '/restricted').then(() =>
    page.login('alice', 'password').then(() =>
      page.body().getText().then(text => {
        t.equal(text, 'Access denied', 'Message should be access denied');
        return page.logout(app.port); // we need to wait a bit until the logout is fully completed
      })
    )
  );
});

test('Public client should be forbidden for invalid public key', t => {
  t.plan(2);
  const app = new NodeApp();
  const client = admin.createClient(app.publicClient('app2'));

  return client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);
    return page.get(app.port).then(() =>
      page.output().getText().then(text => {
        t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
        return page.logInButton().click().then(() =>
          page.login('test-admin', 'password').then(() =>
            page.body().getText().then(text => {
              t.equal(text, 'Access denied', 'Message should be access denied');
            })
          )
        );
      })
    ).then(() => {
      app.destroy();
    }).catch(err => {
      app.destroy();
      throw err;
    });
  });
});

test('Confidential client should be forbidden for invalid public key', t => {
  t.plan(3);
  const app = new NodeApp();
  const client = admin.createClient(app.confidential('app3'));

  return client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey;
    app.build(installation);
    return page.get(app.port).then(() =>
      page.output().getText().then(text => {
        t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
        return page.logInButton().click().then(() =>
          page.body().getText().then(text => {
            t.equal(text, 'Access denied', 'Message should be access denied');
          })
            .then(() => page.logout(app.port))
            .then(() => page.get(app.port, '/check-sso'))
            .then(() => page.output().getText().then(text => t.equal(text, 'Check SSO Success (Not Authenticated)', 'User should not be authenticated')))
        );
      })
    ).then(() => {
      app.destroy();
    }).catch(err => {
      app.destroy();
      throw err;
    });
  });
});

test('Should test check SSO after logging in and logging out', t => {
  t.plan(3);

  // make sure user is logged out
  page.get(app.port, '/check-sso').then(() =>
    page.output().getText().then(text => {
      t.equal(text, 'Check SSO Success (Not Authenticated)', 'User should not be authenticated');

      page.logInButton().click().then(() =>
        page.login('alice', 'password').then(() =>
          page.get(app.port, '/check-sso').then(() =>
            page.output().getText().then(text => {
              t.equal(text, 'Check SSO Success (Authenticated)', 'User should be authenticated');
              return page.logout(app.port);
            }).then(() => {
              page.get(app.port, '/check-sso').then(() =>
                page.output().getText().then(text => {
                  t.equal(text, 'Check SSO Success (Not Authenticated)', 'User should not be authenticated');
                })
              );
            })
          )
        )
      );
    })
  );
});

test('Public client should work with slash in the end of auth-server-url', t => {
  t.plan(3);
  const app = new NodeApp();
  const client = admin.createClient(app.publicClient('authServerSlashes'));

  return client.then((installation) => {
    installation['auth-server-url'] = 'http://localhost:8080/auth/';
    app.build(installation);
    return page.get(app.port)
      .then(() => page.output().getText()
        .then(text => {
          t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
          return page.logInButton()
            .then(webElement => webElement.click())
            .then(() => page.login('test-admin', 'password'))
            .then(() => page.events().getText().then(text => {
              t.equal(text, 'Auth Success', 'User should be authenticated');

              return page.logOutButton()
                .then(webElement => webElement.click())
                .then(() => page.output().getText()
                  .then(text => {
                    t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated');
                  })
                );
            }));
        })
      ).then(() => {
        app.destroy();
      }).catch(err => {
        app.destroy();
        throw err;
      });
  });
});

test('App should be able to use cookie-store', t => {
  t.plan(1);
  const app = new NodeApp();
  const client = admin.createClient(app.publicClient('appCookies'));

  return client.then((installation) => {
    app.build(installation, { cookies: true });
    return page.get(app.port, '/cookie').then(() => {
      page.login('alice', 'password').then(() => {
        driver.navigate().refresh().then(() => {
          page.events().getText().then(text => {
            t.equal(text, 'Auth Success', 'User should be authenticated');
          });
        });
      });
    }).then(() => {
      app.destroy();
    }).catch(err => {
      app.destroy();
      throw err;
    });
  });
});

test('teardown', t => {
  return realmManager.then((realm) => {
    app.destroy();
    admin.destroy('test-realm');
    page.quit();
  });
});
