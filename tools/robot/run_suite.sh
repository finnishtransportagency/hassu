#!/usr/bin/env bash
set -e

# Run an individual test suite if the TEST_SUITE environmental variable is set.
if [ -z "$TEST_SUITE" ]; then
    TEST_SUITE=""
fi

export DOCKER=true
CMD="robot --console verbose --outputdir /work/test/.report --xunit xunit.xml /work/test/suites/$TEST_SUITE"

echo ${CMD}

``${CMD}``
