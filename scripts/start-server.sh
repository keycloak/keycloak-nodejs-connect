#!/bin/bash

. scripts/version.sh

function waitForServer {
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

if [ ! -e $ARCHIVE ]
then
  wget $URL
fi

rm -Rf $KEYCLOAK
tar xzf $ARCHIVE
sleep 1
$KEYCLOAK/bin/standalone.sh -Djava.net.preferIPv4Stack=true \
                            -Dkeycloak.migration.action=import \
                            -Dkeycloak.migration.provider=singleFile \
                            -Dkeycloak.migration.file=test/keycloak-fixture.json \
                            -Dkeycloak.migration.strategy=OVERWRITE_EXISTING > keycloak.log 2>&1 &
sleep 1
waitForServer
$KEYCLOAK/bin/add-user-keycloak.sh -r master -u admin -p admin
$KEYCLOAK/bin/jboss-cli.sh --connect command=:reload
waitForServer