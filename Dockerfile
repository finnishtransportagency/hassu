FROM public.ecr.aws/lambda/nodejs:20 AS nodesource

FROM public.ecr.aws/amazoncorretto/amazoncorretto:17-al2023
ENV PATH="$PATH:/var/lang/bin"
COPY --from=nodesource /var/lang /var/lang

USER root
RUN npm install -g npm@10.8.2
RUN npm install -f -g @aws-amplify/cli@12.10.1 && amplify

# Docker + Compose v2
RUN dnf install -y docker containerd
RUN mkdir -p /usr/local/lib/docker/cli-plugins && \
    curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-$(uname -m) \
        -o /usr/local/lib/docker/cli-plugins/docker-compose && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Vaihda täyteen curliin (syy: legacy), saattaa olla että minimal riittäisi..
# asenna tarvittavat paketit
# Tarvitaankohan python3 ja liittyviä paketteja missään? Docker compose v2 on Go binääri..
# Jätetään legacy syystä toistaiseksi python
RUN dnf swap -y curl-minimal curl && \
    dnf install -y tar gzip python3 python3-pip python3-setuptools git unzip jq findutils procps

# Asenna AWS CLI v2
RUN if [ "$(uname -m)" == "x86_64" ]; then \
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"; \
    else \
        curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"; \
    fi && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws && \
    aws --version

# Asenna Chrome (x86_64 only) + chrony
RUN if [ "$(uname -m)" == "x86_64" ]; then \
        dnf install -y xorg-x11-server-Xvfb wget ca-certificates xdg-utils openssl chrony && \
        systemctl enable chronyd || true && \
        wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm && \
        dnf install -y ./google-chrome-stable_current_*.rpm && \
        rm google-chrome-stable_current_*.rpm ; \
    fi

COPY tools /tools
RUN cd /tools/velho && ./gradlew dependencies && \
    mkdir -p /packages/tools/velho/buildSrc && \
    mv /tools/velho/.gradle /packages/tools/velho/ && \
    mv /tools/velho/buildSrc/.gradle /packages/tools/velho/buildSrc/ && \
    rm -rf tools
