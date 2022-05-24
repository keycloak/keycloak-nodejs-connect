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

const Keycloak = require('../../../')
const bodyParser = require('body-parser')
const hogan = require('hogan-express')
const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const enableDestroy = require('server-destroy')
const parseClient = require('../../utils/helper').parseClient

Keycloak.prototype.redirectToLogin = function (req) {
  const apiMatcher = /^\/service\/.*/i
  return !apiMatcher.test(req.baseUrl)
}

Keycloak.prototype.obtainDirectly = function (user, pass) {
  return this.grantManager.obtainDirectly(user, pass)
}

function NodeApp () {
  const app = express()
  app.use(cookieParser())
  const server = app.listen(0)
  enableDestroy(server)
  this.close = function () {
    server.close()
  }
  this.destroy = function () {
    server.destroy()
  }
  this.port = server.address().port
  this.address = 'http://127.0.0.1:' + this.port

  console.log('Testing app listening at http://localhost:%s', this.port)

  this.publicClient = function (app) {
    const name = app || 'public-app'
    return parseClient('test/fixtures/templates/public-template.json', this.port, name)
  }

  this.bearerOnly = function (app) {
    const name = app || 'bearer-app'
    return parseClient('test/fixtures/templates/bearerOnly-template.json', this.port, name)
  }

  this.confidential = function (app) {
    const name = app || 'confidential-app'
    return parseClient('test/fixtures/templates/confidential-template.json', this.port, name)
  }

  this.enforcerResourceServer = function (app) {
    const name = app || 'resource-server-app'
    return parseClient('test/fixtures/templates/resource-server-template.json', this.port, name)
  }

  this.build = function (kcConfig, params) {
    app.set('view engine', 'html')
    app.set('views', require('path').join(__dirname, '/views'))
    app.engine('html', hogan)

    // Create a session-store to be used by both the express-session
    // middleware and the keycloak middleware.

    const memoryStore = new session.MemoryStore()

    app.use(session({
      secret: 'mySecret',
      resave: false,
      saveUninitialized: true,
      store: memoryStore
    }))

    // Provide the session store to the Keycloak so that sessions
    // can be invalidated from the Keycloak console callback.
    //
    // Additional configuration is read from keycloak.json file
    // installed from the Keycloak web console.
    params = params || { store: memoryStore }
    const keycloak = new Keycloak(params, kcConfig)

    // A normal un-protected public URL.
    app.get('/', function (req, res) {
      const authenticated = 'Init Success (' + (req.session['keycloak-token'] ? 'Authenticated' : 'Not Authenticated') + ')'
      output(res, authenticated)
    })

    // Install the Keycloak middleware.
    //
    // Specifies that the user-accessible application URL to
    // logout should be mounted at /logout
    //
    // Specifies that Keycloak console callbacks should target the
    // root URL.  Various permutations, such as /k_logout will ultimately
    // be appended to the admin URL.

    app.use(keycloak.middleware({
      logout: '/logout',
      admin: '/'
    }))

    app.get('/login', keycloak.protect(), function (req, res) {
      output(res, JSON.stringify(JSON.parse(req.session['keycloak-token']), null, 4), 'Auth Success')
    })

    app.get('/check-sso', keycloak.checkSso(), function (req, res) {
      const authenticated = 'Check SSO Success (' + (req.session['keycloak-token'] ? 'Authenticated' : 'Not Authenticated') + ')'
      output(res, authenticated)
    })

    app.get('/restricted', keycloak.protect('realm:admin'), function (req, res) {
      const user = req.kauth.grant.access_token.content.preferred_username
      output(res, user, 'Restricted access')
    })

    app.get('/cookie', keycloak.protect(), function (req, res) {
      const authenticated = req.cookies['keycloak-token'] ? 'Auth Success' : 'Auth Failed'
      output(res, JSON.stringify(JSON.parse(req.cookies['keycloak-token']), null, 4), authenticated)
    })

    app.get('/service/public', function (req, res) {
      res.json({ message: 'public' })
    })

    app.get('/service/secured', keycloak.protect('realm:user'), function (req, res) {
      res.json({ message: 'secured' })
    })

    app.get('/service/admin', keycloak.protect('realm:admin'), function (req, res) {
      res.json({ message: 'admin' })
    })

    app.get('/service/grant', keycloak.protect(), (req, res, next) => {
      keycloak.getGrant(req, res)
        .then(grant => {
          res.json(grant)
        })
        .catch(next)
    })

    app.post('/service/grant', bodyParser.json(), (req, res, next) => {
      if (!req.body.username || !req.body.password) {
        res.status(400).send('Username and password required')
      }
      keycloak.obtainDirectly(req.body.username, req.body.password)
        .then(grant => {
          keycloak.storeGrant(grant, req, res)
          res.json(grant)
        })
        .catch(next)
    })

    app.get('/protected/enforcer/resource', keycloak.enforcer('resource:view'), function (req, res) {
      res.json({ message: 'resource:view', permissions: req.permissions })
    })

    app.post('/protected/enforcer/resource', keycloak.enforcer('resource:update'), function (req, res) {
      res.json({ message: 'resource:update', permissions: req.permissions })
    })

    app.delete('/protected/enforcer/resource', keycloak.enforcer('resource:delete'), function (req, res) {
      res.json({ message: 'resource:delete', permissions: req.permissions })
    })

    app.get('/protected/enforcer/resource-view-delete', keycloak.enforcer(['resource:view', 'resource:delete']), function (req, res) {
      res.json({ message: 'resource:delete', permissions: req.permissions })
    })

    app.get('/protected/enforcer/resource-claims', keycloak.enforcer(['photo'], {
      claims: function (request) {
        return {
          user_agent: [request.query.user_agent]
        }
      }
    }), function (req, res) {
      res.json({ message: req.query.user_agent, permissions: req.permissions })
    })

    app.get('/protected/enforcer/no-permission-defined', keycloak.enforcer(), function (req, res) {
      res.json({ message: 'always grant', permissions: req.permissions })
    })

    app.get('/protected/web/resource', keycloak.enforcer(['resource:view']), function (req, res) {
      const user = req.kauth.grant.access_token.content.preferred_username
      output(res, user, 'Granted')
    })

    app.use('*', function (req, res) {
      res.send('Not found!')
    })
  }
}

function output (res, output, eventMessage, page) {
  page = page || 'index'
  res.render(page, {
    result: output,
    event: eventMessage
  })
}

module.exports = {
  NodeApp
}
