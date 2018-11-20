#!/bin/bash -e

VERSION=$1
NPM_VERSION=`echo $VERSION | sed 's/.Final//' | sed 's/.CR/-cr./' | sed 's/.Beta/-beta./' | sed 's/.Alpha/-alpha./'`

sed -i 's/"version": .*/"version": "'$NPM_VERSION'",/' package.json
mvn -f product/pom.xml versions:set -DnewVersion=$NPM_VERSION -DgenerateBackupPoms=false
