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
const http = require('http');
const https = require('https');

/**
 * Construct a Request instance
 *
 * @param {Config} config Config object.
 *
 * @constructor
 */
function Request (config) {
  this.agent = config.agent;
}

Request.prototype.getProtocol = function getProtocol (protocol) {
  return protocol === 'https:' ? https : http;
};

Request.prototype.make = function request (opts, cb) {
  const options = Object.assign({}, opts);

  if (this.agent) {
    options.agent = this.agent;
  }

  return this.getProtocol(options.protocol).request(options, cb);
};

Request.prototype.statusCodes = function statusCodes (statusCode) {
  return http.STATUS_CODES[ statusCode ];
};

module.exports = Request;
