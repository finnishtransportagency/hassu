#!/usr/bin/env bash
set -e

# Run an individual test suite if the TEST_SUITE environmental variable is set.
if [ -z "$TEST_SUITE" ]; then
    TEST_SUITE=""
fi

export DOCKER=false
CMD="robot --console verbose --outputdir ./test/.report ./test/suites/$TEST_SUITE"

echo ${CMD}

``${CMD}``
