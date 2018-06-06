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
const request = require('request');
const jwkToPem = require('jwk-to-pem');

/**
 * Construct a Rotation instance
 *
 * @param {Config} config Config object.
 *
 * @constructor
 */
function Rotation (config) {
  this.realmUrl = config.realmUrl;
  this.proxyUrl = config.proxyUrl;
  this.minTimeBetweenJwksRequests = config.minTimeBetweenJwksRequests;
  this.jwks = [];
  this.lastTimeRequesTime = 0;
}

Rotation.prototype.retrieveJWKs = function retrieveJWKs (callback) {
  const uri = this.realmUrl + '/protocol/openid-connect/certs';
  const options = {
    uri,
    method: 'GET'
  };
  if (this.proxyUrl) {
    options.proxy = this.proxyUrl;
  }
  options.method = 'GET';
  const promise = new Promise((resolve, reject) => {
    const req = request(options, (error, response, body) => {
      if (error || response.statusCode < 200 || response.statusCode >= 300) {
        return reject('Error fetching JWK Keys');
      }
      const data = JSON.parse(body);
      resolve(data);
    });
    req.on('error', reject);
  });
  return nodeify(promise, callback);
};

Rotation.prototype.getJWK = function getJWK (kid) {
  let key = this.jwks.find((key) => { return key.kid === kid; });
  if (key) {
    return new Promise((resolve, reject) => {
      resolve(jwkToPem(key));
    });
  }
  var self = this;

    // check if we are allowed to send request
  var currentTime = new Date().getTime() / 1000;
  if (currentTime > this.lastTimeRequesTime + this.minTimeBetweenJwksRequests) {
    return this.retrieveJWKs()
        .then(publicKeys => {
          self.lastTimeRequesTime = currentTime;
          self.jwks = publicKeys.keys;
          var convertedKey = jwkToPem(self.jwks.find((key) => { return key.kid === kid; }));
          return convertedKey;
        });
  } else {
    console.error('Not enough time elapsed since the last request, blocking the request');
  }
};

Rotation.prototype.clearCache = function clearCache () {
  this.jwks.length = 0;
};

const nodeify = (promise, cb) => {
  if (typeof cb !== 'function') return promise;
  return promise.then((res) => cb(null, res)).catch((err) => cb(err));
};

module.exports = Rotation;
