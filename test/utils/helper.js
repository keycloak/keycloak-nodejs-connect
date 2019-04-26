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
/**
 * A helper for test cases and fixtures
 */
const fs = require('fs');

/**
 * Utility to parse realm templates
 * @param {object} file - Realm template JSON file
 * @param {object} realmName - Realm name
 * @param {object} port - The HTTP port which the client app will listen. This is necessary
 * to provide the proper redirect URIs
 * @param {object} hostname - Host name which the client app will listen.
 */

function parse (file, realmName) {
  var content = fs.readFileSync(file, 'utf8')
    .replace(/{{realm}}/g, realmName);
  return JSON.parse(content);
}

function parseClient (file, httpPort, name) {
  var port = httpPort || '3000';
  var content = fs.readFileSync(file, 'utf8')
    .replace(/{{name}}/g, name)
    .replace(/{{port}}/g, port);
  var json = JSON.parse(content);
  return json;
}

/**
 * Utility to provide testing vectors instead of
 * a bunch of duplicate files with small changes
 */
function TestVector () {
}

TestVector.wrongRealmPublicKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAikGBvYGniAJ59ZjpaSDw2o+j40Ila/dWfN8qA1dzXJesH9Z1sZrcevJB+rfxoZDaWMz2l9Q3OxG/qolTpsQl8NBdb5tymic9qDkAIsiyKThzjcfs5lOSxfnkHn6+Z0QbrYnXQs/cGvQ1Ai81M1M1O6BHDWu05n8c977h+BsfLmqGj7MZZj9gw9RM84RIKDGHTbFh9YyXBJVtqbOhRD7hcB0O9olDZb7mQ5A8gsMctcUhsVBy3xKCLMD41XU92rQ9FAlsV9mBglLqaVWr2mxQItN3lgjE02L8UyorI3T0uprIsnv7B2NwUC5ZhwZGfnBznUPVrT6makEJklpg5if3qQIDAQAB';
TestVector.logoutValidPayload = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IkZKODZHY0YzalRiTkxPY280TnZaa1VDSVVtZllDcW9xdE9RZU1mYmhObEUifQ.eyJpYXQiOjE1NTY2MTcwNzksInJlc291cmNlIjoiYWRtaW5hcHAzIiwiYWN0aW9uIjoiTE9HT1VUIiwibm90QmVmb3JlIjoxNTg3MDQ3NTM3fQ.NplTHo8JuwtmUbpp3AHjM3c6rn7g_xGWegC-b8Gg7V2QoN9vPRb9oCc9fdD7qWKpXLgfNtvtTIJnIIP5O_ux7Jt_SQyNtwoPmf5k_EFmm7JSxPnVfVA36BJbGDJu_BiNbktGgpNVZR5HnAkawhsLLo05S0edFfnbs4N9a_4W_YM';
TestVector.logoutWrongKeyPairPayload = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IkZKODZHY0YzalRiTkxPY280TnZaa1VDSVVtZllDcW9xdE9RZU1mYmhObEUifQ.eyJpYXQiOjE1NTc4NjE2NjgsInJlc291cmNlIjoiYWRtaW5hcHAyIiwiYWN0aW9uIjoiTE9HT1VUIiwibm90QmVmb3JlIjoxNTg3MDQ3NTM3fQ.aqNUXVbf2poQBj9V2oHTUiEn3NrUAbpVBt_70MC-l2_ihwaer8c93KhB3VDFZVVHDf_Jq-9_JVvwV755LXbtNOLXvptTXBQYyXFeu1LfwJTON217xzNlf0izm2tdl5qDyjcYNNX1TrltlraZIh2j96BsgDCRx8k_m2c_H_4xCfoU73eqehID5ob1wNXtT8372Xiykzrwotpe9oXPhSEHRT7r62IvqfiYMJ7iTPaffGz9_oeeMTlOrx9YB29M7Y5KHPjYKjRPR8caNFYCI9j1HoQiMKNkcn5oTH7aUUnNE8S8x-YIlxeXLP1SqVrB2Psf2PXbTsMDr4R4JaJikwn1wA';
TestVector.logoutIncompletePayload = '.eyJyZXNvdXJjZSI6Im5vZGVqcy1jb25uZWN0IiwiYWN0aW9uIjoiTE9HT1VUIiwibm90QmVmb3JlIjoxNTg3MDQ3NTM3fQ.';
TestVector.notBeforeValidPayload = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IkZKODZHY0YzalRiTkxPY280TnZaa1VDSVVtZllDcW9xdE9RZU1mYmhObEUifQ.eyJpYXQiOjE1NTY2MTgzNTAsInJlc291cmNlIjoiYWRtaW5hcHA3IiwiYWN0aW9uIjoiUFVTSF9OT1RfQkVGT1JFIiwibm90QmVmb3JlIjoxNTg3MDQ3NTM3fQ.iLrZ6Z2FXZt3XuTbRWXJzmK281p33Py_hhkcevPyVsW3OhOli5CZsEZBSKXnUBOJgEN9HQXRoRUr4KWhbquoQi_wUIjp0Cog_0qC8JepCvz0FWhaProgtJxKjlYgiY3kzjMI4MDFfeTE2xrcXzJ5qbYxmhU1t07_7t4BHzm7C6o';
TestVector.notBeforeWrongKeyPairPayload = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IkZKODZHY0YzalRiTkxPY280TnZaa1VDSVVtZllDcW9xdE9RZU1mYmhObEUifQ.eyJpYXQiOjE1NTY2MTg2NjIsInJlc291cmNlIjoiYWRtaW5hcHA2IiwiYWN0aW9uIjoiUFVTSF9OT1RfQkVGT1JFIiwibm90QmVmb3JlIjoxNTg3MDQ3NTM3fQ.X0EoW-9N_6jOn9VFkm3HxTwZS2cCm0ChCH3ddYcAnVcugGSrvv1K5vQy9czlalvEnLZ_HpaWNWoBYA7hoqR5S600A-BSMHrb6oPt2B1JW8htgubD8NbJC2COsOGAbxLupO9YEP_oodzpAF5ikMB3Pm2g1e66BFvotSQHAtgg7HepzywvPrkYork44worrX2ByHVK4Y5Or6BWleEx1pa59dqmZNfupaL4pKSG9j7H9NM1YmEuKwjHr9PIyN7bPkx64LamI5aUIk5rjIM8plnxiayEgdCr9B6ag0xVoKggv3GV0m-XsRkbUPl91EbLQXwSCYdL5TQsvK5uJqkba9eiRA';
TestVector.notBeforeIncompletePayload = '.eyJyZXNvdXJjZSI6ImFkbWluYXBwNSIsImFjdGlvbiI6IlBVU0hfTk9UX0JFRk9SRSIsIm5vdEJlZm9yZSI6MTU4NzA0NzUzN30.';

module.exports = {
  parse: parse,
  TestVector: TestVector,
  parseClient: parseClient,
  dummyReply: {
    'access_token': 'Dummy access token',
    'expires_in': 2,
    'refresh_expires_in': 1800,
    'refresh_token': 'Dummy refresh token',
    'token_type': 'bearer',
    'id_token': 'Dummy id token',
    'not-before-policy': 1462208947,
    'session_state': '22e0b5bd-fb0f-4f99-93aa-a60c4b934c88'
  }
};
