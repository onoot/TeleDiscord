# Установка переменных
$PROJECT_ID = "teleport-450320"
$REGION = "europe-central2"
$ZONE = "europe-central2-b"
$CLUSTER_NAME = "messenger-cluster"
$REGISTRY_HOST = "gcr.io"

# Список сервисов для сборки
$SERVICES = @(
    "user-service",
    "message-service",
    "call-service",
    "channel-service",
    "notification-service",
    "swagger-service"
)

# Подключение к GKE кластеру
Write-Host "Connecting to GKE cluster..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION --project $PROJECT_ID

# Настройка Docker для работы с GCR
Write-Host "Configuring Docker for GCR..."
gcloud auth configure-docker $REGISTRY_HOST -q

# Сборка и пуш образов
foreach ($SERVICE in $SERVICES) {
    Write-Host "Building $SERVICE..."
    docker build -t "$REGISTRY_HOST/$PROJECT_ID/$SERVICE`:latest" "./src/services/$SERVICE"
    
    Write-Host "Pushing $SERVICE to GCR..."
    docker push "$REGISTRY_HOST/$PROJECT_ID/$SERVICE`:latest"
}

# Обновление image в deployment файлах
foreach ($SERVICE in $SERVICES) {
    Write-Host "Updating image in $SERVICE deployment..."
    $content = Get-Content "kubernetes/$SERVICE.yaml"
    $content = $content -replace "image: .*$SERVICE`:latest", "image: $REGISTRY_HOST/$PROJECT_ID/$SERVICE`:latest"
    $content | Set-Content "kubernetes/$SERVICE.yaml"
}

# Создание namespace если не существует
Write-Host "Creating namespace..."
kubectl create namespace messenger --dry-run=client -o yaml | kubectl apply -f -

# Применение ConfigMaps и Secrets
Write-Host "Applying ConfigMaps and Secrets..."
kubectl apply -f kubernetes/config/
kubectl apply -f kubernetes/secrets/

# Применение Traefik
Write-Host "Applying Traefik configuration..."
kubectl apply -f kubernetes/traefik-deployment.yaml
kubectl apply -f kubernetes/traefik-service.yaml

# Применение сервисов
Write-Host "Deploying services..."
foreach ($SERVICE in $SERVICES) {
    Write-Host "Deploying $SERVICE..."
    kubectl apply -f "kubernetes/$SERVICE.yaml"
}

# Применение Ingress
Write-Host "Applying Ingress configuration..."
kubectl apply -f kubernetes/ingress.yaml

# Проверка статуса
Write-Host "Checking deployment status..."
kubectl get pods -n messenger
kubectl get svc -n messenger
kubectl get ingress -n messenger 