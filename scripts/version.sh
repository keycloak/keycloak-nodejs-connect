#!/bin/bash

export VERSION=`curl -s http://www.keycloak.org | grep -i version | head -n1 | grep -o "'.*'" | sed -e "s/'//g"`
export KEYCLOAK="keycloak-${VERSION}"
