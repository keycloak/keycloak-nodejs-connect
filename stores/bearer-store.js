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

const BearerStore = {}

BearerStore.get = (request) => {
  const header = request.headers.authorization

  if (header) {
    if (header.indexOf('bearer ') === 0 || header.indexOf('Bearer ') === 0) {
      const accessToken = header.substring(7)
      return {
        access_token: accessToken
      }
    }
  }
}

module.exports = BearerStore
