# Panduan Deploy Dashboard ke Vercel

## Persiapan

### 1. Install Vercel CLI (Opsional)
```bash
npm install -g vercel
```

### 2. Pastikan File Konfigurasi Ada
- ✅ `vercel.json` - Konfigurasi deployment
- ✅ `.vercelignore` - File yang diabaikan saat deploy

## Cara Deploy

### Opsi A: Deploy via Vercel CLI (Rekomendasi)

1. **Login ke Vercel**
   ```bash
   vercel login
   ```

2. **Deploy Project**
   ```bash
   vercel
   ```
   - Ikuti wizard setup
   - Pilih scope (personal/team)
   - Confirm project settings
   - Link to existing project atau buat baru

3. **Deploy Production**
   ```bash
   vercel --prod
   ```

### Opsi B: Deploy via Vercel Dashboard (Lebih Mudah)

1. **Buka** https://vercel.com/
2. **Login** dengan akun GitHub/GitLab/Bitbucket
3. **Import Git Repository**
   - Klik "Add New" → "Project"
   - Import dari GitHub: `https://github.com/SutaSS/MaxyAcademy`
   - Atau upload folder manual
4. **Configure Project**
   - Framework Preset: **Other**
   - Build Command: (kosongkan)
   - Output Directory: (kosongkan)
   - Install Command: `npm install`
5. **Environment Variables** - PENTING!
   Tambahkan variable berikut:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=1d
   REDIS_URL=redis://host:6379
   NODE_ENV=production
   ```
6. **Deploy** - Klik tombol "Deploy"

## Setelah Deploy

### Akses Dashboard
Dashboard akan tersedia di:
```
https://your-project-name.vercel.app/dashboard
```

### Akses API Endpoints
- Health Check: `https://your-project-name.vercel.app/health`
- Register: `https://your-project-name.vercel.app/register`
- Login: `https://your-project-name.vercel.app/login`
- Dll.

## ⚠️ Catatan Penting untuk Vercel

### 1. Database PostgreSQL
Vercel adalah serverless, jadi Anda perlu database eksternal:
- **Vercel Postgres** (Rekomendasi - terintegrasi)
- **Supabase** (Free tier tersedia)
- **ElephantSQL** (Free tier tersedia)
- **Amazon RDS**
- **Railway**

### 2. Redis untuk Queue
Worker background (BullMQ) **TIDAK akan berjalan** di Vercel karena:
- Vercel adalah serverless (stateless)
- Tidak support background processes

**Solusi untuk Worker:**
- Deploy worker di platform terpisah:
  - **Railway** (Support background worker)
  - **Render** (Support background worker)
  - **Heroku**
  - **VPS/Server sendiri**
- Atau gunakan **Vercel Cron Jobs** untuk periodic processing

### 3. Environment Variables
Set semua environment variables di Vercel Dashboard:
- Settings → Environment Variables
- Tambahkan untuk Production, Preview, dan Development

### 4. Custom Domain (Opsional)
- Settings → Domains
- Tambahkan domain custom Anda
- Update DNS records sesuai instruksi

## Alternatif Deployment

Jika Anda butuh background worker berjalan:

### Railway (Rekomendasi untuk Full-Stack)
- ✅ Support background worker
- ✅ Built-in PostgreSQL
- ✅ Built-in Redis
- Deploy: https://railway.app/

### Render
- ✅ Support background worker
- ✅ Free PostgreSQL
- ✅ Free Redis
- Deploy: https://render.com/

## Testing Deployment

### 1. Cek Health Endpoint
```bash
curl https://your-project-name.vercel.app/health
```

### 2. Test Register
```bash
curl -X POST https://your-project-name.vercel.app/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "phone_number": "081234567890",
    "pin": "123456"
  }'
```

### 3. Akses Dashboard
Buka browser: `https://your-project-name.vercel.app/dashboard`

## Troubleshooting

### Dashboard tidak muncul
- Pastikan route `/dashboard` ada di `src/routes/index.js`
- Cek Vercel logs: `vercel logs`

### Database connection error
- Pastikan DATABASE_URL sudah diset di Environment Variables
- Test koneksi database dari local dulu

### 500 Internal Server Error
- Cek logs: `vercel logs`
- Pastikan semua dependencies ada di `package.json`

### Worker tidak jalan
- Vercel tidak support background worker
- Deploy worker ke Railway/Render terpisah

## Monitoring

### View Logs
```bash
vercel logs
```

### View Deployment Status
```bash
vercel ls
```

## Redeploy

### Auto Redeploy
Jika connect ke Git:
- Push ke branch main → auto deploy

### Manual Redeploy
```bash
vercel --prod
```

---

**Created:** 21 Januari 2026  
**Project:** MaxyAcademy E-Wallet Dashboard
