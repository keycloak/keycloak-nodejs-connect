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

const URL = require('url');

module.exports = function (keycloak) {
  return function postAuth (request, response, next) {
    if (!request.query.auth_callback) {
      return next();
    }

    if (request.query.error) {
      return keycloak.accessDenied(request, response, next);
    }

    keycloak.getGrantFromCode(request.query.code, request, response)
      .then(grant => {
        let urlParts = {
          pathname: request.path,
          query: request.query
        };

        delete urlParts.query.code;
        delete urlParts.query.auth_callback;
        delete urlParts.query.state;

        let cleanUrl = URL.format(urlParts);

        request.kauth.grant = grant;
        try {
          keycloak.authenticated(request);
        } catch (err) {
          console.log(err);
        }
        response.redirect(cleanUrl);
      }).catch((err) => {
        keycloak.accessDenied(request, response);
        console.error('Could not obtain grant code: ' + err);
      });
  };
};
