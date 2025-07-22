FROM public.ecr.aws/lambda/nodejs:20 AS nodesource

FROM public.ecr.aws/amazoncorretto/amazoncorretto:11
ENV PATH="$PATH:/var/lang/bin"
COPY --from=nodesource /var/lang /var/lang

USER root
RUN npm install -g npm@10.8.2
RUN npm install -f -g @aws-amplify/cli@12.10.1 && amplify

RUN amazon-linux-extras install docker -y

RUN yum update -y
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm

RUN yum install -y tar gzip python3 curl git unzip jq && pip3 install docker-compose && pip3 install --upgrade urllib3==1.26.15

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
