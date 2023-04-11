FROM public.ecr.aws/amazoncorretto/amazoncorretto:11
ARG NODE_VERSION
USER root
RUN amazon-linux-extras install docker -y

RUN yum update -y && yum install -y tar gzip python3 curl git unzip && pip3 install docker-compose

RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && mkdir -p /root/.nvm/versions/node/current && ln -s /root/.nvm/versions/node/`node -v`/bin /root/.nvm/versions/node/current/bin
ENV PATH="/root/.nvm/versions/node/current/bin/:${PATH}"
RUN . "$NVM_DIR/nvm.sh" && npm install -g npm@8.3.2
RUN . "$NVM_DIR/nvm.sh" && npm install -f -g @aws-amplify/cli && amplify

RUN if [ "$(uname -m)" == "x86_64" ]; then curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"; else curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"; fi && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws && \
    aws --version

RUN if [ "$(uname -m)" == "x86_64" ]; then yum install -y xorg-x11-server-Xvfb.x86_64 wget ca-certificates xdg-utils ntpdate openssl \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm \
    && yum install -y ./google-chrome-stable_current_*.rpm \
    && rm google-chrome-stable_current_*.rpm ; fi

COPY tools /tools
RUN cd /tools/velho && ./gradlew dependencies && \
    mkdir -p /packages/tools/velho/buildSrc && \
    mv /tools/velho/.gradle /packages/tools/velho/ && \
    mv /tools/velho/buildSrc/.gradle /packages/tools/velho/buildSrc/ && \
    rm -rf tools
