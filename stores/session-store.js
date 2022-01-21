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

function SessionStore (store) {
  this.store = store;
}

SessionStore.TOKEN_KEY = 'keycloak-token';

SessionStore.prototype.get = (request) => request.session[SessionStore.TOKEN_KEY];

SessionStore.prototype.clear = function (sessionId) {
  const self = this;
  this.store.get(sessionId, (err, session) => {
    if (err) {
      console.log(err);
    }
    if (session) {
      delete session[SessionStore.TOKEN_KEY];
      self.store.set(sessionId, session);
    }
  });
};

const store = (grant) => {
  return (request, response) => {
    request.session[SessionStore.TOKEN_KEY] = grant.__raw;
  };
};

const unstore = (request, response) => {
  delete request.session[SessionStore.TOKEN_KEY];
};

SessionStore.prototype.wrap = (grant) => {
  if (grant) {
    grant.store = store(grant);
    grant.unstore = unstore;
  }
};

module.exports = SessionStore;
