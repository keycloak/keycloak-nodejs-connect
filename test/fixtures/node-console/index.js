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

var Keycloak = require('../../../index');
var hogan = require('hogan-express');
var express = require('express');
var session = require('express-session');
var parse = require('../../utils/helper').parse;

function NodeApp (realm, file) {
  this.kcConfig = parse('test/fixtures/public-client-template.json', realm);
}

NodeApp.prototype.start = function start () {
  var app = express();
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
  }, this.kcConfig);

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

  var server = app.listen(0, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
  });

  return server;
};

function output (res, output, eventMessage) {
  res.render('index', {
    result: output,
    event: eventMessage
  });
}

// Uncomment this if you want to run the app manually
// start('../../fixtures/public-client-wrong-realm-key.json');

module.exports = {
  NodeApp: NodeApp
};
