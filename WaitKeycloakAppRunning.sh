#!/bin/bash

# For Travic CI wait until the Keycloak app has finished setting up before exiting this script
counter=0
printf 'Waiting for Keycloak server to start'
until $(curl --output /dev/null --silent --head --fail http://localhost:8080/auth/realms/master/account); do
    printf '.'
    sleep 10
    if [[ "$counter" -gt 30 ]]; then
      printf "Keycloak server failed to start. Timeout!"
      exit 1
    fi
    counter=$((counter+1))
done