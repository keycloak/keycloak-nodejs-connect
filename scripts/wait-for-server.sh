
# For debugging purposes to make sure the image was started
counter=0
printf 'Waiting for Keycloak server to start'
until $(curl --output /dev/null --silent --head --fail http://localhost:8080/realms/master/.well-known/openid-configuration); do
    printf '.'
    sleep 5
    if [[ "$counter" -gt 24 ]]; then
      printf "Keycloak server failed to start. Timeout!"
      exit 1
    fi
    counter=$((counter+1))
done
