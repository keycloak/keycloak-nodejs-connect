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

const test = require('tape');
const roi = require('roi');

test('Should test unprotected route.', t => {
  const options = {
    'endpoint': 'http://localhost:3000/'
  };

  roi.get(options)
    .then(x => {
      t.equal(JSON.parse(x.body).name, 'unprotected');
      t.end();
    })
    .catch(e => {
      console.error(e);
      t.fail();
    });
});

test('Should test protected route.', t => {
  const options = {
    'endpoint': 'http://localhost:3000/login'
  };

  roi.get(options)
    .then(x => {
      t.equal(x.statusCode !== 404, true);
      t.end();
    })
    .catch(e => {
      console.error(e);
      t.fail();
    });
});

test('Should verify logout feature.', t => {
  const options = {
    'endpoint': 'http://localhost:3000/logout'
  };

  roi.get(options)
    .then(x => {
      t.equal(JSON.parse(x.body).name, 'unprotected');
      t.end();
    })
    .catch(e => {
      console.error(e);
      t.fail();
    });
});
