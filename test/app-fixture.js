'use strict';

const Keycloak = require('../index');
const express = require('express');
const session = require('express-session');
const fs = require('fs');

let app = express();
let kc = null;

let kcConfig = {
  'realm': 'Examples',
  'auth-server-url': 'http://localhost:8080/auth',
  'realm-public-key': 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrVrCuTtArbgaZzL1hvh0xtL5mc7o0NqPVnYXkLvgcwiC3BjLGw1tGEGoJaXDuSaRllobm53JBhjx33UNv+5z/UMG4kytBWxheNVKnL6GgqlNabMaFfPLPCF8kAgKnsi79NMo+n6KnSY8YeUmec/p2vjO2NjsSAVcWEQMVhJ31LwIDAQAB',
  'ssl-required': 'external',
  'resource': 'app-jee',
  'credentials': {
    'secret': '7dfad209-79a0-4103-856c-d021ab7a052b'
  }
};

let memoryStore = new session.MemoryStore();

app.use(session({
  secret: '7dfad209-79a0-4103-856c-d021ab7a052b',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

kc = new Keycloak({store: memoryStore}, kcConfig);

app.use(kc.middleware({
  logout: '/logout',
  admin: '/callbacks'
}));

app.get('/', (req, res) => {
  res.status(200).json({ name: 'unprotected' });
});

app.get('/public-client/', (req, res) => {
  res.status(200).json({ name: 'public-client' });
});

app.get('/complain', kc.protect(), (req, res) => {
  res.status(200).json({ foo: 'bar' });
});

app.get('/complain2', kc.protect('special'), (req, res) => {
  res.status(200).json({ foo: 'bar' });
});

app.get('/login', kc.protect(), (req, res) => {
  res.json(JSON.stringify(JSON.parse(req.session['keycloak-token'])));
});

app.listen(3000, function () {
  console.log('app listening on port 3000');
  console.log(process.pid);
  fs.writeFile('./pid.txt', process.pid, (error) => {
    if (error) return console.error(error);
  });
});
