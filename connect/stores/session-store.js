
function SessionStore(store) {
  this.store = store;
}

SessionStore.TOKEN_KEY = 'keycloak-token';

SessionStore.prototype.getId = function(request) {
  return request.session.id;
};

SessionStore.prototype.get = function(request) {
  return request.session[ SessionStore.TOKEN_KEY ];
};

SessionStore.prototype.clear = function(sessionId) {
  var self = this;
  this.store.get( sessionId, function(err, session) {
    if ( session ) {
      delete session[ SessionStore.TOKEN_KEY ];
      self.store.set( sessionId, session );
    }
  });
};

var store = function(request, response) {
  request.session[ SessionStore.TOKEN_KEY ] = this.__raw;
};

var unstore = function(request, response) {
  delete request.session[ SessionStore.TOKEN_KEY ];
};

SessionStore.prototype.wrap = function(grant) {
  grant.store   = store;
  grant.unstore = unstore;
};

module.exports = SessionStore;