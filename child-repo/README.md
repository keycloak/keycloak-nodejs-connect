
# `keycloak-auth-utils`

[![Build Status](https://travis-ci.org/keycloak/keycloak-nodejs-auth-utils.svg?branch=master)](https://travis-ci.org/keycloak/keycloak-nodejs-auth-utils)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

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

# Contributing

* [User Mailing List](https://lists.jboss.org/mailman/listinfo/keycloak-user) - Mailing list to ask for help and general questions about Keycloak
* [JIRA](https://issues.jboss.org/projects/KEYCLOAK) - Issue tracker for bugs and feature requests

# Resources

* [GitHub](https://github.com/keycloak/keycloak-nodejs-auth-utils)
* [Documentation](http://keycloak.github.io/keycloak-nodejs-auth-utils)
