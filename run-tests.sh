#!/bin/bash -e

TEST_DIR=test_results

run_tests() {
  FILE_PATH=$1
  mkdir -p ${TEST_DIR}

  echo "------------------------------------"
  echo "Running tests for file: ${FILE_PATH}"
  echo -e "------------------------------------\n"

  if [[ -f ${FILE_PATH} ]]; then
    TEST_NAME="${FILE_PATH##*/}"

    node ${FILE_PATH} | tee ${TEST_DIR}/${TEST_NAME}.txt
    cat ${TEST_DIR}/${TEST_NAME}.txt | node ./node_modules/.bin/tap-xunit --package="${TEST_NAME}" > ${TEST_DIR}/${TEST_NAME}.xml
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
