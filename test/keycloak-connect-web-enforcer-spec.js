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

const test = require('blue-tape')
const admin = require('./utils/realm')

const page = require('./utils/webdriver').newPage
const NodeApp = require('./fixtures/node-console/index').NodeApp

const realmManager = admin.createRealm()
const app = new NodeApp()

test('setup', t => {
  return realmManager.then(() => {
    return admin.createClient(app.enforcerResourceServer())
      .then((installation) => {
        return app.build(installation)
      })
  })
})

test('Should be able to access resource protected by the policy enforcer', t => {
  t.plan(3)

  page.get(app.port)

  return page.output().getText().then(text => {
    t.equal(text, 'Init Success (Not Authenticated)', 'User should not be authenticated')
    page.logInButton().click()
    page.login('test-admin', 'password')

    return page.events().getText().then(text => {
      t.equal(text, 'Auth Success', 'User should be authenticated')
      page.grantedResourceButton().click()
      return page.events().getText().then(text => {
        t.equal(text, 'Granted', 'User can access resource protected by the policy enforcer')
      })
    })
  })
})

test('teardown', t => {
  return realmManager.then((realm) => {
    app.destroy()
    admin.destroy('test-realm')
    page.quit()
  })
})
