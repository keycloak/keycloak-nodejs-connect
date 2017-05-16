const keycloakAdminClient = require('keycloak-admin-client');
const fs = require('fs');

module.exports = {
  AdminHelper: AdminHelper
};

function AdminHelper (baseUrl, username, password) {
  var settings = {
    baseUrl: baseUrl || 'http://127.0.0.1:8080/auth',
    username: username || 'admin',
    password: password || 'admin',
    grant_type: 'password',
    client_id: 'admin-cli'
  };
  this.kca = keycloakAdminClient(settings);
}

function parse (json) {
  return JSON.parse(fs.readFileSync(json, 'utf8'));
}

AdminHelper.prototype.createRealm = function createRealm (realmToAdd) {
  return this.kca.then((client) => {
    return client.realms.create(parse(realmToAdd));
  }).catch((err) => {
    console.error(err);
  });
};

AdminHelper.prototype.destroy = function destroy (realm) {
  this.kca.then((client) => {
    return client.realms.remove(realm.realm);
  }).catch((err) => {
    console.error(err);
  });
};
