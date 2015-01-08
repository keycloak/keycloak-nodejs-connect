
function NodeRegisterer(config, hostname) {
  this.realmUrl  = config.realmUrl;
  this.clientId  = config.clientId;
  this.secret    = config.secret;
  this.secret    = config.secret;

  this.hostname = hostname;
}


NodeRegisterer.prototype.unregister = function() {
};

NodeRegisterer.prototoype.register = function() {

 var options = url.parse( this.realmUrl + '/clients-managements/register-node' );

 options.method = 'POST';
 options.headers = {
   'Content-Type': 'application/x-www-form-urlencoded',
   'Authorization': 'Basic ' + new Buffer( this.clientId + ':' + this.secret ).toString('base64' ),
 };

  var registerRequest = http.request( options, function(registerResponse) {
  });

  registerRequest.write( "application_cluster_host=localhost" );
  registerRequest.end();

  setTimeout( this.register.bind(this), 30000 );
};

module.exports = NodeRegisterer;