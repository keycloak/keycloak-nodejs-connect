#Basic NodeJS Example
========================

##Start and configure Keycloak
----------------------------

###Start Keycloak:

```
/<Path-To-Keycloak>/bin/standalone.sh
```

Open the Keycloak admin console, click on Add Realm, click on 'Choose a JSON file', 
select nodejs-example-realm.json and click Upload.

Link the HEAD code of keycloak-connect by running:

```
npm link ../
```

Install the dependencies and start NodeJS example by running:

```
npm install
npm start
```

Open the browser at http://localhost:3000/ and login with username: 'user', and password: 'password'.
