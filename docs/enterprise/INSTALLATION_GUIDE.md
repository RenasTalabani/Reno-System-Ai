# Reno System — Installation Guide v1.0.0

---

## Prerequisites

| Component | Minimum | Recommended |
|---|---|---|
| Node.js | 22.0 | 22 LTS |
| PostgreSQL | 15 | 16 |
| Redis | 7.0 | 7.2 |
| Docker | 24.0 | 25+ |
| pnpm | 9.0 | 9+ |
| Flutter | 3.22 | 3.24+ |

---

## Option A: Docker Compose (Production)

### Step 1 — Clone and configure
```bash
git clone https://github.com/your-org/reno-system.git
cd reno-system
cp .env.production.example .env.production
# Edit .env.production with your values
```

### Step 2 — Generate secrets
```bash
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "DEPLOY_TOKEN=$(openssl rand -base64 48)"
```

### Step 3 — Run migrations
```bash
docker compose -f docker-compose.prod.yml run --rm api pnpm migrate:prod
```

### Step 4 — Start services
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Step 5 — Verify health
```bash
curl https://api.yourdomain.com/health
# Expected: {"status":"ok","version":"1.0.0"}
```

---

## Option B: Kubernetes with Helm

### Step 1 — Add secrets
```bash
kubectl create secret generic reno-secrets \
  --from-literal=jwt-secret="$(openssl rand -hex 64)" \
  --from-literal=encryption-key="$(openssl rand -hex 32)" \
  --from-literal=database-url="postgresql://..." \
  --namespace reno
```

### Step 2 — Install chart
```bash
helm install reno infra/helm/reno \
  --values infra/helm/reno/values-production.yaml \
  --namespace reno \
  --create-namespace
```

### Step 3 — Run migrations
```bash
kubectl exec -n reno deploy/reno-api -- pnpm migrate:prod
```

### Step 4 — Verify pods
```bash
kubectl get pods -n reno
# All pods should be Running
```

---

## Option C: Windows (Development)

### Step 1 — Install prerequisites
```powershell
# Install Node.js 22 from nodejs.org
# Install PostgreSQL 15+ from postgresql.org
# Install Redis via WSL2 or Windows port
# Install pnpm
npm install -g pnpm
```

### Step 2 — Setup
```powershell
# Clone repo and install dependencies
git clone ...
cd "Reno System Ai"
pnpm install

# Setup environment
cp .env.example .env
# Edit .env

# Run migrations
pnpm --filter @reno/database db:push

# Start development servers
pnpm dev
```

### Step 3 — Windows deployment
```powershell
# Use the Windows deployment script
.\scripts\windows-deploy.ps1 -Environment staging
```

---

## Mobile App Installation

### iOS (via Xcode)
```bash
cd apps/mobile
flutter pub get
cd ios && pod install
flutter run --release -d <device-id>
```

### Android
```bash
cd apps/mobile
flutter pub get
flutter run --release -d <device-id>
# Or build APK:
flutter build apk --release
```

---

## Post-Installation Checklist

- [ ] API health check returns 200
- [ ] Web app loads at configured URL
- [ ] Database migrations completed successfully
- [ ] First admin user created
- [ ] First tenant created
- [ ] Email/SMTP configured (for notifications)
- [ ] Backup storage configured
- [ ] SSL/TLS enabled
- [ ] Firewall rules applied
- [ ] Monitoring dashboards accessible
