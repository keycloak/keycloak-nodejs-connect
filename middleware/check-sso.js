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

const UUID = require('./../uuid')
const URL = require('url')

function forceCheckSSO (keycloak, request, response) {
  const host = request.hostname
  const headerHost = request.headers.host.split(':')
  const port = headerHost[1] || ''
  const protocol = request.protocol
  const hasQuery = ~(request.originalUrl || request.url).indexOf('?')

  const redirectUrl = protocol + '://' + host + (port === '' ? '' : ':' + port) + (request.originalUrl || request.url) + (hasQuery ? '&' : '?') + 'auth_callback=1'

  if (request.session) {
    request.session.auth_redirect_uri = redirectUrl
  }

  const uuid = UUID()
  const loginURL = keycloak.loginUrl(uuid, redirectUrl)
  const checkSsoUrl = loginURL + '&response_mode=query&prompt=none'

  response.redirect(checkSsoUrl)
}

module.exports = function (keycloak) {
  return function checkSso (request, response, next) {
    if (request.kauth && request.kauth.grant) {
      return next()
    }

    //  Check SSO process is completed and user is not logged in
    if (request.session.auth_is_check_sso_complete) {
      request.session.auth_is_check_sso_complete = false
      return next()
    }

    //  Keycloak server has just answered that user is not logged in
    if (request.query.error === 'login_required') {
      const urlParts = {
        pathname: request.path,
        query: request.query
      }

      delete urlParts.query.error
      delete urlParts.query.auth_callback
      delete urlParts.query.state

      const cleanUrl = URL.format(urlParts)

      //  Check SSO process is completed
      request.session.auth_is_check_sso_complete = true

      //  Redirect back to the original URL
      return response.redirect(cleanUrl)
    }

    if (keycloak.redirectToLogin(request)) {
      forceCheckSSO(keycloak, request, response)
    } else {
      return keycloak.accessDenied(request, response, next)
    }
  }
}
