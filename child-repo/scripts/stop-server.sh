#!/bin/bash

. scripts/version.sh

${KEYCLOAK}/bin/jboss-cli.sh --connect command=:shutdown
