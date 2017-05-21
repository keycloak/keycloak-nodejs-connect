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
const Keycloak = require('../../../index');
const hogan = require('hogan-express');
const express = require('express');
const session = require('express-session');

function NodeApp () {
  this.app = express();
  var server = this.app.listen(0);
  this.close = function () {
    server.close();
  };
  this.port = server.address().port;

  console.log('Example app listening at http://localhost:%s', this.port);
}

NodeApp.prototype.build = function build (kcConfig) {
  this.app.set('view engine', 'html');
  this.app.set('views', require('path').join(__dirname, '/views'));
  this.app.engine('html', hogan);

  // Create a session-store to be used by both the express-session
  // middleware and the keycloak middleware.

  var memoryStore = new session.MemoryStore();

  this.app.use(session({
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
  this.app.get('/', function (req, res) {
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

  this.app.use(keycloak.middleware({
    logout: '/logout',
    admin: '/'
  }));

  this.app.get('/login', keycloak.protect(), function (req, res) {
    output(res, JSON.stringify(JSON.parse(req.session['keycloak-token']), null, 4), 'Auth Success');
  });

  this.app.get('/restricted', keycloak.protect('realm:admin'), function (req, res) {
    var user = req.kauth.grant.access_token.content.preferred_username;
    output(res, user, 'Restricted access');
  });

  this.app.use('*', function (req, res) {
    res.send('Not found!');
  });
};

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
