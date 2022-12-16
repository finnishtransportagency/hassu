FROM public.ecr.aws/amazoncorretto/amazoncorretto:11
USER root
RUN amazon-linux-extras install docker -y

RUN yum update -y && yum install -y tar gzip python3 curl git && pip3 install --upgrade awscli && pip3 install docker-compose

RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=14.17.0
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} && nvm use v${NODE_VERSION} && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN . "$NVM_DIR/nvm.sh" && npm install -g npm@8.3.2
RUN . "$NVM_DIR/nvm.sh" && npm install -f -g @aws-amplify/cli && amplify

RUN yum install -y xorg-x11-server-Xvfb.x86_64 wget ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
        libatspi2.0-0 libcups2 libdbus-1-3 libgbm1 libgtk-3-0 libnspr4 libnss3 \
        libxcomposite1 libxkbcommon0 libxrandr2 xdg-utils ntpdate openssl

RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm \
    && yum install -y ./google-chrome-stable_current_*.rpm \
    && rm google-chrome-stable_current_*.rpm

COPY tools /tools
RUN cd /tools/velho && ./gradlew dependencies && \
    mkdir -p /packages/tools/velho/buildSrc && \
    mv /tools/velho/.gradle /packages/tools/velho/ && \
    mv /tools/velho/buildSrc/.gradle /packages/tools/velho/buildSrc/ && \
    rm -rf tools
