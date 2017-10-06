
# `keycloak-auth-utils`

[![Build Status](https://travis-ci.org/keycloak/keycloak-nodejs-auth-utils.svg?branch=master)](https://travis-ci.org/keycloak/keycloak-nodejs-auth-utils)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)
[![Coverage Status](https://coveralls.io/repos/github/keycloak/keycloak-nodejs-auth-utils/badge.svg?branch=master)](https://coveralls.io/github/keycloak/keycloak-nodejs-auth-utils?branch=master)

Reporting security vulnerabilities
----------------------------------

If you've found a security vulnerability, please look at the [instructions on how to properly report it](http://www.keycloak.org/security.html)

Contributing
------------

Please read the [contributing guide](./CONTRIBUTING.md)

Provides grant-management utilities.

## Install

    npm install --save keycloak-auth-utils

## `GrantManager`

* Can obtain a grant through the direct API using name/password.
* Can renew any token using a `refresh_token`.
* Validates grants/tokens.

## `Grant`

Embodies `access_token`, `refresh_token` and other handiness.

## `Token`

Embodies JSON Web Token bits and checking for roles.

# Resources

* [GitHub](https://github.com/keycloak/keycloak-nodejs-auth-utils)
* [Documentation](http://keycloak.github.io/keycloak-nodejs-auth-utils)

