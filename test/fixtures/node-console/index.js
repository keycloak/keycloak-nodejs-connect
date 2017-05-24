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

const Keycloak = require('../../../index');
const hogan = require('hogan-express');
const express = require('express');
const session = require('express-session');
const enableDestroy = require('server-destroy');
const parseClient = require('../../utils/helper').parseClient;

function NodeApp () {
  var app = express();
  var server = app.listen(0);
  enableDestroy(server);
  this.close = function () {
    server.close();
  };
  this.destroy = function () {
    server.destroy();
  };
  this.port = server.address().port;
  this.address = 'http://127.0.0.1:' + this.port;

  console.log('Testing app listening at http://localhost:%s', this.port);

  this.publicClient = function (app) {
    var name = app || 'public-app';
    return parseClient('test/fixtures/templates/public-template.json', this.port, name);
  };

  this.bearerOnly = function (app) {
    var name = app || 'bearer-app';
    return parseClient('test/fixtures/templates/bearerOnly-template.json', this.port, name);
  };

  this.confidential = function (app) {
    var name = app || 'confidential-app';
    return parseClient('test/fixtures/templates/confidential-template.json', this.port, name);
  };

  this.build = function (kcConfig) {
    app.set('view engine', 'html');
    app.set('views', require('path').join(__dirname, '/views'));
    app.engine('html', hogan);

    // Create a session-store to be used by both the express-session
    // middleware and the keycloak middleware.

    var memoryStore = new session.MemoryStore();

    app.use(session({
      secret: 'mySecret',
      resave: false,
      saveUninitialized: true,
      store: memoryStore
    }));

    // Provide the session store to the Keycloak so that sessions
    // can be invalidated from the Keycloak console callback.
    //
    // Additional configuration is read from keycloak.json file
    // installed from the Keycloak web console.
    var keycloak = new Keycloak({
      store: memoryStore
    }, kcConfig);

    // A normal un-protected public URL.
    app.get('/', function (req, res) {
      var authenticated = 'Init Success (' + (req.session['keycloak-token'] ? 'Authenticated' : 'Not Authenticated') + ')';
      output(res, authenticated);
    });

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
    }));

    app.get('/login', keycloak.protect(), function (req, res) {
      output(res, JSON.stringify(JSON.parse(req.session['keycloak-token']), null, 4), 'Auth Success');
    });

    app.get('/restricted', keycloak.protect('realm:admin'), function (req, res) {
      var user = req.kauth.grant.access_token.content.preferred_username;
      output(res, user, 'Restricted access');
    });

    app.get('/service/public', function (req, res) {
      res.json({message: 'public'});
    });

    app.get('/service/secured', keycloak.protect('realm:user'), function (req, res) {
      res.json({message: 'secured'});
    });

    app.get('/service/admin', keycloak.protect('realm:admin'), function (req, res) {
      res.json({message: 'admin'});
    });

    app.use('*', function (req, res) {
      res.send('Not found!');
    });
  };
}

function output (res, output, eventMessage, page) {
  page = page || 'index';
  res.render(page, {
    result: output,
    event: eventMessage
  });
}

module.exports = {
  NodeApp: NodeApp
};
