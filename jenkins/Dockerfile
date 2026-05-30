# =============================================================================
# jenkins/Dockerfile — Imagen Jenkins con plugins pre-instalados + JCasC
# =============================================================================

FROM jenkins/jenkins:lts

# Saltar wizard de setup inicial (JCasC proveerá la config)
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

# ---------- Plugins ----------
COPY jenkins/plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# ---------- JCasC (Configuration as Code) ----------
COPY jenkins/jenkins.yaml /usr/share/jenkins/ref/jenkins.yaml
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/jenkins.yaml
