#!/bin/bash

. build/version.sh

${KEYCLOAK}/bin/jboss-cli.sh --connect command=:shutdown