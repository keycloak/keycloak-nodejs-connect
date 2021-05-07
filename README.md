# Keycloak Node.js Adapter

[![Build Status](https://travis-ci.org/keycloak/keycloak-nodejs-connect.svg?branch=master)](https://travis-ci.org/keycloak/keycloak-nodejs-connect)
[![Dependency Status](https://img.shields.io/david/keycloak/keycloak-nodejs-connect.svg?style=flat-square)](https://david-dm.org/keycloak/keycloak-nodejs-connect)
[![Coverage Status](https://coveralls.io/repos/github/keycloak/keycloak-nodejs-connect/badge.svg?branch=master)](https://coveralls.io/github/keycloak/keycloak-nodejs-connect?branch=master)

Keycloak is an Open Source Identity and Access Management solution for modern Applications and Services.

This repository contains the source code for the Keycloak Node.js adapter. This module makes it simple to implement a Node.js Connect-friendly
application that uses Keycloak for its authentication and authorization needs.

## Help and Documentation

* [Documentation](https://www.keycloak.org/documentation.html)
* [User Mailing List](https://groups.google.com/d/forum/keycloak-user) - Mailing list for help and general questions about Keycloak
* [JIRA](https://issues.jboss.org/projects/KEYCLOAK) - Issue tracker for bugs and feature requests

## Reporting Security Vulnerabilities

If you've found a security vulnerability, please look at the [instructions on how to properly report it](http://www.keycloak.org/security.html)

## Reporting an issue

If you believe you have discovered a defect in the Node.js adapter please open an issue in our [Issue Tracker](https://issues.jboss.org/projects/KEYCLOAK).
Please remember to provide a good summary, description as well as steps to reproduce the issue.

## Use the NodeJS Package

To run Node.js adapter examples please try one of our [quickstarts](https://github.com/keycloak/keycloak-quickstarts.git).

For more details refer to the [Keycloak Documentation](https://www.keycloak.org/documentation.html).

## Building from source

Ensure you have Node.js 10.0.0 or newer and Git installed. Run the following commands to find their versions:

    node --version
    git --version

Note: NodeJS >= 10 is required due to Node tape package requirment. 

First clone the Node.js adapter repository:

    git clone https://github.com/keycloak/keycloak-nodejs-connect.git
    cd keycloak-nodejs-connect

To install the package dependencies run the following:

    npm install
    or
    yarn install

To build the package tgz run the following command:

    npm pack
    or
    yarn pack

You can then use the tgz for any application development to test your changes before creating a pull request.

## Working with the codebase

To ensure there is a consistent code quality, which currenty does very few rules, before submitting any pull request, please run the following:

    npm lint
    or
    yarn lint

If your changes require introducing new dependencies or updating dependency versions please discuss this first on the
dev mailing list. We do not accept new dependencies to be added lightly, so try to use what is available.

### Unit/Integration Test

## Writing tests

When writing tests please follow the same approach as we have taken in the other tests. There are many ways to
test software and we have chosen ours, so please appreciate that.

The main tests are provided in `test` folder. Before executing them, first make sure that the Keycloak server was started to run all the integration tests:

    make up

NOTES:

* On Windows to install make and other Unix utilites install GOW,  <https://github.com/bmatzelle/gow/releases>
* ***The docker confguration has TBA TBA TBA***

Running the tests:

    npm test
    or
    yarn test

Running specific tests:
    ./node_modules/.bin/tape test/grant-manager-spec.js

When developing your test depending on the feature or enhancement you are testing you may find it best to add to an
existing test, or to write a test from scratch. For the latter, we recommend finding another test that is close to what
you need and use that as a basis.

If you need to power off your compter and want to continue testing later run the following command to stop docker containers:

    make stop

After you have finished testing run the following command to remove the docker containers:

    make down

## Contributing

Please read ***<https://github.com/keycloak/keycloak/blob/master/CONTRIBUTING.md>*** and follow these guidelines when contributing to Keycloak

## Other Keycloak Projects

* [Keycloak](https://github.com/keycloak/keycloak) - Keycloak Server and Java adapters
* [Keycloak Documentation](https://github.com/keycloak/keycloak-documentation) - Documentation for Keycloak
* [Keycloak QuickStarts](https://github.com/keycloak/keycloak-quickstarts) - QuickStarts for getting started with Keycloak
* [Keycloak Docker](https://github.com/jboss-dockerfiles/keycloak) - Docker images for Keycloak
* [Keycloak Node.js Admin Client](https://github.com/keycloak/keycloak-nodejs-admin-client) - Node.js library for Keycloak Admin REST API

## License

* [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
