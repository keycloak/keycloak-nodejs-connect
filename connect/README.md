# Keycloak

[Keycloak](http://keycloak.jboss.org/) is a standalone authentication
server, akin to a standalone database.  It provides hooks for federated
authentication, including authenticating against various social networks
and OAuth providers (G+, Facebook, etc).

This module makes it simple to implement a Node.js Connect-friendly
application that uses Keycloak for its authentication and authorization needs.

## Install

    npm install --save connect-keycloak

## Instantiate a Keycloak

The `Keycloak` class provides a central point for configuration
and integration with your application.  The simplest creation
involves no arguments.

    var keycloak = new Keycloak()

By default, this will locate a file named `keycloak.json` alongside
the main executable of your application to initialize keycloak-specific
settings (public key, realm name, various URLs).  The `keycloak.json` file
is obtained from the Keycloak Admin Console.

Instantiation with this method results in all of the reasonable defaults
being used.  Normally, though, if you wish to use web sessions to manage
server-side state for authentication, you will need to initialize the
`KeyCloak(...)` with at least a `store` parameter, passing in the actual
session store that `express-session` is using.

    var session = require('express-session');
    var memoryStore = new session.MemoryStore();

    var keycloak = new Keycloak({ store: memoryStore });

## Install middleware

Once instantiated, install the middleware into your connect-capable app:

    var app = express();

    app.use( keycloak.middleware() );

## Protect resources

### Simple authentication

To enforce that a user must be authenticated before accessing a resource,
simply use a no-argument version of `keycloak.protect()`:

    app.get( '/complain', keycloak.protect(), complaintHandler );

### Role-based authorization

To secure a resource with an application role for the current app:

    app.get( '/special', keycloak.protect('special'), specialHandler );

To secure a resource with an application role for a *different* app:

    app.get( '/extra-special', keycloak.protect('other-app:special', extraSpecialHandler );

To secure a resource with a realm role:

    app.get( '/amin', keycloak.protect( 'realm:admin' ), adminHandler );

### Advanced authorization

To secure resources based on parts of the URL itself, assuming a role exists 
for each section:

    function protectBySection(token, request) {
      return token.hasRole( request.params.section );
    }

    app.get( '/:section/:page', keycloak.protect( protectBySection ), sectionHandler );

## Additional URLs

### Explicit user-triggered logout

By default, the middleware catches calls to `/logout` to send the user through a
Keycloak-centric logout workflow. This can be changed by specifying a `logout`
configuration parameter to the `middleware()` call:

    app.use( keycloak.middleware( { logout: '/logoff' } );

### Keycloak Admin Callbacks

Also, the middleware supports callbacks from the Keycloak console to logout a single
session or all sessions.  By default, these type of admin callbacks occur relative
to the root URL of `/` but can be changed by providing an `admin` parameter 
to the `middleware()` call:

    app.use( keycloak.middleware( { admin: '/callbacks' } );

Normally this does not need to be changed.

# A full example

The `connect-keycloak-example` has this example:

## `example.js`

    var Keycloak = require('connect-keycloak');

    var express = require('express');
    var session = require('express-session')

    var app = express();

    // Allow passing in a port from the command-line.
    var p = 3000;
    if ( process.argv.length >= 3 ) {
      p = Number( process.argv[2] );
    }

    app.set('port', p );

    // Create a session-store to be used by both the express-session
    // middleware and the keycloak middleware.
    
    var memoryStore = new session.MemoryStore();
    
    app.use( session({
      secret: 'aaslkdhlkhsd',
      resave: false,
      saveUninitialized: true,
      store: memoryStore,
    } ))
    
    
    // Provide the session store to the Keycloak so that sessions
    // can be invalidated from the Keycloak console callback.
    //
    // Additional configuration is read from keycloak.json file
    // installed from the Keycloak web console.
    
    var keycloak = new Keycloak({
      store: memoryStore
    });
    
    // Install the Keycloak middleware.
    //
    // Specifies that the user-accessible application URL to
    // logout should be mounted at /logout
    //
    // Specifies that Keycloak console callbacks should target the
    // root URL.  Various permutations, such as /k_logout will ultimately
    // be appended to the admin URL.
    
    app.use( keycloak.middleware( {
      logout: '/logout',
      admin: '/',
    } ));
    
    
    // A normal un-protected public URL.
    
    app.get( '/', function(req,resp) {
      resp.send( "Howdy!" );
    } )
    
    
    // A protection guard can take up to 3 arguments, and is passed
    // the access_token, the HTTP request and the HTTP response.
    //
    // The token can be tested for roles:
    //
    // * 'foo' is a simple application role 'foo' for the current application
    // * 'bar:foo' is an application role 'foo' for the application 'bar'
    // * 'realm:foo' is a realm role 'foo' for the application's realm
    //
    // A protection guard can be passed to keycloak.protect(...) for any
    // URL.  If it returns true, then the request is allowed.  If false,
    // access will be denied.
    
    var groupGuard = function(token, req, resp) {
      return token.hasRole( req.params.group );
    }
    
    // The keycloak.protect(...) function can take a guard function to perform
    // advanced protection of a URL.
    //
    // Additionally (not shown) it can take simple string role specifier identical
    // to those used above by token.hasRole(...).
    //
    // In all cases, if a user is not-yet-authenticated, the Keycloak token authentication
    // dance will begin by redirecting the user to the Keycloak login screen.  If
    // authenticated correctly with Keycloak itself, the workflow continues to exchange
    // the Keycloak-provided for a signed Keycloak access_token.
    //
    // A user's authentication may be provided through the HTTP session (via cookies)
    // or through Bearer authentication header.
    //
    // In the event a user is authenticated, but his access-token has expired, if a
    // refresh-token is available, the middleware will attempt to perform a refresh.
    //
    // All of the above workflow is transparent to the user, who ultimately will
    // access the requested resource or be denied, modulo an initial login through
    // Keycloak itself.
    
    app.get( '/:group/:page', keycloak.protect( groupGuard ), function(req,resp) {
      resp.send( 'Page: ' + req.params.page + ' for Group: ' + req.params.group + '<br><a href="/logout">logout</a>');
    })
    
    // A simple keycloak.protect() ensures that a user is authenticated
    // but provides no additional RBAC protection.
    
    app.get( '/:page', keycloak.protect(), function(req,resp) {
      resp.send( 'Page: ' + req.params.page + '<br><a href="/logout">logout</a>');
    } );
    
    var server = app.listen(app.settings.port, function () {
      var host = server.address().address
      var port = server.address().port
      console.log('Example app listening at http://%s:%s', host, port)
    })
    
## `keycloak.json`

Alongside the `example.js` lives `keycloak.json` obtained from our Keycloak
admin console when we provisioned this app.


    {
      "realm": "example-realm",
      "realm-public-key": "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrVrCuTtArbgaZzL1hvh0xtL5mc7o0NqPVnYXkLvgcwiC3BjLGw1tGEGoJaXDuSaRllobm53JBhjx33UNv+5z/UMG4kytBWxheNVKnL6GgqlNabMaFfPLPCF8kAgKnsi79NMo+n6KnSY8YeUmec/p2vjO2NjsSAVcWEQMVhJ31LwIDAQAB",
      "auth-server-url": "http://localhost:8080/auth",
      "ssl-required": "none",
      "resource": "example-app",
      "credentials": {
        "secret": "89efcbdf-ee95-4292-bbd9-29304e6744c7"
      }
    }

