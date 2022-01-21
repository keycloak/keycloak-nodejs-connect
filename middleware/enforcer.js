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
'use strict';

function handlePermissions (permissions, callback) {
  for (let i = 0; i < permissions.length; i++) {
    const expected = permissions[i].split(':');
    const resource = expected[0];
    let scope;

    if (expected.length > 1) {
      scope = expected[1];
    }

    const r = callback(resource, scope);

    if (r === false) {
      return r;
    }
  }

  return true;
}

/**
 * Construct a policy enforcer.
 *
 * @param {Config} config Config object.
 *
 * @constructor
 */
function Enforcer (keycloak, config) {
  this.keycloak = keycloak;
  this.config = config || {};

  if (!this.config.response_mode) {
    this.config.response_mode = 'permissions';
  }

  if (!this.config.resource_server_id) {
    this.config.resource_server_id = this.keycloak.getConfig().clientId;
  }
}

Enforcer.prototype.enforce = function enforce (expectedPermissions) {
  const keycloak = this.keycloak;
  const config = this.config;

  if (typeof expectedPermissions === 'string') {
    expectedPermissions = [expectedPermissions];
  }

  return function (request, response, next) {
    if (!expectedPermissions || expectedPermissions.length === 0) {
      return next();
    }

    const authzRequest = {
      audience: config.resource_server_id,
      response_mode: config.response_mode
    };

    handlePermissions(expectedPermissions, function (resource, scope) {
      if (!authzRequest.permissions) {
        authzRequest.permissions = [];
      }

      const permission = { id: resource };

      if (scope) {
        permission.scopes = [scope];
      }

      authzRequest.permissions.push(permission);
    });

    if (request.kauth && request.kauth.grant) {
      if (handlePermissions(expectedPermissions, function (resource, scope) {
        if (!request.kauth.grant.access_token.hasPermission(resource, scope)) {
          return false;
        }
      })) {
        return next();
      }
    }

    if (config.claims) {
      const claims = config.claims(request);

      if (claims) {
        authzRequest.claim_token = Buffer.from(JSON.stringify(claims)).toString('base64');
        authzRequest.claim_token_format = 'urn:ietf:params:oauth:token-type:jwt';
      }
    }

    if (config.response_mode === 'permissions') {
      return keycloak.checkPermissions(authzRequest, request, function (permissions) {
        if (handlePermissions(expectedPermissions, function (resource, scope) {
          if (!permissions || permissions.length === 0) {
            return false;
          }

          for (let j = 0; j < permissions.length; j++) {
            const permission = permissions[j];

            if (permission.rsid === resource || permission.rsname === resource) {
              if (scope) {
                if (permission.scopes && permission.scopes.length > 0) {
                  if (!permission.scopes.includes(scope)) {
                    return false;
                  }
                  break;
                }
                return false;
              }
            }
          }
        })) {
          request.permissions = permissions;
          return next();
        }

        return keycloak.accessDenied(request, response, next);
      }).catch(function () {
        return keycloak.accessDenied(request, response, next);
      });
    } else if (config.response_mode === 'token') {
      authzRequest.response_mode = undefined;
      return keycloak.checkPermissions(authzRequest, request).then(function (grant) {
        if (handlePermissions(expectedPermissions, function (resource, scope) {
          if (!grant.access_token.hasPermission(resource, scope)) {
            return false;
          }
        })) {
          return next();
        }

        return keycloak.accessDenied(request, response, next);
      }).catch(function () {
        return keycloak.accessDenied(request, response, next);
      });
    }
  };
};

module.exports = Enforcer;
