Listed directory Express.js
Listed directory be-geosandbox-infrastructure
Viewed README.md:1-32
Viewed compose.yaml:1-9
Listed directory api-gateway
Viewed kong.yml:1-67
Listed directory message-broker
Viewed docker-compose.yml:1-25
Listed directory monitoring
Listed directory be-geosandbox-database-s3
Viewed compose.yaml:1-124
Listed directory be-geosandbox-auth-service
Viewed package.json:1-34
Listed directory src
Viewed app.js:1-57
Viewed auth.route.js:1-62
Listed directory message-broker
Viewed user.subscriber.js:1-71
Listed directory services
Viewed auth.service.js:1-61
Viewed auth.controller.js:1-162
Listed directory be-geosandbox-user-service
Listed directory src
Viewed app.js:1-57
Viewed user.route.js:1-55
Viewed user.subscriber.js:1-74
Viewed user.controller.js:1-59
Viewed address.route.js:1-19
Listed directory be-geosandbox-gis-service
Viewed package.json:1-39
Listed directory src
Viewed app.js:1-56
Viewed user.subscriber.js:1-75
Viewed provinsi.routes.js:1-17
Viewed selected-area.routes.js:1-19
Viewed storage-s3.config.js:1-24
Searched for "rustfsClient"
Searched for "rustfsClient"
Searched for "upload"
Viewed provinsi.controller.js:1-70
Viewed provinsi.service.js:1-60
Viewed compose.yaml:1-21
Viewed compose.yaml:1-21
Viewed compose.yaml:1-21
Listed directory models
Viewed tblauth.js:1-58
Listed directory models
Viewed detailusers.js:1-63
Viewed tbladdressusers.js:1-58
Listed directory models
Viewed detailusers.js:1-39
Viewed tblpointplace.js:1-47
Viewed tblgeopointplaceimage.js:1-37
Listed directory routes
Viewed kabupaten.routes.js:1-16
Listed directory middlewares
Viewed auth.middleware.js:1-41
Viewed data-cache.config.js
Listed directory config
Listed directory middlewares
Viewed guard.middleware.js:1-44
Viewed docker-compose.yml:1-34
Viewed docker-compose.yml:1-33
Listed directory cicd-workflow
Viewed compose.yaml:1-27

Berdasarkan hasil penelusuran langsung pada 5 direktori repository proyek Anda:

1. [be-geosandbox-infrastructure](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-infrastructure)
2. [be-geosandbox-database-s3](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-database-s3)
3. [be-geosandbox-auth-service](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-auth-service)
4. [be-geosandbox-user-service](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-user-service)
5. [be-geosandbox-gis-service](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-gis-service)

Berikut adalah visualisasi alur sistem (arsitektur global dan alur per skenario) menggunakan diagram interaktif serta penjelasan mendalam mengenai konsep microservice yang diimplementasikan.

---

### 1. Diagram Arsitektur Global (System Topology)

Arsitektur sistem ini mengadopsi **Event-Driven Microservices** dengan **API Gateway Pattern** dan **Database-per-Service Pattern**. Seluruh kontainer terhubung melalui satu Docker Network bersama (`global-network-geosandbox`).

```mermaid
flowchart TB
    subgraph IngressLayer ["1. Ingress & Traffic Management"]
        Client(["Client (Web / Mobile / Postman)"])
        Nginx["Nginx Reverse Proxy (Host VM :80/:443)"]
        Kong["Kong API Gateway (Port :8000 / :8001 Admin)<br/>Plugins: CORS, Declarative Routing"]
    end

    subgraph ServiceLayer ["2. Microservices Layer (Express.js)"]
        AuthSvc["Auth Service (Port :3610)<br/>• Login, Register, Refresh<br/>• JWT Generation & Validation"]
        UserSvc["User Service (Port :3630)<br/>• User Profiles, Address<br/>• CRUD User Data"]
        GisSvc["GIS Service (Port :3620)<br/>• Spatial Analysis, PostGIS<br/>• Import GeoJSON, Wilayah, S3"]
    end

    subgraph EventLayer ["3. Asynchronous Messaging (Event-Driven)"]
        RabbitMQ[("RabbitMQ 4.0 Broker<br/>Port :5672 AMQP / :15672 UI<br/>Queues: user_activated, user_update,<br/>gis_user_activated, gis_user_update")]
    end

    subgraph DataStorageLayer ["4. Database & Storage Layer (Database-per-Service)"]
        DB_Auth[("Auth Database (PostgreSQL 17)<br/>Port :5432 - db_auth_geosandbox")]
        DB_User[("User Database (PostgreSQL 17)<br/>Port :5434 - db_user_geosandbox")]
        DB_Gis[("GIS Database (PostGIS 17)<br/>Port :5433 - db_gis_geosandbox")]
        RedisCache[("Redis Cache & Session Store<br/>Port :6381 - activation & refresh tokens")]
        RustFS[("RustFS Object Storage (S3-Compatible)<br/>Port :8980 (API) / :9710 (Console)")]
    end

    subgraph ObservabilityLayer ["5. Monitoring & CI/CD"]
        Prometheus["Prometheus (:9090)"]
        Grafana["Grafana Dashboard (:3000)"]
        Jenkins["Jenkins CI/CD (:8780)"]
    end

    %% Routing
    Client -->|HTTP/HTTPS Request| Nginx
    Nginx -->|Reverse Proxy| Kong
    Kong -->|/api/v1/auth/*| AuthSvc
    Kong -->|/api/v1/user/*| UserSvc
    Kong -->|/api/v1/gis/*| GisSvc

    %% Service to DB
    AuthSvc -->|Read / Write Auth Data| DB_Auth
    AuthSvc -->|Set OTP / Validate Refresh Token| RedisCache
    UserSvc -->|Read / Write Profile Data| DB_User
    GisSvc -->|Spatial Queries & Geo Storage| DB_Gis
    GisSvc -->|Upload / Fetch Images & Raster| RustFS

    %% Event Publishing & Consuming
    AuthSvc -.->|Publish: user_activated, gis_user_activated| RabbitMQ
    RabbitMQ -.->|Consume: user_activated| UserSvc
    RabbitMQ -.->|Consume: gis_user_activated| GisSvc

    UserSvc -.->|Publish: user_update, gis_user_update| RabbitMQ
    RabbitMQ -.->|Consume: user_update| AuthSvc
    RabbitMQ -.->|Consume: gis_user_update| GisSvc

    %% Metrics
    RabbitMQ -.->|Metrics :15692| Prometheus
    Prometheus --> Grafana
```

---

### 2. Alur Setiap Service (Flow Diagrams)

#### Alur A: Registrasi, Aktivasi Akun, & Sinkronisasi Antar Service

Alur ini menggambarkan bagaimana registrasi diautentikasi oleh `auth-service`, kemudian disinkronisasikan ke `user-service` dan `gis-service` secara **asinkron (asynchronous)** via RabbitMQ tanpa membuat service saling memanggil langsung via HTTP.

```mermaid
sequenceDiagram
    autonumber
    actor User as Klien / User
    participant Kong as Kong API Gateway
    participant Auth as Auth Service (:3610)
    participant Redis as Redis Cache (:6381)
    participant Mail as SMTP Mailer
    participant RMQ as RabbitMQ (:5672)
    participant UserSvc as User Service (:3630)
    participant GisSvc as GIS Service (:3620)

    User->>Kong: POST /api/v1/auth/register (username, email, password)
    Kong->>Auth: Forward request
    Auth->>Auth: Hash password & Simpan User (isActive: false) ke DB Auth
    Auth->>Redis: SET activation_account:{token} (EX: 300s)
    Auth->>Mail: Kirim Email Verifikasi
    Auth-->>User: 201 Created ("Registrasi berhasil, cek email")

    Note over User,Auth: Pengguna mengklik tautan aktivasi di email
    User->>Kong: GET /api/v1/auth/activation?token=...
    Kong->>Auth: Forward request
    Auth->>Redis: GET activation_account:{token}
    Auth->>Auth: Update tbl_users set isActive = true
    Auth->>Redis: DEL activation_account:{token}

    Auth-)RMQ: deliverMessageData(['user_activated', 'gis_user_activated'], {uuid, username, email})
    Auth-->>User: 200 OK ("Akun berhasil diaktifkan")

    par Konsumsi Event Aktivasi
        RMQ-)UserSvc: Consumer trigger (queue: user_activated)
        UserSvc->>UserSvc: Insert tbl_detail_users (uuid, username, email) ke DB User
    and
        RMQ-)GisSvc: Consumer trigger (queue: gis_user_activated)
        GisSvc->>GisSvc: Insert tbl_users projection (uuid, username, email) ke DB GIS
    end
```

---

#### Alur B: Login & Akses Endpoint Terproteksi (Stateless JWT Guard)

Menggambarkan pemisahan antara pengeluaran token (Auth Service) dan verifikasi token oleh service hilir (`user-service` dan `gis-service`).

```mermaid
sequenceDiagram
    autonumber
    actor User as Klien / User
    participant Kong as Kong API Gateway
    participant Auth as Auth Service (:3610)
    participant Redis as Redis Cache (:6381)
    participant UserSvc as User Service (:3630)

    User->>Kong: POST /api/v1/auth/login (email, password)
    Kong->>Auth: Forward ke Auth Service
    Auth->>Auth: Validasi akun & bcrypt password check
    Auth->>Auth: Generate Access Token (JWT) & Refresh Token
    Auth->>Redis: SET refresh_token:{uuid} = refreshToken
    Auth-->>User: 200 OK (Access Token, Refresh Token)

    Note over User,UserSvc: Mengakses resource yang membutuhkan autentikasi
    User->>Kong: GET /api/v1/users/detail/{uuid} + Header Bearer JWT
    Kong->>UserSvc: Route ke User Service
    UserSvc->>UserSvc: verifyLoginToken(token) via JWT secret (Stateless, tanpa panggil Auth Service)
    UserSvc->>UserSvc: Query tbl_detail_users dari db_user_geosandbox
    UserSvc-->>User: 200 OK (Detail data profil)
```

---

#### Alur C: Update Profile & Sinkronisasi Balik (Eventual Consistency)

Ketika user memperbarui profil di `user-service`, data email dan username harus ikut berubah di `auth-service` dan `gis-service`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Klien / User
    participant Kong as Kong API Gateway
    participant UserSvc as User Service (:3630)
    participant RMQ as RabbitMQ (:5672)
    participant Auth as Auth Service (:3610)
    participant GisSvc as GIS Service (:3620)

    User->>Kong: PUT /api/v1/users/update (Body: username, email, dll)
    Kong->>UserSvc: Forward request
    UserSvc->>UserSvc: Update tbl_detail_users di db_user_geosandbox
    UserSvc-)RMQ: deliverMessageData(['user_update', 'gis_user_update'], {uuid, username, email})
    UserSvc-->>User: 200 OK ("User updated successfully")

    par Sinkronisasi ke Service Lain
        RMQ-)Auth: Consumer trigger (queue: user_update)
        Auth->>Auth: Update username & email di tbl_users (db_auth_geosandbox)
    and
        RMQ-)GisSvc: Consumer trigger (queue: gis_user_update)
        GisSvc->>GisSvc: Update username & email di tbl_users (db_gis_geosandbox)
    end
```

---

#### Alur D: GIS Ingestion, Spatial Query, & Object Storage (RustFS S3)

Alur pemrosesan data geospasial khusus pada `gis-service`.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / User
    participant Kong as Kong API Gateway
    participant GisSvc as GIS Service (:3620)
    participant PostGIS as PostGIS DB (:5433)
    participant RustFS as RustFS S3 Storage (:8980)

    alt Import GeoJSON Wilayah
        Admin->>Kong: POST /api/v1/gis/provinsi/import (Multipart GeoJSON file)
        Kong->>GisSvc: Forward request
        GisSvc->>GisSvc: Parse FeatureCollection GeoJSON
        GisSvc->>PostGIS: Upsert ke tbl_geo_provinsi (Column 'geom' format GEOMETRY / MultiPolygon)
        GisSvc-->>Admin: 200 OK ("Data provinsi berhasil diimport")
    else Query Spasial / Area
        Admin->>Kong: GET /api/v1/gis/selected-area/kecamatan/:kode_provinsi
        Kong->>GisSvc: Forward request
        GisSvc->>PostGIS: ST_Intersects / Spatial query relasi wilayah
        PostGIS-->>GisSvc: Spatial Result Feature
        GisSvc-->>Admin: 200 OK (GeoJSON FeatureCollection)
    else Upload Asset Point of Interest (Tempat GIS)
        Admin->>Kong: POST /api/v1/gis/point/upload (Gambar/File + Koordinat)
        Kong->>GisSvc: Forward request
        GisSvc->>RustFS: PutObjectCommand (Upload binary ke RustFS S3 Bucket)
        RustFS-->>GisSvc: Object S3 URL / Key
        GisSvc->>PostGIS: Simpan koordinat ke tbl_geo_point_place & link_img ke tbl_geo_point_place_image
        GisSvc-->>Admin: 201 Created (Place & Image URL)
    end
```

---

### 3. Penjelasan Konsep Microservice Pada Arsitektur Ini

Arsitektur Geosandbox ini mengimplementasikan pola-pola standar industri (_design patterns_) microservice sebagai berikut:

#### 1. Single Responsibility Principle & Domain-Driven Design (DDD)

Setiap service memiliki batasan konteks (_Bounded Context_) yang tegas dan tugas spesifik:

- **[Auth Service](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-auth-service)**: Berfokus hanya pada identitas, kredensial keamanan (password hash), token JWT, aktivasi akun, dan hak akses (RBAC).
- **[User Service](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-user-service)**: Berfokus pada entitas profil pengguna (`DetailUsers`), alamat (`TblAddressUsers`), nomor telepon, foto profil, dan informasi demografis.
- **[GIS Service](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-gis-service)**: Berfokus pada domain spasial/pemetaan, seperti batas administrasi (Provinsi, Kabupaten), titik lokasi (_Point Place_), koordinat poligon, serta integrasi storage file geospasial.

#### 2. Database-per-Service Pattern (Loose Coupling)

Setiap microservice memiliki basis data tersendiri di [compose.yaml database-s3](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-database-s3/compose.yaml):

- `auth_service_db` (`db_auth_geosandbox` - PostgreSQL port 5432)
- `user_service_db` (`db_user_geosandbox` - PostgreSQL port 5434)
- `gis_service_db` (`db_gis_geosandbox` - PostGIS port 5433)

**Keuntungan:**

- **Polyglot Persistence**: GIS Service dapat menggunakan ekstensi PostGIS khusus kalkulasi geometri spasial tanpa membebani database auth atau user.
- **Isolasi Kegagalan (_Fault Isolation_)**: Jika database GIS kehabisan memori atau _crash_, layanan autentikasi dan login pengguna tetap berjalan normal.
- Mencegah ketergantungan join tabel antar service secara langsung.

#### 3. API Gateway Pattern (Kong + Nginx)

Klien luar tidak memanggil port internal service (port 3610, 3620, 3630):

- Diatur melalui [kong.yml](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-infrastructure/api-gateway/kong.yml).
- Menyediakan **Unified Entry Point** (`/api/v1/auth`, `/api/v1/user`, `/api/v1/gis`).
- Memusatkan kebijakan global seperti CORS, SSL termination di Nginx, dan abstraksi topologi internal kontainer.

#### 4. Asynchronous Event-Driven Architecture (EDA) & Eventual Consistency

Alih-alih memanggil HTTP REST API antarservice (yang membuat service saling bergantung dan rentan _cascade failure_), komunikasi antarservice menggunakan antrean pesan (**RabbitMQ**):

- **Publisher & Subscriber (Pub/Sub)**:
  - Saat `ActivationController` di `auth-service` dijalankan, pesan dikirim ke `user_activated` dan `gis_user_activated`.
  - Saat profil diupdate di `user-service`, pesan dikirim ke `user_update` dan `gis_user_update`.
- **Data Projections / CQRS-Lite**:
  - `gis-service` menyimpan tabel proyeksi lokal `tbl_users` berisi `uuid`, `username`, `email`. GIS service tidak perlu melakukan query jarak jauh via HTTP ke user-service saat butuh informasi dasar pengguna, sehingga performanya sangat cepat.
- **Eventual Consistency**: Data di ketiga service akan sinkron dalam hitungan milidetik setelah event diproses oleh consumer RabbitMQ.

#### 5. Stateless Authentication & Distributed Session (JWT + Redis)

- Token autentikasi berupa JWT yang ditandatangani dengan secret key.
- Service hilir (`user-service` dan `gis-service`) dapat memverifikasi keabsahan JWT secara mandiri tanpa harus memanggil `auth-service` pada setiap request masuk.
- **Redis** digunakan untuk hal-hal yang butuh TTL (_Time-To-Live_) dan revocability cepat:
  - Token aktivasi akun via email (kedaluwarsa dalam 300 detik).
  - Penyimpanan `refresh_token:{uuid}` untuk mendukung fitur Logout / pencabutan sesi secara terpusat.

#### 6. Decoupled Object Storage (RustFS S3)

- File statis berukuran besar (seperti foto tempat, GeoTIFF, atau peta) tidak disimpan di dalam database relasional maupun filesystem lokal kontainer (yang bersifat _ephemeral_).
- File dialihkan ke **RustFS** yang kompatibel dengan protokol AWS S3 API (Port 8980), memudahkan penskalaan (_horizontal scaling_) jika sistem ingin dimigrasikan ke AWS S3, MinIO, atau Cloudflare R2.

#### 7. Observability & DevSecOps Ready

Di folder [be-geosandbox-infrastructure](file:///media/pratiwi24/c7468a67-9c5e-4403-93e8-cadc33a9abaf19/Project%20App/Express.js/be-geosandbox-infrastructure):

- **Prometheus & Grafana**: Memantau metrik throughput pesan RabbitMQ (port 15692), penggunaan resource host melalui Node Exporter, dan performa kontainer.
- **Jenkins & GitHub Actions Runner**: Menjamin otomatisasi integrasi dan deployment (CI/CD) ke server VM/EC2 secara konsisten.
