pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        AWS_DEFAULT_REGION = "${env.AWS_DEFAULT_REGION ?: 'ap-southeast-1'}"
        AWS_REGION         = "${env.AWS_REGION ?: 'ap-southeast-1'}"
    }

    stages {
        stage('🔍 Check Branch') {
            steps {
                script {
                    def currentBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    echo "📌 Current Branch: ${currentBranch}"
                }
            }
        }

        stage('🧪 Run Unit Tests') {
            steps {
                echo "🚀 Menjalankan Unit Testing dengan Jest..."
                sh '''
                    # Jalankan unit test di dalam container node:24-alpine
                    docker run --rm \
                        -u $(id -u):$(id -g) \
                        --volumes-from global-jenkins-cicd \
                        -w ${WORKSPACE} \
                        node:24-alpine \
                        sh -c "npm ci && npm test"
                '''
            }
            post {
                always {
                    sh '''
                        docker run --rm \
                            --volumes-from global-jenkins-cicd \
                            -w ${WORKSPACE} \
                            node:24-alpine \
                            rm -rf node_modules || true
                    '''
                }
                success {
                    echo "✅ Semua Unit Test LULUS! Melanjutkan ke proses deployment..."
                }
                failure {
                    echo "❌ Unit Test GAGAL! Deployment dibatalkan demi keamanan."
                }
            }
        }
        
        stage('📥 Load Environment (.env)') {
            when {
                expression {
                    def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    return branch.contains('development') || branch.contains('dev') ||
                           branch.contains('production') || branch.contains('prod')
                }
            }
            steps {
                echo "Mengambil konfigurasi .env dari Jenkins Credentials (ID: ENV-AUTH-SERVICE-GEOSANDBOX)..."
                withCredentials([file(credentialsId: 'ENV-AUTH-SERVICE-GEOSANDBOX', variable: 'SECRET_ENV_FILE')]) {
                    sh '''
                        # Salin file .env ke root dan masing-masing folder environment terraform
                        cp "$SECRET_ENV_FILE" .env
                        cp "$SECRET_ENV_FILE" terraform/dev/.env
                        cp "$SECRET_ENV_FILE" terraform/prod/.env
                        chmod 600 .env terraform/dev/.env terraform/prod/.env
                        echo "✅ File .env berhasil disiapkan untuk dev dan prod."
                    '''
                }
            }
        }

        stage('🐳 Deploy Development (Local Docker)') {
            when {
                expression {
                    def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    return branch.contains('development') || branch.contains('dev')
                }
            }
            steps {
                echo "🚀 Menjalankan deployment DEVELOPMENT ke Docker Container Lokal (terraform/dev)..."
                sh '''
                    # Hentikan & hapus container lama jika masih ada agar tidak conflict nama container
                    docker rm -f auth_service_app || true

                    terraform -chdir=terraform/dev init -no-color
                    terraform -chdir=terraform/dev validate -no-color
                    terraform -chdir=terraform/dev plan -out=tfplan -no-color
                    terraform -chdir=terraform/dev apply -auto-approve tfplan -no-color
                '''
            }
            post {
                always {
                    sh 'rm -f terraform/dev/tfplan || true'
                }
                success {
                    echo "🎉 Deployment DEVELOPMENT Berhasil! Container auth_service_app aktif di Docker lokal."
                }
            }
        }

        stage('☁️ Deploy Production (AWS EC2)') {
            when {
                expression {
                    def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    return branch.contains('production') || branch.contains('prod')
                }
            }
            steps {
                echo "🚀 Menjalankan deployment PRODUCTION ke AWS via terraform/prod..."
                sh '''
                    terraform -chdir=terraform/prod init -no-color
                    terraform -chdir=terraform/prod validate -no-color
                    terraform -chdir=terraform/prod plan -out=tfplan -no-color
                    terraform -chdir=terraform/prod apply -auto-approve tfplan -no-color
                '''
            }
            post {
                always {
                    sh 'rm -f terraform/prod/tfplan || true'
                }
                success {
                    echo "🎉 Deployment PRODUCTION Berhasil! Instance EC2 AWS telah aktif."
                    sh 'terraform -chdir=terraform/prod output || true'
                }
            }
        }
    }

    post {
        failure {
            echo "❌ Pipeline Gagal! Silakan cek log console di atas."
        }
    }
}
