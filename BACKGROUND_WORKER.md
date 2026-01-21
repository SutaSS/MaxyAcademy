# MaxyAcademy REST API - Background Transfer Processing

## 🚀 Cara Menjalankan Aplikasi

### 1. Jalankan Server API
```bash
npm start
# atau untuk development
npm run dev
```
Server akan berjalan di: `http://localhost:3000`

### 2. Jalankan Background Worker (WAJIB)
**Buka terminal baru** dan jalankan:
```bash
npm run worker
# atau untuk development
npm run dev:worker
```

Worker akan:
- ✅ Memproses transfer queue setiap 5 detik
- ✅ Otomatis retry hingga 3x jika gagal
- ✅ Update status transfer (PENDING → SUCCESS/FAILED)

### 3. Akses Dashboard Monitoring
Buka browser: `http://localhost:3000/dashboard`

Dashboard menampilkan:
- 📊 Statistics (Pending, Success, Failed, Total)
- 📋 List semua transfer dengan status
- 🔄 Tombol retry untuk transfer yang gagal
- ⚡ Auto-refresh setiap 5 detik

---

## 🏗️ Arsitektur Background Processing

### Flow Transfer:

1. **User Request** → POST `/transfer`
2. **Controller**:
   - Validasi data
   - Debit dari pengirim
   - Insert ke `transfer_queue` (status: PENDING)
   - Return response **langsung** (async)
3. **Background Worker** (berjalan terpisah):
   - Polling queue setiap 5 detik
   - Ambil transfer PENDING
   - Credit ke penerima
   - Update status → SUCCESS/FAILED
4. **Dashboard**:
   - Monitor real-time
   - Retry manual untuk failed transfers

---

## ✅ Requirement Checklist

### Mandatory:
- ✅ **Background Processing**: Transfer diproses di background worker
- ✅ **Queue System**: Database sebagai queue (bonus: Redis-free!)
- ✅ **Error Handling**: Try-catch, retry mechanism (max 3x)
- ✅ **Source Control**: Git-ready structure

### Bonus Points:
- ✅ **Unit Test**: 14 tests dengan 74% coverage
- ✅ **Dashboard Monitoring**: Real-time queue monitoring dengan UI
- ✅ **ORM & Migrations**: Database migrations script

---

## 📊 Testing

```bash
npm test
```

Output:
- 14/14 tests passed ✅
- Code coverage: ~74%

---

## 🎯 Keuntungan Arsitektur Ini

### Tanpa Redis:
- ✅ Tidak perlu install dependency eksternal
- ✅ Setup lebih mudah untuk development
- ✅ Database PostgreSQL sebagai queue

### Background Processing:
- ✅ Response API cepat (non-blocking)
- ✅ Automatic retry jika transfer gagal
- ✅ Scalable (bisa run multiple workers)

### Dashboard:
- ✅ Real-time monitoring
- ✅ Manual retry untuk failed transfers
- ✅ Filter by status
- ✅ Auto-refresh

---

## 📁 File Struktur Baru

```
MaxyAcademy/
├── worker.js                         # Background worker script
├── src/
│   ├── controllers/
│   │   └── dashboardController.js    # Dashboard API
│   └── views/
│       └── dashboard.html            # Dashboard UI
```

---

## 🔧 Configuration

Background worker interval dapat diubah di `worker.js`:
```javascript
const INTERVAL = 5000; // 5 seconds (ubah sesuai kebutuhan)
```

---

## 📝 Notes

- Worker harus berjalan bersamaan dengan server untuk proses transfer
- Jika worker tidak berjalan, transfer akan stuck di status PENDING
- Dashboard bisa diakses kapan saja untuk monitoring
