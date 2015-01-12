
module.exports = function(keycloak) {
  return function(request, response, next) {
    console.log( "getting grant" );
    keycloak.getGrant( request, response )
      .then( function(grant) {
         console.log( "attach grant", grant );
        request.auth.grant = grant;
      })
      .then( next )
      .catch( function(arg) {
        console.log( "unable to attach, apparent", arg );
        next();
      } );
  };
};
