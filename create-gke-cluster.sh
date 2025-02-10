#!/bin/bash

# Загрузка переменных окружения
source .env.gcp

# Проверка авторизации в gcloud
if ! gcloud auth list 2>/dev/null | grep -q "ACTIVE"; then
    echo "Please run 'gcloud auth login' first"
    exit 1
fi

# Установка проекта по умолчанию
gcloud config set project $PROJECT_ID

# Создание кластера GKE
echo "Creating GKE cluster..."
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
    --enable-master-authorized-networks \
    --enable-autorepair \
    --enable-autoupgrade \
    --enable-network-policy \
    --enable-stackdriver-kubernetes \
    --enable-shielded-nodes \
    --enable-binauthz \
    --workload-pool=$PROJECT_ID.svc.id.goog

# Получение учетных данных для kubectl
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION --project $PROJECT_ID

# Создание namespace
kubectl create namespace messenger

# Создание секрета для доступа к Container Registry
kubectl create secret docker-registry gcr-json-key \
    --docker-server=$REGISTRY_HOST \
    --docker-username=_json_key \
    --docker-password="$(cat key.json)" \
    --docker-email=your-email@example.com \
    -n messenger

# Настройка RBAC для Traefik
kubectl create clusterrolebinding cluster-admin-binding \
    --clusterrole=cluster-admin \
    --user=$(gcloud config get-value account)

echo "GKE cluster setup completed!"
echo "Now you can run ./deploy-to-gke.sh to deploy your services" 