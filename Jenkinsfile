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
                    echo 'Construyendo imágenes Docker...'
                    sh '''
                        docker compose -f docker-compose.yml build
                    '''
                }
            }
        }

        // -------------------------------------------------------------------
        stage('Desplegar Stack') {
            steps {
                script {
                    echo 'Limpiando stack anterior y liberando puertos...'
                    sh '''
                        # 1. Bajar stack completo (incluye redes, volúmenes huérfanos y timeout forzado)
                        docker compose -f docker-compose.yml down --remove-orphans --timeout 10 || true
                        # 2. Eliminar contenedores huérfanos por nombre
                        docker rm -f absa-backend absa-frontend 2>/dev/null || true
                        docker compose -f docker-compose.yml rm -fsv 2>/dev/null || true
                        # 3. Liberar puertos 8000 y 5173 en el host (si un proceso no-Docker los mantiene)
                        fuser -k 8000/tcp 2>/dev/null || true
                        fuser -k 5173/tcp 2>/dev/null || true
                        # 4. Esperar a que Docker suelte el binding de red
                        sleep 3
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
                    echo 'Esperando que los servicios estén listos...'
                    sh 'sleep 15'

                    echo 'Testeando backend...'
                    sh '''
                        curl -sf http://localhost:8000/api/v1/summary \
                          || (echo "Backend no responde"; exit 1)
                    '''

                    echo 'Testeando frontend...'
                    sh '''
                        curl -sf http://localhost:5173 \
                          || (echo "Frontend no responde"; exit 1)
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
