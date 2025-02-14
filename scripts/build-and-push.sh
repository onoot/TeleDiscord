#!/bin/bash

# Загружаем переменные окружения
source .env.gcp

# Список сервисов
SERVICES=(
  "user-service"
  "message-service"
  "call-service"
  "channel-service"
  "notification-service"
  "swagger-service"
)

# Настройка Docker для работы с GCR
gcloud auth configure-docker $REGISTRY_HOST -q

# Сборка и публикация образов
for SERVICE in "${SERVICES[@]}"; do
  echo "Сборка $SERVICE..."
  docker build -t $REGISTRY_HOST/$PROJECT_ID/$SERVICE:latest ./src/services/$SERVICE
  
  echo "Публикация $SERVICE в Container Registry..."
  docker push $REGISTRY_HOST/$PROJECT_ID/$SERVICE:latest
  
  # Обновление image в deployment файлах
  echo "Обновление image в deployment файле..."
  sed -i "s|image: .*$SERVICE:latest|image: $REGISTRY_HOST/$PROJECT_ID/$SERVICE:latest|g" kubernetes/$SERVICE.yaml
done

echo "Сборка и публикация образов завершена!" 