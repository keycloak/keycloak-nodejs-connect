#!/bin/bash -e

#tape test/unit/*.js

if [ "$1" == "group1" ]; then
  tape test/"!(*enforcer-spec*)".js 
fi

if [ "$1" == "group2" ]; then
  tape test/*enforcer-spec*.js 
fi

if [ -z "$1" ]; then
  tape test/"!(*enforcer-spec*)".js 
  tape test/*enforcer-spec*.js 
fi 
