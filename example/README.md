#Basic NodeJS Example
========================

##Start and configure Keycloak
----------------------------

###Start Keycloak:

```
/<Path-To-Keycloak>/bin/standalone.sh
```

Open the Keycloak admin console, click on Add Realm, click on 'Choose a JSON file', select nodejs-example-realm.json and click Upload.

Start NodeJS Example by running:

```
npm start
```

Open the browser at http://localhost:3000/ and login with username: 'user', and password: 'password'.
