#!/bin/bash -e

run_tests() {
  FILE_PATH=$1

  echo "------------------------------------"
  echo "Running tests for file: ${FILE_PATH}"
  echo -e "------------------------------------\n"

  if [[ -f ${FILE_PATH} ]]; then

    node ${FILE_PATH}
    RET_VAL=$?

    echo "------------------------------------"
    echo "Tests for file ${FILE_PATH} finished with return value ${RET_VAL}"
    echo -e "------------------------------------\n"

    if [[ ${RET_VAL} -ne 0 ]]; then
      exit 1
    fi
  else
    echo "------------------------------------"
    echo "Test file ${FILE_PATH} does not exists! Aborting tests execution."
    echo "------------------------------------"
    exit 2
  fi
}


if [[ "$1" == "group1" ]]; then
  for i in `ls test/*.js | grep -v "enforcer-spec"`; do run_tests ${i}; done
fi

if [[ "$1" == "group2" ]]; then
  for i in `ls test/*.js | grep "enforcer-spec"`; do run_tests ${i}; done
fi

if [[ -z "$1" ]]; then
  for i in `ls test/*.js`; do run_tests ${i}; done
fi
