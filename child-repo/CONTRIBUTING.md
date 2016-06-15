# Contributing to keycloak-nodejs-auth-utils

## Issue contributions

### Did you find a bug ?

Open a [new issue](https://issues.jboss.org/projects/KEYCLOAK) and be sure to include
as much relevant information as possible, and a code sample or a test case demonstrating
the expected behavior that is not occurring.

Discussions can be done via:

[User Mailing List](https://lists.jboss.org/mailman/listinfo/keycloak-user) - Mailing list to ask for help and general questions about Keycloak.

[Developer Mailing List](https://lists.jboss.org/mailman/listinfo/keycloak-dev) - Mailing list to discuss development of Keycloak.

Documentation:

[Web site docs](http://keycloak.jboss.org/docs) - User Guide, Admin REST API and Javadocs

[Git books](https://www.gitbook.com/@keycloak) - Authorization Services, Server Administration Guide, Server Developer Guide,
Server Installation and Configuration Guide, Securing Applications and Services Guide, Getting Started Guide


## Code contributions

### Create a JIRA issue

Copy with the JIRA Id e.g. KEYCLOAK-12345 to be your feature branch.

### Fork

Fork the project [on GitHub](https://github.com/keycloak/keycloak-nodejs-auth-utils)
and check out your copy locally.

```shell
$ git clone git@github.com:username/keycloak-nodejs-auth-utils.git
$ cd keycloak-nodejs-auth-utils
$ git remote add upstream https://github.com/keycloak/keycloak-nodejs-auth-utils.git
```

### Branch

Create a feature branch and start hacking:

```shell
$ git checkout -b KEYCLOAK-12345
```

### Commit messages

Writing good commit logs is important. A commit log should describe what
changed and why. Follow these guidelines when writing one:

1. The first line should be 50 characters or less and contain a short
   description of the change.
2. Keep the second line blank.
3. Wrap all other lines at 72 columns.

Example of commit message:

```
fix a bug with download url.

The download url was not using https.
Body of commit message is a few lines of text, explaining things
in more detail, possibly giving some background about the issue
being fixed, etc. etc.

The body of the commit message can be several paragraphs, and
please do proper word-wrap and keep columns shorter than about
72 characters or so. That way `git log` will show things
nicely even when it is indented.
```

### Rebase to keep updated.

Use `git rebase` to sync your work from time to time.

```shell
$ git fetch upstream
$ git rebase upstream/master
```

### Start server | Code - Test - Code - Test... | Stop server

Bug fixes and features should come with tests. Add your tests in the
`integration` or `unit` directories.

To write the tests you will need keycloak server running, so run this script:

```shell
$ ./scripts/start-server.sh
```
This will download, configure and start keycloak server.

Then you can start coding and watching the results of the tests with this command:

```shell
$ make
```

You can keep coding, testing and building with

```shell
$ make
```

Then to stop the server by running this script:

```shell
$ ./scripts/stop-server.sh
```

Make sure the jshint and semistandard are happy and that all tests pass. Please, do not submit
patches that fail either check.

### Step 6: Push

```shell
$ git push origin KEYCLOAK-12345
```

Go to https://github.com/yourusername/keycloak-nodejs-auth-utils and select your feature branch.
Click the 'Pull Request' button and fill out the form.