# Загрузка переменных окружения
$PROJECT_ID = "teleport-450320"
$REGION = "europe-central2"
$ZONE = "europe-central2-b"
$CLUSTER_NAME = "messenger-cluster"
$CLUSTER_VERSION = "1.27"
$MACHINE_TYPE = "e2-standard-2"
$NUM_NODES = "3"
$MIN_NODES = "3"
$MAX_NODES = "5"
$NETWORK = "default"
$SUBNETWORK = "default"
$CLUSTER_IPV4_CIDR = "10.0.0.0/14"
$SERVICES_IPV4_CIDR = "10.4.0.0/19"
$REGISTRY_HOST = "gcr.io"

# Проверка авторизации в gcloud
$auth = gcloud auth list 2>$null
if (-not $auth) {
    Write-Host "Please run 'gcloud auth login' first"
    exit 1
}

# Установка проекта по умолчанию
Write-Host "Setting default project..."
gcloud config set project $PROJECT_ID

# Создание кластера GKE
Write-Host "Creating GKE cluster..."
$createClusterCmd = @"
gcloud container clusters create $CLUSTER_NAME ``
    --region $REGION ``
    --cluster-version $CLUSTER_VERSION ``
    --machine-type $MACHINE_TYPE ``
    --num-nodes $NUM_NODES ``
    --min-nodes $MIN_NODES ``
    --max-nodes $MAX_NODES ``
    --enable-autoscaling ``
    --network $NETWORK ``
    --subnetwork $SUBNETWORK ``
    --cluster-ipv4-cidr $CLUSTER_IPV4_CIDR ``
    --services-ipv4-cidr $SERVICES_IPV4_CIDR ``
    --enable-ip-alias ``
    --enable-master-authorized-networks ``
    --enable-autorepair ``
    --enable-autoupgrade ``
    --enable-network-policy ``
    --enable-stackdriver-kubernetes ``
    --enable-shielded-nodes ``
    --enable-binauthz ``
    --workload-pool=$PROJECT_ID.svc.id.goog
"@

Invoke-Expression $createClusterCmd

# Получение учетных данных для kubectl
Write-Host "Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION --project $PROJECT_ID

# Создание namespace
Write-Host "Creating namespace..."
kubectl create namespace messenger

# Создание секрета для доступа к Container Registry
Write-Host "Creating GCR secret..."
$keyContent = Get-Content key.json -Raw
kubectl create secret docker-registry gcr-json-key `
    --docker-server=$REGISTRY_HOST `
    --docker-username="_json_key" `
    --docker-password=$keyContent `
    --docker-email="your-email@example.com" `
    -n messenger

# Настройка RBAC для Traefik
Write-Host "Configuring RBAC for Traefik..."
$currentUser = gcloud config get-value account
kubectl create clusterrolebinding cluster-admin-binding `
    --clusterrole=cluster-admin `
    --user=$currentUser

Write-Host "GKE cluster setup completed!"
Write-Host "Now you can run ./deploy-to-gke.ps1 to deploy your services" 