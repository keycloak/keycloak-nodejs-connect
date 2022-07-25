## Writing tests

When writing tests please follow the same approach as we have taken in the other tests. There are many ways to 
test software and we have chosen ours, so please appreciate that.

The main tests are provided in `test` folder. Before executing them, first make sure that the Keycloak server was started to run all the integration tests:

```bash
npm run server:start
```

Running all the tests:

```bash
npm test
```

Running specific tests:

```bash
tape test/grant-manager-spec.js
```

When developing your test depending on the feature or enhancement you are testing you may find it best to add to an
existing test, or to write a test from scratch. For the latter, we recommend finding another test that is close to what 
you need and use that as a basis.
