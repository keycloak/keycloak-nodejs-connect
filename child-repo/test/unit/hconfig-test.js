'use strict';

const Config = require('../../index').Config;

const test = require('tape');

test('Config#configure', (t) => {
  let cfg = new Config({'realm': 'test-realm'});

  t.equal(cfg.realm, 'test-realm');
  t.end();
});

test('Config#configure with boolean', (t) => {
  let cfg = new Config({'public': true});

  t.equal(cfg.public, true);
  t.end();
});

test('Config#configure with env variable reference not set', (t) => {
  let cfg = new Config({'realm': '${env.NOT_SET}'});

  t.equal(cfg.realm, '');
  t.end();
});

test('Config#configure with env variable reference not set with fallback', (t) => {
  let cfg = new Config({'realm': '${env.NOT_SET:fallback}'});

  t.equal(cfg.realm, 'fallback');
  t.end();
});

test('Config#configure with env variable reference set', (t) => {
  let cfg = new Config({'realm': '${env.USER}'});

  t.equal(cfg.realm, process.env.USER);
  t.end();
});

test('Config#configure with env variable reference set with fallback', (t) => {
  let cfg = new Config({'realm': '${env.USER:fallback}'});

  t.equal(cfg.realm, process.env.USER);
  t.end();
});
