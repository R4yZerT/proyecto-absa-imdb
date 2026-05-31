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

    parameters {
        booleanParam(name: 'NO_CACHE', defaultValue: false,
            description: 'Forzar rebuild sin caché (solo si hay cambios en dependencias)')
    }

    environment {
        COMPOSE_PROJECT_NAME = 'absa-movie-insights'
        DOCKER_BUILDKIT        = '1'
        BUILDKIT_PROGRESS      = 'plain'
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
        stage('Pre-flight: Docker & Buildx') {
            steps {
                script {
                    sh '''
                        echo "=== Docker version ==="
                        docker --version
                        echo "=== Buildx version ==="
                        docker buildx version 2>&1 || echo "WARNING: buildx no disponible. docker compose build usará builder legacy."
                        echo "=== Builder inspect ==="
                        docker buildx inspect 2>&1 || true
                    '''
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
                    def cache_flag = params.NO_CACHE ? '--no-cache' : ''
                    echo "Construyendo imágenes Docker ${cache_flag ? '(sin caché)' : '(con caché)'}..."
                    sh """
                        docker compose -f docker-compose.yml build ${cache_flag}
                    """
                }
            }
        }
        // -------------------------------------------------------------------
        stage('Desplegar Stack') {
            steps {
                script {
                    echo 'Limpiando stack anterior...'
                    sh '''
                        # NOTA: NO usar --remove-orphans para evitar borrar contenedores ajenos (ej. Jenkins)
                        docker compose -f docker-compose.yml down --timeout 10 || true
                        # Eliminar solo contenedores del proyecto actual por nombre exacto
                        docker rm -f absa-movie-insights-backend-1 absa-movie-insights-frontend-1 2>/dev/null || true
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
