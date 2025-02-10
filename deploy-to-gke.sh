#!/bin/bash

# Установка переменных
# GCP Project Configuration
PROJECT_ID="teleport-450320"
REGION="europe-central2"
ZONE="europe-central2-b"
CLUSTER_NAME="messenger-cluster"
REGISTRY_HOST="gcr.io"

# Список сервисов для сборки
SERVICES=(
    "user-service"
    "message-service"
    "call-service"
    "channel-service"
    "notification-service"
    "swagger-service"
)

# Подключение к GKE кластеру
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION --project $PROJECT_ID

# Настройка Docker для работы с GCR
gcloud auth configure-docker $REGISTRY_HOST -q

# Сборка и пуш образов
for SERVICE in "${SERVICES[@]}"; do
    echo "Building $SERVICE..."
    docker build -t $REGISTRY_HOST/$PROJECT_ID/$SERVICE:latest ./src/services/$SERVICE
    echo "Pushing $SERVICE to GCR..."
    docker push $REGISTRY_HOST/$PROJECT_ID/$SERVICE:latest
done

# Обновление image в deployment файлах
for SERVICE in "${SERVICES[@]}"; do
    echo "Updating image in $SERVICE deployment..."
    sed -i "s|image: .*$SERVICE:latest|image: $REGISTRY_HOST/$PROJECT_ID/$SERVICE:latest|g" kubernetes/$SERVICE.yaml
done

# Создание namespace если не существует
kubectl create namespace messenger --dry-run=client -o yaml | kubectl apply -f -

# Применение ConfigMaps и Secrets
echo "Applying ConfigMaps and Secrets..."
kubectl apply -f kubernetes/config/
kubectl apply -f kubernetes/secrets/

# Применение Traefik
echo "Applying Traefik configuration..."
kubectl apply -f kubernetes/traefik-deployment.yaml
kubectl apply -f kubernetes/traefik-service.yaml

# Применение сервисов
echo "Deploying services..."
for SERVICE in "${SERVICES[@]}"; do
    echo "Deploying $SERVICE..."
    kubectl apply -f kubernetes/$SERVICE.yaml
done

# Применение Ingress
echo "Applying Ingress configuration..."
kubectl apply -f kubernetes/ingress.yaml

# Проверка статуса
echo "Checking deployment status..."
kubectl get pods -n messenger
kubectl get svc -n messenger
kubectl get ingress -n messenger 