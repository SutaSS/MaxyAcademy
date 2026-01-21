# MaxyAcademy

API backend untuk sistem manajemen transaksi keuangan dengan background job processing menggunakan Redis Queue.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL
- **Queue System**: Bull + Redis
- **Authentication**: JWT (JSON Web Token)
- **Password Hashing**: bcryptjs
- **Testing**: Jest + Supertest

## Fitur Utama

### Authentication
- Register pengguna baru
- Login dengan JWT authentication

### Transaksi
- **Top Up**: Isi saldo ke akun
- **Payment**: Pembayaran dari saldo akun
- **Transfer**: Transfer saldo antar pengguna (diproses secara asinkron via queue)

### Profile Management
- Update profil pengguna

### Dashboard Monitoring
- Statistik queue transfers
- Monitoring semua transaksi
- Retry failed transfers
- Real-time queue status

## Struktur Project

```
src/
├── config/         # Konfigurasi database
├── controllers/    # Business logic
├── middleware/     # Auth & error handling
├── models/         # Database models
├── queues/         # Bull queue setup
├── routes/         # API routes
├── services/       # Transfer service
└── views/          # Dashboard HTML
```

## Scripts

```bash
npm start          # Jalankan server
npm run dev        # Development mode dengan nodemon
npm run worker     # Jalankan background worker
npm test           # Run tests dengan coverage
```

## Environment Variables

Buat file `.env` dengan konfigurasi berikut:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your_jwt_secret
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```
