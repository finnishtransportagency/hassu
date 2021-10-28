FROM openjdk:11.0-jdk
USER root
ENV NODE_VERSION=14.17.0
RUN apt install -y curl && curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} && nvm use v${NODE_VERSION} && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

RUN . "$NVM_DIR/nvm.sh" && npm install -f -g @aws-amplify/cli

COPY tools /tools
RUN cd /tools/velho && ./gradlew dependencies
