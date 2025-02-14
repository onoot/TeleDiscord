#!/bin/bash

# Загружаем переменные окружения
source .env.gcp

# Проверяем подключение к кластеру
echo "Проверка подключения к кластеру..."
kubectl cluster-info || {
  echo "Ошибка подключения к кластеру. Проверьте настройки kubectl."
  exit 1
}

# Создание namespace если не существует
echo "Создание namespace messenger..."
kubectl create namespace messenger --dry-run=client -o yaml | kubectl apply -f -

# Применение ConfigMaps и Secrets
echo "Применение ConfigMaps и Secrets..."
kubectl apply -f kubernetes/config/ -n messenger
kubectl apply -f kubernetes/secrets/ -n messenger

# Применение Traefik
echo "Применение Traefik..."
kubectl apply -f kubernetes/traefik-deployment.yaml

# Применение сервисов в правильном порядке
echo "Развертывание сервисов..."

# Сначала базы данных и очереди
kubectl apply -f kubernetes/mongodb.yaml
kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/redis.yaml
kubectl apply -f kubernetes/kafka.yaml

# Ждем, пока базы данных будут готовы
echo "Ожидание готовности баз данных..."
kubectl wait --for=condition=ready pod -l app=mongodb -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=kafka -n messenger --timeout=300s

# Затем основные сервисы
SERVICES=(
  "user-service"
  "message-service"
  "call-service"
  "channel-service"
  "notification-service"
  "swagger-service"
)

for SERVICE in "${SERVICES[@]}"; do
  echo "Развертывание $SERVICE..."
  kubectl apply -f kubernetes/$SERVICE.yaml
done

# Применение Ingress
echo "Применение Ingress..."
kubectl apply -f kubernetes/ingress.yaml

# Проверка статуса
echo "Проверка статуса развертывания..."
kubectl get pods -n messenger
kubectl get svc -n messenger
kubectl get ingress -n messenger

echo "Развертывание завершено!" 