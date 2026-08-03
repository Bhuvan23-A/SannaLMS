FROM eclipse-temurin:17-jre-jammy

ENV KEYCLOAK_VERSION=22.0.1

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Download and install Keycloak
RUN curl -L https://github.com/keycloak/keycloak/releases/download/${KEYCLOAK_VERSION}/keycloak-${KEYCLOAK_VERSION}.tar.gz | tar -xz -C /opt && \
    mv /opt/keycloak-${KEYCLOAK_VERSION} /opt/keycloak

WORKDIR /opt/keycloak

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
