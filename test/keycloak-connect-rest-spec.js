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
'use strict'

const admin = require('./utils/realm')
const TestVector = require('./utils/helper').TestVector
const NodeApp = require('./fixtures/node-console/index').NodeApp

const test = require('blue-tape')
const axios = require('axios')
const getToken = require('./utils/token')

const realmName = 'service-node-realm'
const realmManager = admin.createRealm(realmName)
const app = new NodeApp()

test('setup', t => {
  return realmManager.then(() => {
    return admin.createClient(app.bearerOnly(), realmName)
      .then((installation) => {
        return app.build(installation)
      })
  })
})

test('Should test unprotected route.', t => {
  t.plan(1)
  const opt = {
    method: 'get',
    url: `${app.address}/service/public`
  }
  return axios(opt)
    .then(response => {
      t.equal(response.data.message, 'public')
    })
    .catch(error => {
      t.fail(error.response.data)
    })
})

test('Should test protected route.', t => {
  t.plan(1)
  const opt = {
    method: 'get',
    url: `${app.address}/service/admin`
  }
  return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for no credentials')
})

test('Should test for bad request on k_logout without any parameters.', t => {
  t.plan(1)
  const opt = {
    method: 'get',
    url: `${app.address}/k_logout`
  }
  return t.shouldFail(axios(opt), 'Response should be bad request')
})

test('Should test protected route with admin credentials.', t => {
  t.plan(1)
  return getToken().then((token) => {
    const opt = {
      method: 'get',
      url: `${app.address}/service/admin`,
      headers: { Authorization: `Bearer ${token}` }
    }
    return axios(opt)
      .then(response => {
        t.equal(response.data.message, 'admin')
      })
      .catch(error => {
        t.fail(error.response.data)
      })
  })
})

test('Should test protected route with invalid access token.', t => {
  t.plan(1)
  return getToken().then((token) => {
    const opt = {
      method: 'get',
      url: `${app.address}/service/admin`,
      headers: {
        Authorization: 'Bearer ' + token.replace(/(.+?\..+?\.).*/, '$1.Invalid')
      }
    }
    return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for invalid access token')
  })
})

test('Access should be denied for bearer client with invalid public key.', t => {
  t.plan(1)

  const someApp = new NodeApp()
  const client = admin.createClient(app.bearerOnly('wrongkey-app'), realmName)

  return client.then((installation) => {
    installation['realm-public-key'] = TestVector.wrongRealmPublicKey
    someApp.build(installation)

    return getToken().then((token) => {
      const opt = {
        method: 'get',
        url: `${someApp.address}/service/admin`,
        headers: {
          Authorization: 'Bearer ' + token
        }
      }

      return t.shouldFail(axios(opt), 'Access denied', 'Response should be access denied for invalid public key')
    })
  }).then(() => {
    someApp.destroy()
  })
    .catch(err => {
      someApp.destroy()
      throw err
    })
})

test('Should test protected route after push revocation.', t => {
  t.plan(2)

  const app = new NodeApp()
  const client = admin.createClient(app.bearerOnly('revokeapp'), realmName)

  return client.then((installation) => {
    app.build(installation)

    return getToken().then((token) => {
      const opt = {
        method: 'get',
        url: `${app.address}/service/admin`,
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json'
        }
      }
      return axios(opt)
        .then(response => {
          t.equal(response.data.message, 'admin')

          opt.url = `${app.address}/admin/realms/${realmName}/push-revocation`
          opt.method = 'post'
          axios(opt)
          opt.url = `${app.address}/service/admin`

          return axios(opt)
            .then(response => {
              t.equal(response.data, 'Not found!')
            })
            .catch(error => {
              t.fail(error.response.data)
            })
        })
    })
  }).then(() => {
    app.destroy()
  })
    .catch(err => {
      app.destroy()
      throw err
    })
})

test('Should invoke admin logout.', t => {
  t.plan(2)

  const app = new NodeApp()
  const client = admin.createClient(app.bearerOnly('anotherapp'), realmName)

  return client.then((installation) => {
    app.build(installation)

    return getToken().then((token) => {
      const opt = {
        method: 'get',
        url: `${app.address}/service/admin`,
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json'
        }
      }
      return axios(opt)
        .then(response => {
          t.equal(response.data.message, 'admin')

          opt.url = `${app.address}/admin/realms/${realmName}/logout-all`
          opt.method = 'post'
          axios(opt)
          opt.url = `${app.address}/service/admin`

          return axios(opt)
            .then(response => {
              t.equal(response.data, 'Not found!')
            })
            .catch(error => {
              t.fail(error.response.data)
            })
        })
    })
  }).then(() => {
    app.destroy()
  })
    .catch(err => {
      app.destroy()
      throw err
    })
})

test('teardown', t => {
  return realmManager.then((realm) => {
    app.destroy()
    admin.destroy(realmName)
  })
})
