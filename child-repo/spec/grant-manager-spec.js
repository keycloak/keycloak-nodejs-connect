'use strict';

/* jshint jasmine: true */

const GrantManager = require('./../index').GrantManager;
const Config       = require('./../index').Config;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

const delay = (ms) => (value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

describe( "grant manager in public mode", () => {
  const config       = new Config('spec/fixtures/keycloak-public.json');
  const manager      = new GrantManager(config);

  it( 'should be able to obtain a grant', (done) => {
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( (grant) => expect( grant.access_token ).not.toBe( undefined ) )
      .then(done);
  });
});

describe( "grant manager in confidential mode", () => {
  const config       = new Config('spec/fixtures/keycloak-confidential.json');
  const manager      = new GrantManager(config);

  it( 'should be able to obtain a grant', (done) => {
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( (grant) => expect( grant.access_token ).not.toBe( undefined ) )
      .then(done);
  });

  it( 'should be able to refresh a grant', (done) => {
    let originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( delay(3000) )
      .then( (grant) => {
        expect( grant.access_token ).not.toBe( undefined );
        originalAccessToken = grant.access_token;
        return grant;
      })
      .then( (grant) => manager.ensureFreshness(grant) )
      .then( (grant)  => {
        expect( grant.access_token ).not.toBe( undefined );
        expect( grant.access_token.token ).not.toBe( originalAccessToken.token );
      })
      .then(done);
  });

  it( 'should be able to validate a valid token', (done) => {
    let originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( (grant) => {
        originalAccessToken = grant.access_token;
        return manager.validateAccessToken( grant.access_token );
      })
      .then( (token) => {
        expect( token ).not.toBe( undefined );
        expect( token ).toBe( originalAccessToken );
      })
      .then(done);
  });

  it( 'should be able to validate an invalid token', (done) => {
    let originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( delay(3000) )
      .then( (grant) => {
        originalAccessToken = grant.access_token;
        return manager.validateAccessToken(grant.access_token);
      })
      .then( (result) => expect( result ).toBe( false ))
      .then(done);
  });

  it( 'should be able to validate a valid token string', (done) => {
    let originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( (grant) => {
        originalAccessToken = grant.access_token.token;
        return manager.validateAccessToken( grant.access_token.token );
      })
      .then( (token) => {
        expect( token ).not.toBe( undefined );
        expect( token ).toBe( originalAccessToken );
      })
      .then(done);
  });

  it( 'should be able to validate an invalid token string', (done) => {
    let originalAccessToken;
    manager.obtainDirectly( 'test-user', 'tiger' )
      .then( delay(3000) )
      .then( (grant) => {
        originalAccessToken = grant.access_token.token;
        return manager.validateAccessToken( grant.access_token.token );
      })
      .then( (result) => expect( result ).toBe( false ))
      .then(done);
  });
});
