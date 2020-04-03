---
title: Cluster Kubernetes
description: "Criando um cluster Kubernetes para aplicações escaláveis"
date: "2020-04-01 23:30:23"
category: dev
background: "#ffe358"
image: /assets/img
---

# Linux

```sh
sudo swapoff -a
```

# Docker

```sh
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce

sudo usermod -aG docker $USER
```

# Kubernetes

kubelet, kubeadm e kubectl precisam se conversar, portanto atente-se as versões
verifique sempre a documentação

```sh
sudo su
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
deb https://apt.kubernetes.io/ kubernetes-xenial main
EOF
apt-get update
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
exit
```

# Iniciando o Cluster

```sh
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
```

# Configurando o Client (Kubectl)

```sh
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

# Configurações Adicionais

--- por default o nó master não aceita pods

```sh
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/v0.12.0/Documentation/kube-flannel.yml
kubectl taint nodes --all node-role.kubernetes.io/master-
```

# Dashboard

```sh
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.0-rc7/aio/deploy/recommended.yaml
```

# Expondo o Dashboard

```sh
kubectl expose deployment kubernetes-dashboard --name=kubernetes-dashboard-nodeport --port=443 --target-port=8443 --type=NodePort -n kubernetes-dashboard
```

# Criando acesso ao Kubernetes

```sh
kubectl create serviceaccount kubeadmin -n kube-system
kubectl create clusterrolebinding kubeadmin-binding --clusterrole=cluster-admin --serviceaccount=kube-system:kubeadmin

kubectl describe sa kubeadmin -n kube-system
kubectl get secret <TOKENS> -n kube-system -o yaml
echo `echo <TOKEN> | base64 --decode`
```

# Namespaces

```sh
vim namespaces.yaml
```

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: devops
```

```sh
kubectl apply -f namespaces.yaml
```

# Config Map

```sh
vim configmap.yaml
```

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app
  namespace: production
data:
  NODE_ENV: production
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app
  namespace: staging
data:
  NODE_ENV: staging
---

```

```sh
kubectl apply -f configmap.yaml
```

### Atualizar o deploy

```yaml
- name: NODE_ENV
  valueFrom:
    configMapKeyRef:
      name: backend
      key: NODE_ENV
```

# Secret

```sh
vim secret.yaml
```

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: app
  namespace: production
type: Opaque
data:
  MONGO_URI: [BASE64]
  SECRET_OR_KEY: [BASE64]
---
apiVersion: v1
kind: Secret
metadata:
  name: app
  namespace: staging
type: Opaque
data:
  MONGO_URI: [BASE64]
  SECRET_OR_KEY: [BASE64]
```

```sh
kubectl apply -f secret.yaml
```

# Helm

Deploy, rollback, históricos e status

```sh
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
```

# Inicializando o Repositorio

```sh
helm repo add stable https://kubernetes-charts.storage.googleapis.com/

helm repo update
```

# ServiceAccount

```sh
vim service-account.yaml
```

```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: helm
  namespace: kube-system
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: allresources
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: helm
subjects:
  - kind: ServiceAccount
    namespace: kube-system
    name: helm
    apiGroup: ""
roleRef:
  kind: ClusterRole
  name: allresources
  apiGroup: rbac.authorization.k8s.io
```

```sh
kubectl apply -f service-account.yaml
```

```sh
vim patch-account.yaml
```

```yaml
spec:
  template:
    spec:
      serviceAccountName: helm
```

```sh
kubectl patch deployment helm-deploy -n kube-system --patch "\$(cat patch-account.yml)"
```

```sh
vim chartmuseum.yaml
```

```yaml
env:
  open:
    STORAGE: local
    DISABLE_API: false
    ALLOW_OVERWRITE: true
service:
  type: NodePort
  nodePort: 30010
```

```sh
helm install helm --namespace devops -f chartmuseum.yaml stable/chartmuseum
```

# Populando o repositório

```sh
helm plugin install https://github.com/chartmuseum/helm-push

helm repo add app http://$(kubectl get nodes --namespace devops -o jsonpath="{.items[0].status.addresses[0].address}"):30010

helm lint backend/
helm push backend/ app

helm repo update

helm install staging-backend app/backend --namespace staging
helm install production-backend app/backend --namespace production
```

# Pipeline com Jenkins

```sh
vim jenkins-pv-pvc.yaml
```

```yaml
---
kind: PersistentVolume
apiVersion: v1
metadata:
  name: jenkins
  labels:
    type: local
spec:
  storageClassName: manual-for-jenkins
  capacity:
    storage: 16Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data-jenkins"
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: jenkins
  namespace: devops
spec:
  storageClassName: manual-for-jenkins
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 16Gi
```

```sh
kubectl apply -f jenkins-pv-pvc.yaml
```

```sh
helm install jenkins --set persistence.existingClaim=jenkins --set master.serviceType=NodePort --set master.nodePort=30808 --namespace devops stable/jenkins
```

Primeiro acesso no jenkins como admin

```sh
printf $(kubectl get secret --namespace devops jenkins -o jsonpath="{.data.jenkins-admin-password}" | base64 --decode);echo
```

# Adicionando permissão para o jenkins

```sh
kubectl create rolebinding sa-devops-role-clusteradmin --clusterrole=cluster-admin --serviceaccount=devops:default --namespace=devops

kubectl create rolebinding sa-devops-role-clusteradmin-kubesystem --clusterrole=cluster-admin --serviceaccount=devops:default --namespace=kube-system

kubectl create rolebinding sa-devops-role-clusteradmin-kubesystem --clusterrole=cluster-admin --serviceaccount=devops:default --namespace=staging

kubectl create rolebinding sa-devops-role-clusteradmin-kubesystem --clusterrole=cluster-admin --serviceaccount=devops:default --namespace=production
```

# Credenciais no Jenkins

Criar a chave ssh

```sh
ssh-keygen -o -t rsa -C "jenkins-scm" -b 4096

# name: id_rsa_jenkins

# copy public key then paste in your smc github/gitlab/bitbucket ...
cat id_rsa_jenkins.pub

# copy private key then paste in jenkins
cat id_rsa_jenkins

# add credentials
```

# Criando Multibranch Pipeline

Novo Job

Configurar o Branch Sources
Git

# Helm

```sh
cd charts/frontend
helm push . app
```

# Make Jenkinsfile

```sh
vim Jenkinsfile
```

```groovy
def NAME = "app"
def LABEL_ID = "${NAME}-${UUID.randomUUID().toString()}"

podTemplate(
  name: NAME,
  label: LABEL_ID,
  namespace: 'devops',
  containers: [
    containerTemplate(
      args: 'cat',
      command: '/bin/sh -c',
      image: 'docker',
      livenessProbe:
        containerLivenessProbe(
          execArgs: '',
          failureThreshold: 0,
          initialDelaySeconds: 0,
          periodSeconds: 0,
          successThreshold: 0,
          timeoutSeconds: 0
        ),
      name: 'docker-container',
      resourceLimitCpu: '',
      resourceLimitMemory: '',
      resourceRequestCpu: '',
      resourceRequestMemory: '',
      ttyEnabled: true,
      workingDir: '/home/jenkins/agent'
    ),
    containerTemplate(
      args: 'cat',
      command: '/bin/sh -c',
      image: 'lachlanevenson/k8s-helm',
      name: 'helm-container',
      ttyEnabled: true
    )
  ],
  volumes: [
    hostPathVolume(
      hostPath: '/var/run/docker.sock',
      mountPath: '/var/run/docker.sock'
    )
  ],
) {
  // INIT CONFIG PIPELINE

  def REPOS
  def IMAGE_VERSION
  def IMAGE_POSFIX = ""
  def KUBE_NAMESPACE
  def IMAGE_NAME = "frontend"
  def ENVIRONMENT
  def GIT_REPOS_URL = 'https://github.com/myapp/frontend.git'
  def CHARTMUSEUM_URL = 'http://helm-chartmuseum:8080'
  def GIT_BRANCH
  def HELM_DEPLOY_NAME
  def HELM_CHART_NAME = "app"
  def HELM_CHART_PATH = HELM_CHART_NAME + "/frontend"
  def INGRESS_HOST = "myapp.com"
  def INGRESS_PATH = ''

  // START PIPELINE
  node(LABEL_ID) {
    stage('Checkout') {
      echo 'Iniciando Clone do Repositorio'
      REPOS = checkout scm
      GIT_BRANCH = REPOS.GIT_BRANCH
      if (GIT_BRANCH.equals('master')) {
        KUBE_NAMESPACE = 'prod'
        ENVIRONMENT = "production"
      } else if (GIT_BRANCH.equals('develop')) {
        KUBE_NAMESPACE = 'staging'
        ENVIRONMENT = "staging"
        IMAGE_POSFIX = "-RC"
        INGRESS_HOST = "staging.myapp.org"
      } else {
        def error = "Não existe pipeline para a branch ${GIT_BRANCH}"
        echo error
        throw new Exception(error)
      }
      HELM_DEPLOY_NAME = KUBE_NAMESPACE + '-frontend'
      IMAGE_VERSION = sh returnStdout: true, script: 'sh read-package-version.sh '
      IMAGE_VERSION = IMAGE_VERSION.trim() + IMAGE_POSFIX
    }
    stage('Package') {
      container('docker-container') {
        echo 'Iniciando empacotamento com Docker'
        withCredentials([usernamePassword(credentialsId: 'dockerhub', passwordVariable: 'DOCKER_HUB_PASSWORD', usernameVariable: 'DOCKER_HUB_USER')]) {
          sh script: "docker login -u ${DOCKER_HUB_USER} -p ${DOCKER_HUB_PASSWORD}"
          sh script: "docker build -t ${DOCKER_HUB_USER}/${IMAGE_NAME}:${IMAGE_VERSION} . --build-arg NPM_ENV='${ENVIRONMENT}'"
          sh script: "docker push ${DOCKER_HUB_USER}/${IMAGE_NAME}:${IMAGE_VERSION}"
        }
      }
    }
    stage('Deploy') {
      container('helm-container') {
        echo 'Iniciando Deploy Helm'
        sh script: "helm repo add ${HELM_CHART_NAME} ${CHARTMUSEUM_URL}"
        sh script: 'helm repo update'

        try {
          // Helm upgrade first
          sh script: "helm upgrade --namespace=${KUBE_NAMESPACE} ${HELM_DEPLOY_NAME} ${HELM_CHART_PATH} --set image.tag=${IMAGE_VERSION} --set ingress.hosts[0].host=${INGRESS_HOST} --set ingress.hosts[0].paths[0]=${INGRESS_PATH}"
        } catch (Exception e) {
          // Helm install
          sh script: "helm install --namespace=${KUBE_NAMESPACE} ${HELM_DEPLOY_NAME} ${HELM_CHART_PATH} --set image.tag=${IMAGE_VERSION} --set ingress.hosts[0].host=${INGRESS_HOST} --set ingress.hosts[0].paths[0]=${INGRESS_PATH}"
        }
      }
    }
  }
}
```

# Ingress

```sh
vim traefik-accounts.yaml
```

```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traefik-ingress-controller
  namespace: kube-system
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: traefik-ingress-controller
rules:
  - apiGroups:
      - ""
    resources:
      - services
      - endpoints
      - secrets
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - extensions
    resources:
      - ingresses
    verbs:
      - get
      - list
      - watch
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: traefik-ingress-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: traefik-ingress-controller
subjects:
  - kind: ServiceAccount
    name: traefik-ingress-controller
    namespace: kube-system
```

```sh
kubectl apply -f traefik-accounts.yaml
```

```sh
vim traefik-admin-ingress.yaml
```

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: traefik-web-ui
  namespace: kube-system
spec:
  selector:
    k8s-app: traefik-ingress-lb
  ports:
    - name: web
      port: 80
      targetPort: 8080
---
kind: Ingress
apiVersion: networking.k8s.io/v1beta1
metadata:
  name: traefik-web-ui
  namespace: kube-system
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  rules:
    - host: traefik-ui.minikube
      http:
        paths:
          - path: /
            backend:
              serviceName: traefik-web-ui
              servicePort: web
```

```sh
kubectl apply -f traefik-admin-ingress.yaml
```

```sh
vim traefik-ds-service.yaml
```

```yaml
---
kind: DaemonSet
apiVersion: apps/v1
metadata:
  name: traefik-ingress-controller
  namespace: kube-system
  labels:
    k8s-app: traefik-ingress-lb
spec:
  selector:
    matchLabels:
      k8s-app: traefik-ingress-lb
  template:
    metadata:
      labels:
        k8s-app: traefik-ingress-lb
        name: traefik-ingress-lb
    spec:
      serviceAccountName: traefik-ingress-controller
      terminationGracePeriodSeconds: 60
      containers:
        - image: traefik:v2.2
          name: traefik-ingress-lb
          ports:
            - name: web
              containerPort: 80
              hostPort: 80
            - name: admin
              containerPort: 8080
              hostPort: 8080
          securityContext:
            capabilities:
              drop:
                - ALL
              add:
                - NET_BIND_SERVICE
          args:
            - --log.level=INFO
            - --api
            - --api.insecure
            - --entrypoints.web.address=:80
            - --providers.kubernetesingress
---
kind: Service
apiVersion: v1
metadata:
  name: traefik-ingress-service
  namespace: kube-system
spec:
  selector:
    k8s-app: traefik-ingress-lb
  ports:
    - protocol: TCP
      port: 80
      name: web
    - protocol: TCP
      port: 8080
      name: admin
```

```sh
kubectl apply -f traefik-ds-service.yaml
```

```sh
sudo vim /etc/hosts

192.168.X.X myapp.com
192.168.X.x traefik-ui.minikube
```

# Repositorio privado Docker

Para cada namespace [staging, production] que irá utilizar as imagens privadas

```sh
kubectl --namespace production \
create secret docker-registry registry-secret \
--docker-server=DOCKER_REGISTRY_HOST \
--docker-username=DOCKER_REGISTRY_USER \
--docker-password=DOCKER_REGISTRY_PASS \
--docker-email=DOCKER_REGISTRY_EMAIL
```

# Pod

```yaml
spec:
  imagePullSecrets:
    - name: registry-secret
```
