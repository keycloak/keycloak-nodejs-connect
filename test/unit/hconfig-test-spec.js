'use strict';

const t = require('tap');
const RSA = require('rsa-compat').RSA;
const Config = require('../../middleware/auth-utils/config');

t.setTimeout(60000); // Change timeout from 30 sec to 360 sec

t.test('Config#configure', (t) => {
  let cfg = new Config({ 'realm': 'UnitTesting-test-realm' });

  t.equal(cfg.realm, 'UnitTesting-test-realm');
  t.end();
});

t.test('Config#configure with boolean', (t) => {
  let cfg = new Config({ 'public': true });

  t.equal(cfg.public, true);
  t.end();
});

/* eslint-disable no-template-curly-in-string */
t.test('Config#configure with env variable reference not set', (t) => {
  let cfg = new Config({ 'realm': '${process.env.NOT_SET}' });

  t.equal(cfg.realm, '');
  t.end();
});

t.test('Config#configure with env variable reference not set with fallback', (t) => {
  if (process.env.OS !== undefined) {
    let cfg = new Config({ 'realm': '${process.env.NOT_SET:fallback}' });
    t.equal(cfg.realm, 'fallback');
  }
  t.end();
});

t.test('Config#configure with env variable reference set', (t) => {
  if (process.env.USER !== undefined)
  {
    // Linux, OSX, Unix
    let cfg = new Config({ 'realm': '${process.env.USER}' });
    t.equal(cfg.realm, process.env.USER);
  }
  else {
    // Windows !!!!
    let cfg = new Config({ 'realm': '${process.env.USERNAME}' });
    t.equal(cfg.realm, process.env.USERNAME);
  }
    t.end();
});

t.test('Config#configure with env variable reference set with fallback', (t) => {
  if (process.env.USER !== undefined)
  {
    // Linux, OSX, Unix
    let cfg = new Config({ 'realm': '${process.env.USER:fallback}' });
    t.equal(cfg.realm, process.env.USER);
  }
  else {
    // Windows !!!!
    let cfg = new Config({ 'realm': '${process.env.USERNAME:fallback}' });
    t.equal(cfg.realm, process.env.USERNAME);
  }
    t.end();
});

t.test('Config#configure with realm-public-key', (t) => {
  t.plan(2);
  RSA.generateKeypair(2048, 65537, { public: true, pem: true }, (err, keyz) => {
    t.error(err, 'generated keypair successfully');
    let plainKey = keyz.publicKeyPem.split(/\r?\n/).filter(item => item && !item.startsWith('---')).join('');
    let cfg = new Config({ 'realm-public-key': plainKey });
    // Added this due to the upgrades in rsa-compat headers
    t.equal(cfg.publicKey, keyz.publicKeyPem.replace(/RSA PUBLIC/g, 'PUBLIC').replace(/\r/g, ''));
    t.end();
  });
});

t.test('Config#configure with realmPublicKey', (t) => {
  t.plan(2);
  RSA.generateKeypair(2048, 65537, { public: true, pem: true }, (err, keyz) => {
    t.error(err, 'generated keypair successfully');
    let plainKey = keyz.publicKeyPem.split(/\r?\n/).filter(item => item && !item.startsWith('---')).join('');
    let cfg = new Config({ realmPublicKey: plainKey });

    // Added this due to the upgrades in rsa-compat headers
    t.equal(cfg.publicKey, keyz.publicKeyPem.replace(/RSA PUBLIC/g, 'PUBLIC').replace(/\r/g, ''));
    t.end();
  });
});
