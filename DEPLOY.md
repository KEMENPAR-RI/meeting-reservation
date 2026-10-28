# Deploy booking-rapat (VPS + aaPanel + Docker)

Semua perintah dijalankan di VPS, di folder project.

## 1. Gambaran singkat

- Aplikasi jalan di dalam Docker.
- MySQL tetap di luar Docker (MySQL bawaan aaPanel di `127.0.0.1`).
- Tiap container start, migration (pembuatan tabel database) jalan otomatis.
- Aplikasi cuma bisa diakses dari `127.0.0.1:8282`. Publik masuk lewat nginx (domain di aaPanel).

Cek dulu MySQL kamu:

```sh
sudo ss -ltnp | grep 3306
```

Kalau hasilnya `127.0.0.1:3306`, ikuti panduan ini. Kalau `0.0.0.0:3306`, lihat juga [Lampiran](#lampiran-kalau-mysql-kamu-bukan-di-127001).

## 2. Persiapan (sekali saja)

### Swap (memori cadangan di disk, wajib untuk VPS 1GB)

```sh
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### Database + user

```sh
sudo /www/server/mysql/bin/mysql -uroot -p
```

Ganti `PASSWORD_KUAT` dengan password kamu sendiri:

```sql
CREATE DATABASE booking_rapat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'booking'@'localhost' IDENTIFIED BY 'PASSWORD_KUAT';
CREATE USER 'booking'@'127.0.0.1' IDENTIFIED BY 'PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON booking_rapat.* TO 'booking'@'localhost';
GRANT ALL PRIVILEGES ON booking_rapat.* TO 'booking'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### File `.env`

```sh
cp .env.example .env
chmod 600 .env
openssl rand -hex 32     # salin hasilnya ke ADMIN_SESSION_SECRET
nano .env
```

Isi seperti ini:

```ini
DB_PORT=3306
DB_DATABASE=booking_rapat
DB_USERNAME=booking
DB_PASSWORD=PASSWORD_KUAT
ADMIN_PASSWORD="password-admin"
ADMIN_SESSION_SECRET="hasil-openssl-tadi"
OFFICE_ALLOWED_IPS="203.0.113.10"
TRUSTED_IP_HEADER="x-real-ip"
OFFICE_IP_CHECK=true
COMPOSE_FILE=docker-compose.yml:docker-compose.hostnet.yml
```

- `OFFICE_ALLOWED_IPS`: IP kantor, pisahkan dengan koma. Kosong = semua orang ditolak.
- `COMPOSE_FILE`: supaya cukup ketik `docker compose ...` tanpa `-f` (mode host network).
- `DB_HOST` dan `DOCKER_DB_HOST` biarkan saja, Docker yang mengatur.
- Kalau ada `DATABASE_URL` atau `DATABASE_URL_UNPOOLED`, hapus.

## 3. Deploy pertama

```sh
docker compose up -d --build
```

Cek hasilnya:

```sh
docker compose ps                                  # tunggu sampai (healthy), kira-kira 1 menit
docker compose logs app | grep -iE 'migrat|error'
curl -I http://127.0.0.1:8282/
```

## 4. Pasang domain di aaPanel

Buka aaPanel > Website > domain kamu > Reverse proxy (atau edit config site), isi:

```nginx
location / {
    proxy_pass http://127.0.0.1:8282;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

```sh
sudo nginx -t && sudo nginx -s reload
```

Baris `X-Real-IP` wajib ada. Aplikasi membaca IP pengunjung dari situ (`TRUSTED_IP_HEADER="x-real-ip"`) untuk cek IP kantor.

## 5. Update aplikasi

Data di database tetap aman.

```sh
git pull
docker compose up -d --build
docker image prune -f
```

## 6. Kalau ada masalah

| Error | Penyebab | Solusi |
|---|---|---|
| `P1001` / `migrate deploy failed` | Aplikasi tidak bisa menghubungi MySQL | Pastikan `COMPOSE_FILE` ada di `.env` dan MySQL jalan |
| `Access denied for user` | Password salah atau user belum dibuat | Cek `DB_PASSWORD`, ulangi bagian Database + user |
| Build gagal / killed / out of memory | RAM kurang | Pasang swap (bagian 2) |
| Container tidak `(healthy)` | Aplikasi gagal start | `docker compose logs app`, cocokkan dengan baris di atas |

## 7. Perintah berguna

```sh
docker compose logs -f app       # lihat log langsung
docker compose restart app       # restart aplikasi

# cek / jalankan migration manual
docker compose exec app sh -c 'cd /migrate && node node_modules/prisma/build/index.js migrate status'
docker compose exec app sh -c 'cd /migrate && node node_modules/prisma/build/index.js migrate deploy'

# kalau container restart terus (exec tidak bisa)
docker compose run --rm --entrypoint sh app -c 'cd /migrate && node node_modules/prisma/build/index.js migrate status'
```

Rollback database. **Awas: semua tabel dan data booking terhapus.**

```sh
docker compose exec app sh -c 'cd /migrate && node node_modules/prisma/build/index.js db execute --file prisma/migrations/20261028000000_init_mysql/down.sql'
```

## Lampiran: kalau MySQL kamu bukan di 127.0.0.1

Mode bridge (jaringan Docker terpisah). Bedanya dengan panduan di atas:

1. Di `.env` hapus baris `COMPOSE_FILE`.
2. User database pakai `'booking'@'172.%'`, bukan localhost/127.0.0.1:
   ```sql
   CREATE USER 'booking'@'172.%' IDENTIFIED BY 'PASSWORD_KUAT';
   GRANT ALL PRIVILEGES ON booking_rapat.* TO 'booking'@'172.%';
   FLUSH PRIVILEGES;
   ```
3. Di config MySQL (`/etc/my.cnf`), bagian `[mysqld]`: `bind-address = 0.0.0.0`, lalu:
   ```sh
   sudo systemctl restart mysqld || sudo systemctl restart mysql
   ```
4. Firewall wajib, supaya port 3306 tidak terbuka ke internet:
   ```sh
   sudo ufw allow from 172.16.0.0/12 to any port 3306 proto tcp
   sudo ufw deny 3306/tcp
   sudo ufw status numbered      # harus "Status: active"
   ```
   Cek juga di aaPanel > Security: port 3306 jangan dibuka ke publik.

## Catatan keamanan

- Jangan commit atau bagikan `.env`.
- Di mode bridge, pakai Docker versi 28 ke atas.
- Pertimbangkan `limit_req` (pembatas jumlah request) di nginx untuk halaman login admin.