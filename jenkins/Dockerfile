# =============================================================================
# jenkins/Dockerfile — Imagen Jenkins con plugins pre-instalados + JCasC
# =============================================================================

FROM jenkins/jenkins:lts

# Saltar wizard de setup inicial (JCasC proveerá la config)
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

# ---------- Docker CLI (para docker-outside-of-docker) ----------
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && chmod a+r /etc/apt/keyrings/docker.gpg \
  && echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null \
  && apt-get update \
  && apt-get install -y --no-install-recommends docker-ce-cli \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# ---------- Plugins ----------
COPY jenkins/plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# ---------- JCasC (Configuration as Code) ----------
COPY jenkins/jenkins.yaml /usr/share/jenkins/ref/jenkins.yaml
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/jenkins.yaml
