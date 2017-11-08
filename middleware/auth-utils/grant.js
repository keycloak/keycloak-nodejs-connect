/*!
 * Copyright 2014 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * Construct a new grant.
 *
 * The passed in argument may be another `Grant`, or any object with
 * at least `access_token`, and optionally `refresh_token` and `id_token`,
 * `token_type`, and `expires_in`.  Each token should be an instance of
 * `Token` if present.
 *
 * If the passed in object contains a field named `__raw` that is also stashed
 * away as the verbatim raw `String` data of the grant.
 *
 * @param {Object} grant The `Grant` to copy, or a simple `Object` with similar fields.
 *
 * @constructor
 */
function Grant (grant) {
  this.update(grant);
}

/**
 * Update this grant in-place given data in another grant.
 *
 * This is used to avoid making client perform extra-bookkeeping
 * to maintain the up-to-date/refreshed grant-set.
 */
Grant.prototype.update = function update (grant) {
  // intentional naming with under_scores instead of
  // CamelCase to match both Keycloak's grant JSON
  // and to allow new Grant(new Grant(kc)) copy-ctor

  this.access_token = grant.access_token;
  this.refresh_token = grant.refresh_token;
  this.id_token = grant.id_token;

  this.token_type = grant.token_type;
  this.expires_in = grant.expires_in;
  this.__raw = grant.__raw;
};

/**
 * Returns the raw String of the grant, if available.
 *
 * If the raw string is unavailable (due to programatic construction)
 * then `undefined` is returned.
 */
Grant.prototype.toString = function toString () {
  return this.__raw;
};

/**
 * Determine if this grant is expired/out-of-date.
 *
 * Determination is made based upon the expiration status of the `access_token`.
 *
 * An expired grant *may* be possible to refresh, if a valid
 * `refresh_token` is available.
 *
 * @return {boolean} `true` if expired, otherwise `false`.
 */
Grant.prototype.isExpired = function isExpired () {
  if (!this.access_token) {
    return true;
  }
  return this.access_token.isExpired();
};

module.exports = Grant;
