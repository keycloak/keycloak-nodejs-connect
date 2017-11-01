# From http://lists.jboss.org/pipermail/keycloak-user/2016-April/005869.html

KC_REALM=nodejs-test
KC_CLIENT=confidential-client
KC_CLIENT_SECRET=62b8de48-672e-4287-bb1e-6af39aec045e
KC_SERVER=localhost:8080
KC_CONTEXT=auth

# Request Tokens for credentials
KC_RESPONSE=$( \
   curl -k -v -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d 'grant_type=client_credentials' \
        -d "client_id=$KC_CLIENT" \
        -d "client_secret=$KC_CLIENT_SECRET" \
        "http://$KC_SERVER/$KC_CONTEXT/realms/$KC_REALM/protocol/openid-connect/token" | jq .
)

KC_ACCESS_TOKEN=$(echo $KC_RESPONSE| jq -r .access_token)
KC_ID_TOKEN=$(echo $KC_RESPONSE| jq -r .id_token)
KC_REFRESH_TOKEN=$(echo $KC_RESPONSE| jq -r .refresh_token)

echo $KC_RESPONSE | jq .

## Introspect Keycloak Request Token
curl -k -v -X POST \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=$KC_CLIENT" \
     -d "client_secret=$KC_CLIENT_SECRET" \
     -d "token=$KC_ACCESS_TOKEN" \
     "http://$KC_SERVER/$KC_CONTEXT/realms/$KC_REALM/protocol/openid-connect/token/introspect" | jq .