#!/bin/bash

# Загружаем переменные окружения
source .env.gcp

# Проверяем наличие необходимых утилит
command -v gcloud >/dev/null 2>&1 || { echo "Требуется установить Google Cloud SDK"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "Требуется установить kubectl"; exit 1; }

# Настройка проекта
echo "Настройка проекта Google Cloud..."
gcloud config set project $PROJECT_ID
gcloud config set compute/zone $ZONE
gcloud config set compute/region $REGION

# Включаем необходимые API
echo "Включение необходимых API..."
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Создание кластера GKE
echo "Создание кластера GKE..."
gcloud container clusters create $CLUSTER_NAME \
  --region $REGION \
  --cluster-version $CLUSTER_VERSION \
  --machine-type $MACHINE_TYPE \
  --num-nodes $NUM_NODES \
  --min-nodes $MIN_NODES \
  --max-nodes $MAX_NODES \
  --enable-autoscaling \
  --network $NETWORK \
  --subnetwork $SUBNETWORK \
  --cluster-ipv4-cidr $CLUSTER_IPV4_CIDR \
  --services-ipv4-cidr $SERVICES_IPV4_CIDR \
  --enable-ip-alias \
  --enable-network-policy \
  --enable-master-authorized-networks \
  --enable-autoupgrade \
  --enable-autorepair

# Получение учетных данных для kubectl
echo "Настройка kubectl..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

# Создание namespace
echo "Создание namespace messenger..."
kubectl create namespace messenger

# Создание секрета для доступа к Container Registry
echo "Создание секрета для Container Registry..."
gcloud iam service-accounts keys create key.json \
  --iam-account=messenger-sa@$PROJECT_ID.iam.gserviceaccount.com

kubectl create secret docker-registry gcr-json-key \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat key.json)" \
  --docker-email=your-email@example.com \
  -n messenger

# Удаление ключа
rm key.json

echo "Настройка кластера GKE завершена!" 