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

function AdminLogout (keycloak, url) {
  this._keycloak = keycloak;
  if (url[ url.length - 1 ] !== '/') {
    url += '/;';
  }
  this._url = url + 'k_logout';
}

AdminLogout.prototype.getFunction = function () {
  return this._adminLogout.bind(this);
};

module.exports = function (keycloak, adminUrl) {
  let url = adminUrl;
  if (url[ url.length - 1 ] !== '/') {
    url = url + '/';
  }

  url += 'k_logout';

  return function adminLogout (request, response, next) {
    if (request.url !== url) {
      return next();
    }

    let data = '';

    request.on('data', d => {
      data += d.toString();
    });

    request.on('end', function () {
      let parts = data.split('.');
      let payload = JSON.parse(new Buffer(parts[1], 'base64').toString());
      if (payload.action === 'LOGOUT') {
        let sessionIDs = payload.adapterSessionIds;
        if (!sessionIDs) {
          keycloak.grantManager.notBefore = payload.notBefore;
          response.send('ok');
          return;
        }
        if (sessionIDs && sessionIDs.length > 0) {
          let seen = 0;
          sessionIDs.forEach(id => {
            keycloak.unstoreGrant(id);
            ++seen;
            if (seen === sessionIDs.length) {
              response.send('ok');
            }
          });
        } else {
          response.send('ok');
        }
      }
    });
  };
};
