#!/bin/bash

. scripts/version.sh

set -v

function waitForServer {
  # Give the server some time to start up. Look for a well-known
  # bit of text in the log file. Try at most 50 times before giving up.
  C=50
  while [ $C -gt 0 ]
  do
    grep "Keycloak ${VERSION} (WildFly Core 2.0.10.Final) started" keycloak.log
    if [ $? -eq 0 ]; then
      echo "Server started."
      C=0
    else
      echo -n "."
      C=$(( $C - 1 ))
    fi
    sleep 1
  done
}

ARCHIVE="${KEYCLOAK}.tar.gz"
URL="http://downloads.jboss.org/keycloak/${VERSION}/${ARCHIVE}"

# Download keycloak server if we don't already have it
if [ ! -e $KEYCLOAK ]
then
  wget $URL
  tar xzf $ARCHIVE
  rm -f $ARCHIVE
fi

# Start the server
$KEYCLOAK/bin/standalone.sh -Djava.net.preferIPv4Stack=true \
                            -Dkeycloak.migration.action=import \
                            -Dkeycloak.migration.provider=singleFile \
                            -Dkeycloak.migration.file=test/fixtures/keycloak-fixture.json \
                            -Dkeycloak.migration.strategy=OVERWRITE_EXISTING > keycloak.log 2>&1 &

waitForServer