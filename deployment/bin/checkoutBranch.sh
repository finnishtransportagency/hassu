#!/usr/bin/env bash

# CodeBuildissa git on "detached head"-tilassa, jolloin semantic-release ei osaa tehdä release noteseja oikein, eikä osaa lisätä versiotagia
if [ "$ENVIRONMENT" = "test" ] || [ "$ENVIRONMENT" = "training" ] || [ "$ENVIRONMENT" = "prod" ]; then
  git checkout "$ENVIRONMENT"
fi
