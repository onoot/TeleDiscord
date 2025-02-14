#!/bin/bash

# Загрузка переменных окружения
if [ -f .env.gcp ]; then
  source .env.gcp
else
  echo "Error: .env.gcp file not found!"
  exit 1
fi

# Проверка авторизации в gcloud
if ! gcloud auth list 2>/dev/null | grep -q "ACTIVE"; then
    echo "Please run 'gcloud auth login' first"
    exit 1
fi

# Настройка проекта
gcloud config set project $PROJECT_ID

# Получение учетных данных для kubectl
echo "Fetching cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE --project $PROJECT_ID

# Проверка соединения с кластером
kubectl cluster-info || { echo "Error: Unable to connect to the cluster."; exit 1; }

# Создание namespace
echo "Creating namespace 'messenger'..."
kubectl create namespace messenger || true  # Игнорируем ошибку, если namespace уже существует

# Создание секрета для доступа к Container Registry
echo "Creating secret for Container Registry..."
if [ -f key.json ]; then
    kubectl create secret docker-registry gcr-json-key \
        --docker-server=https://gcr.io \
        --docker-username=_json_key \
        --docker-password="$(cat key.json)" \
        --docker-email=your-email@example.com \
        -n messenger || true  # Игнорируем ошибку, если секрет уже существует
else
    echo "Error: File 'key.json' not found. Please ensure it exists in the current directory."
    exit 1
fi

# Настройка RBAC для Traefik
echo "Setting up RBAC for Traefik..."
kubectl create clusterrolebinding cluster-admin-binding \
    --clusterrole=cluster-admin \
    --user=$(gcloud config get-value account) || true  # Игнорируем ошибку, если роль уже существует

# Включение Vertical Pod Autoscaler (VPA)
echo "Enabling Vertical Pod Autoscaler (VPA)..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/deploy/manifests/vpa-recommended.yaml || true

# Вывод завершающего сообщения
echo "GKE cluster setup completed!"
echo "Now you can run ./deploy-to-gke.sh to deploy your services"