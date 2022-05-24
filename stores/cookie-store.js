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
'use strict'

const CookieStore = {}

CookieStore.TOKEN_KEY = 'keycloak-token'

CookieStore.get = (request) => {
  const value = request.cookies[CookieStore.TOKEN_KEY]
  if (value) {
    try {
      return JSON.parse(value)
    } catch (err) {
      // ignore
    }
  }
}

const store = (grant) => {
  return (request, response) => {
    response.cookie(CookieStore.TOKEN_KEY, grant.__raw)
  }
}

const unstore = (request, response) => {
  response.clearCookie(CookieStore.TOKEN_KEY)
}

CookieStore.wrap = (grant) => {
  grant.store = store(grant)
  grant.unstore = unstore
}

module.exports = CookieStore
