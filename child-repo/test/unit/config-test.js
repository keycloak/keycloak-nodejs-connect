'use strict';

const Config = require('../../index').Config;

const test = require('tape');

const publicKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgH1MnB3XC7vCXYYZZVth0fHgfOMnJmpaldkX+WMi+U9ivkYkEo+uRL6QNmysbbFtllb/btGOMSPyTpQ+6WBsTPgL3BuWJiA4Xvg0FkkTvZb/B/Uta4SAOtM8/qB9Aq/papgK2eCwB6t803RyPThLrzOV8q1q+KocRl5BhAoN97mQyTytesSMrgsWwpyyXSqejIefaIlefucVzK7seZghEApofzJBz9ryiqOcAATD4oC6uzmUUKvXHeYsIT6DnlZdYIm4Bf884QXYGD9NhvjMrDWqs1kTNOjFoGvxmvcKXx05lztYDMii8jv1pKYNEVmNuUOL4TW5IRd5dtOVvrpd1QIDAQAB';

test('Config#configure', (t) => {
  let cfg = new Config({'realm': 'test-realm', 'realm-public-key': publicKey});

  t.equal(cfg.realm, 'test-realm');
  t.end();
});

test('Config#configure with boolean', (t) => {
  let cfg = new Config({'public': true, 'realm-public-key': publicKey});

  t.equal(cfg.public, true);
  t.end();
});

test('Config#configure with env variable reference not set', (t) => {
  let cfg = new Config({'realm': '${env.NOT_SET}', 'realm-public-key': publicKey});

  t.equal(cfg.realm, '');
  t.end();
});

test('Config#configure with env variable reference not set with fallback', (t) => {
  let cfg = new Config({'realm': '${env.NOT_SET:fallback}', 'realm-public-key': publicKey});

  t.equal(cfg.realm, 'fallback');
  t.end();
});

test('Config#configure with env variable reference set', (t) => {
  let cfg = new Config({'realm': '${env.USER}', 'realm-public-key': publicKey});

  t.equal(cfg.realm, process.env.USER);
  t.end();
});

test('Config#configure with env variable reference set with fallback', (t) => {
  let cfg = new Config({'realm': '${env.USER:fallback}', 'realm-public-key': publicKey});

  t.equal(cfg.realm, process.env.USER);
  t.end();
});
