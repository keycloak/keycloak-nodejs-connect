'use strict';

const Keycloak = require('../../../');
const bodyParser = require('body-parser');
const restify = require('restify');
const cookieParser = require('cookie-parser');
const enableDestroy = require('server-destroy');
const parseClient = require('../../utils/helper').parseClient;

Keycloak.prototype.redirectToLogin = function (req) {
  var apiMatcher = /^\/service\/.*/i;
  return !apiMatcher.test(req.baseUrl);
};

Keycloak.prototype.obtainDirectly = function (user, pass) {
  return this.grantManager.obtainDirectly(user, pass);
};

function NodeApp () {
  var app = restify.createServer();
  app.use(cookieParser());
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

  this.enforcerResourceServer = function (app) {
    var name = app || 'resource-server-app';
    return parseClient('test/fixtures/templates/resource-server-template.json', this.port, name);
  };

  this.build = function (kcConfig, params) {
    params = params || {};
    var keycloak = new Keycloak(params, kcConfig);

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

    app.get('/check-sso', keycloak.checkSso(), function (req, res) {
      var authenticated = 'Check SSO Success (' + (req.session['keycloak-token'] ? 'Authenticated' : 'Not Authenticated') + ')';
      output(res, authenticated);
    });

    app.get('/restricted', keycloak.protect('realm:admin'), function (req, res) {
      var user = req.kauth.grant.access_token.content.preferred_username;
      output(res, user, 'Restricted access');
    });

    app.get('/service/admin', keycloak.protect('realm:admin'), function (req, res) {
      res.json({ message: 'admin' });
    });

    app.get('/service/grant', keycloak.protect(), (req, res, next) => {
      keycloak.getGrant(req, res)
        .then(grant => {
          res.json(grant);
        })
        .catch(next);
    });

    app.post('/service/grant', bodyParser.json(), (req, res, next) => {
      if (!req.body.username || !req.body.password) {
        res.status(400).send('Username and password required');
      }
      keycloak.obtainDirectly(req.body.username, req.body.password)
        .then(grant => {
          keycloak.storeGrant(grant, req, res);
          res.json(grant);
        })
        .catch(next);
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
