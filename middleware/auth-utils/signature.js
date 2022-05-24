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
'use strict'

const Rotation = require('./rotation')
const crypto = require('crypto')

/**
 * Construct a signature.
 *
 * @param {Config} config Config object.
 *
 * @constructor
 */
function Signature (config) {
  this.publicKey = config.publicKey
  this.rotation = new Rotation(config)
}

/**
 * Verify signed data using the token information provided
 * @TODO in the future provide more alternatives like HS256 support
 * @param {Token} the Token object
 */
Signature.prototype.verify = function verify (token, callback) {
  return new Promise((resolve, reject) => {
    const verify = crypto.createVerify('RSA-SHA256')

    this.rotation.getJWK(token.header.kid).then(key => {
      verify.update(token.signed)
      if (!verify.verify(key, token.signature, 'base64')) {
        reject(new Error('admin request failed: invalid token (signature)'))
      } else {
        resolve(token)
      }
    }).catch((err) => {
      reject(new Error('failed to load public key to verify token. Reason: ' + err.message))
    })
  })
}

module.exports = Signature
