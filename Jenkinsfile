// =============================================================================
// Jenkinsfile — Pipeline CI/CD declarativo
// =============================================================================
// Requisitos del agente Jenkins:
//   - Docker instalado
//   - Plugin "Docker Pipeline"
//   - Usuario jenkins en grupo docker
// =============================================================================

pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'absa-movie-insights'
        DOCKER_BUILDKIT        = '1'
        BACKEND_PORT           = '8001'
        FRONTEND_PORT          = '5174'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        // -------------------------------------------------------------------
        stage('Checkout') {
            steps {
                script {
                    echo 'Checkout del repositorio completado.'
                }
            }
        }

        // -------------------------------------------------------------------
        stage('Lint & Validar') {
            parallel {
                stage('Backend Python') {
                    steps {
                        script {
                            echo 'Ejecutando flake8 / black / mypy...'
                            // En un pipeline real, instalar y correr linters:
                            // sh '''
                            //   python -m pip install flake8 black
                            //   flake8 backend/app --max-line-length=100
                            //   black --check backend/app
                            // '''
                        }
                    }
                }
                stage('Frontend JavaScript') {
                    steps {
                        script {
                            echo 'Ejecutando ESLint...'
                            // sh '''
                            //   cd frontend && pnpm install && pnpm lint
                            // '''
                        }
                    }
                }
            }
        }

        // -------------------------------------------------------------------
        stage('Build Docker Images') {
            steps {
                script {
                    echo 'Construyendo imágenes Docker (sin caché)...'
                    sh '''
                        docker compose -f docker-compose.yml build --no-cache
                    '''
                }
            }
        }

        // -------------------------------------------------------------------
        stage('Desplegar Stack') {
            steps {
                script {
                    echo 'Limpiando stack anterior...'
                    sh '''
                        docker compose -f docker-compose.yml down --remove-orphans --timeout 10 || true
                        docker rm -f absa-backend absa-frontend 2>/dev/null || true
                        docker compose -f docker-compose.yml rm -fsv 2>/dev/null || true
                    '''

                    echo 'Levantando servicios con docker compose...'
                    sh '''
                        docker compose -f docker-compose.yml up -d --force-recreate
                    '''
                }
            }
        }

        // -------------------------------------------------------------------
        stage('Smoke Tests') {
            steps {
                script {
                    echo 'Esperando healthcheck del backend...'
                    sh '''
                        timeout 45 sh -c '
                            until curl -sf http://localhost:${BACKEND_PORT}/api/v1/summary; do
                                echo "Esperando backend en puerto ${BACKEND_PORT}..."
                                sleep 2
                            done
                        '
                    '''

                    echo 'Verificando frontend...'
                    sh '''
                        curl -sf http://localhost:${FRONTEND_PORT} || exit 1
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                echo 'Pipeline finalizado.'
                // En un pipeline real:
                // - Enviar notificación a Slack/Teams
                // - Publicar reportes de cobertura
                // - Limpiar imágenes dangling si es necesario
            }
        }
        success {
            echo 'Despliegue exitoso.'
        }
        failure {
            echo 'El pipeline falló. Revisar logs.'
            sh '''
                docker compose -f docker-compose.yml logs --tail=50 backend || true
                docker compose -f docker-compose.yml logs --tail=50 frontend || true
            '''
        }
    }
}
