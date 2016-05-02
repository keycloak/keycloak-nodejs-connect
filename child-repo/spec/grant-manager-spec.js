
var GrantManager = require('./../index').GrantManager;
var Config       = require('./../index').Config;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe( "grant manager in public mode", function() {
  var config       = new Config('spec/fixtures/keycloak-public.json');
  var manager      = new GrantManager(config);

  it( 'should be able to obtain a grant', function(done) {
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( function(grant) {
        expect( grant.access_token ).not.toBe( undefined );
      })
      .done(done);
  });
});

describe( "grant manager in confidential mode", function() {
  var config       = new Config('spec/fixtures/keycloak-confidential.json');
  var manager      = new GrantManager(config);

  it( 'should be able to obtain a grant', function(done) {

    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( function(grant) {
        expect( grant.access_token ).not.toBe( undefined );
      })
      .done(done);
  });

  it( 'should be able to refresh a grant', function(done) {
    var originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .delay(2000)
      .then( function(grant) {
        expect( grant.access_token ).not.toBe( undefined );
        originalAccessToken = grant.access_token;
        return grant;
      })
      .then( function(grant) {
        return manager.ensureFreshness(grant);
      })
      .then( function(grant) {
        expect( grant.access_token ).not.toBe( undefined );
        expect( grant.access_token.token ).not.toBe( originalAccessToken.token );
      })
      .done( done );
  });

  it( 'should be able to validate a valid token', function(done) {
    var originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( function(grant) {
        originalAccessToken = grant.access_token;
        return manager.validateAccessToken( grant.access_token );
      })
      .then( function(token) {
        expect( token ).not.toBe( undefined );
        expect( token ).toBe( originalAccessToken );
      })
      .done( done );
  });

  it( 'should be able to validate an invalid token', function(done) {
    var originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .delay(3000)
      .then( function(grant) {
        originalAccessToken = grant.access_token;
        return manager.validateAccessToken( grant.access_token );
      })
      .then( function(result) {
        expect( result ).toBe( false );
      })
      .done( done );
  });

  it( 'should be able to validate a valid token string', function(done) {
    var originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( function(grant) {
        originalAccessToken = grant.access_token.token;
        return manager.validateAccessToken( grant.access_token.token );
      })
      .then( function(token) {
        expect( token ).not.toBe( undefined );
        expect( token ).toBe( originalAccessToken );
      })
      .done( done );
  });

  it( 'should be able to validate an invalid token string', function(done) {
    var originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .delay(3000)
      .then( function(grant) {
        originalAccessToken = grant.access_token.token;
        return manager.validateAccessToken( grant.access_token.token )
      })
      .then( function(result) {
        expect( result ).toBe( false );
      })
      .done( done );
  });
});
