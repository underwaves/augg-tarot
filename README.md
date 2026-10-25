# 🔮 Magical Pastel Tarot - ระบบจัดการและติดตามคิวเปิดไพ่ทาโรต์ออนไลน์

เว็บไซต์ระบบจัดการคิวและติดตามคิวลูกค้าสำหรับร้านเปิดไพ่ทาโรต์ออนไลน์ ภายใต้แนวคิด **Magical Pastel Tarot** โทนสีพาสเทล ละมุน สดใส อบอุ่น แฝงกลิ่นอายเวทมนตร์และจักรวาล (Lavender, Soft Purple, Pink, Baby Pink, Mint Green, Pale Yellow) พร้อมระบบหลังบ้านและหน้าติดตามคิวลูกค้าที่ใช้งานได้จริง 100%

---

## 🌟 จุดเด่นและฟังก์ชันหลักของระบบ

### 1. บทบาทผู้ใช้งาน (User Roles & RBAC)
- **เจ้าของร้าน (Owner):** มีสิทธิ์สูงสุดในการควบคุมระบบ แดชบอร์ด จัดการคิว จัดลำดับ ลัดคิว ยกเลิกคิว เพิ่ม/แก้ไขสิทธิ์แอดมิน และตรวจสอบบันทึกประวัติระบบ (Audit Log)
- **แอดมิน (Admin):** เข้าสู่ระบบเพื่อจัดการคิว รับคิว เปลี่ยนสถานะคิว เลื่อน/ลัดคิว และส่งลิงก์ให้ลูกค้าตามสิทธิ์ที่ได้รับมอบหมาย
- **ลูกค้า (Customer):** เปิดดูสถานะคิวของตนเองผ่านลิงก์เฉพาะบุคคล (`/track/:token`) โดย**ไม่ต้องสมัครสมาชิก ไม่ต้องเข้าสู่ระบบ และไม่เห็นข้อมูลส่วนตัวของลูกค้าคนอื่น**

### 2. ความปลอดภัยระดับสูง (Security & Privacy)
- **สิทธิ์การติดตามคิวผ่าน Cryptographic Token:** ลิงก์ติดตามใช้การสุ่มแบบนิรนามความยาวสูง (43 ตัวอักษร) และจัดเก็บในฐานข้อมูลเฉพาะ **SHA-256 Hash** เท่านั้น
- **Zero PII Leakage:** หน้าติดตามคิวลูกค้าจะแสดงเฉพาะเลขคิว, ชื่อเล่น, แพ็กเกจ, สถานะ, และจำนวนคิวก่อนหน้า **ไม่เปิดเผยหมายเหตุภายในร้าน (Internal Note) หรือข้อมูลลูกค้าคนอื่นอย่างเด็ดขาด**
- **Authentication:** ระบบล็อกอินใช้ HTTP-Only Cookie ร่วมกับ JWT (Jose) และการเข้ารหัสรหัสผ่านด้วย `bcryptjs`
- **ระบบป้องกันการยกระดับสิทธิ์:** แอดมินไม่สามารถแก้ไขสิทธิ์ของตนเองหรือแตะต้องบัญชีของเจ้าของร้านได้ และระบบป้องกันการระงับเจ้าของร้านคนสุดท้าย

### 3. ระบบเลขคิวอัตโนมัติ (Atomic Queue Sequence)
- รูปแบบเลขคิว: `TQ-YYYYMMDD-XXXX` (เช่น `TQ-20261025-0001`)
- ออกเลขคิวผ่านฐานข้อมูลแบบ Atomic Transaction ป้องกันปัญหาเลขคิวซ้ำกัน แม้มีแอดมินหลายคนกดบันทึกพร้อมกัน

### 4. ระบบลัดคิวและเลื่อนคิวแบบไร้ข้อผิดพลาด (Conflict-Free Reordering)
- สามารถเลื่อนคิวขึ้น/ลงทีละลำดับ หรือระบุหมายเลขลำดับที่ต้องการลัดคิวได้โดยตรง
- ระบบจะคำนวณและจัดเรียงลำดับใหม่ทั้งหมดในธุรกรรมฐานข้อมูลเดียว (Single Transaction) ป้องกันการเกิดลำดับซ้ำซ้อน

### 5. ประวัติการใช้งานและความโปร่งใส (Audit Log)
- บันทึกทุกกิจกรรมสำคัญ: การเข้าสู่ระบบ, เพิ่มคิว, แก้ไขคิว, เปลี่ยนสถานะ, เลื่อน/ลัดคิว, สร้างลิงก์, เพิกถอนลิงก์, และการจัดการแอดมิน พร้อมระบุผู้ทำรายการและเวลา

---

## 🛠️ โครงสร้างเทคโนโลยี (Tech Stack)

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, Custom Magical Pastel Color Palette, Glassmorphism, Google Fonts (`IBM Plex Sans Thai`, `Cinzel`)
- **Icons & Effects:** Lucide React, Canvas Confetti
- **ORM & Database:** Prisma ORM, SQLite (`dev.db` ใช้งานได้ทันทีแบบ Zero Setup) และพร้อมเชื่อมต่อ **PostgreSQL / Supabase** ได้ทันทีผ่าน `prisma/supabase_schema.sql`
- **Security:** Jose (JWT), Bcryptjs, Node Crypto (SHA-256)

---

## 🔒 การตั้งค่าความปลอดภัยและคีย์ระบบ (Security Configuration)

ระบบต้องการคีย์ความปลอดภัย `JWT_SECRET` สำหรับลงนาม Session Cookie ของผู้ดูแลระบบ:
- **ข้อกำหนดความปลอดภัย:** ต้องมีความยาวอย่างน้อย **32 ตัวอักษร** และเป็นค่าสุ่มที่ปลอดภัยสูง
- **ข้อห้ามเด็ดขาด:** **ห้ามใส่ secret จริงหรือคอมมิตไฟล์ `.env` ลงใน Git เด็ดขาด**

สร้าง Secret สุ่มที่ปลอดภัยด้วยคำสั่ง:
```bash
# ทางเลือกที่ 1: ใช้ OpenSSL
openssl rand -base64 32

# ทางเลือกที่ 2: ใช้ Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
นำค่าที่ได้ไปกำหนดในไฟล์ `.env`:
```env
JWT_SECRET="<ค่า_secret_ที่สุ่มได้ความยาวเกิน_32_ตัวอักษร>"
```
*(หากไม่มี `JWT_SECRET` หรือสั้นกว่า 32 ตัวอักษร ระบบจะแจ้ง Configuration Error และปฏิเสธการทำงานเพื่อความปลอดภัย)*

---

## 🚀 วิธีติดตั้งและการตั้งค่าระบบ (Setup Guide)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

---

### 💻 การตั้งค่าสำหรับทดลองในเครื่อง (Local Development Setup)

1. คัดลอกไฟล์ตัวแปรสภาพแวดล้อม:
```bash
cp .env.example .env
```
กำหนด `JWT_SECRET` ใน `.env` ให้มีความยาวอย่างน้อย 32 ตัวอักษร

2. ซิงค์โครงสร้างฐานข้อมูลและเพิ่มข้อมูลทดลอง:
```bash
npx prisma db push
npm run db:seed
```
> **หมายเหตุ:** `npm run db:seed` ทำงานแบบปลอดภัยและรันซ้ำได้ (Idempotent) โดย**ไม่ลบและไม่เขียนทับข้อมูลเดิม**

3. เริ่มต้นรันเซิร์ฟเวอร์ในโหมด Development:
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`

#### ข้อมูลบัญชีสำหรับทดลองใช้งานใน Development (Dev Demo Credentials):
| บทบาท | อีเมล | รหัสผ่าน | หมายเหตุ |
| :--- | :--- | :--- | :--- |
| **👑 เจ้าของร้าน (Owner)** | `owner@magicaltarot.com` | `Password123!` | สิทธิ์เต็มทุกส่วน รวมถึงจัดการแอดมินและดู Audit Log |
| **🔮 แอดมิน (Admin)** | `admin@magicaltarot.com` | `Password123!` | จัดการคิว, เปลี่ยนสถานะ, เลื่อนคิว, สร้างลิงก์ |

*(ในโหมด Development จะมีปุ่ม **"ทดลองเข้าสู่ระบบด่วน (Quick Demo)"** ในหน้าล็อกอินเพื่อความสะดวกรวดเร็ว)*

#### การล้างข้อมูลเดโม (Demo Reset):
หากต้องการล้างข้อมูลเพื่อเริ่มจำลองสถานการณ์ใหม่ ให้ใช้คำสั่งเฉพาะที่มีระบบป้องกัน:
```bash
npm run db:reset-demo -- --confirm-reset-demo
```
*(คำสั่งนี้จะถูกบล็อกโดยอัตโนมัติในโหมด Production เพื่อป้องกันความผิดพลาด)*

---

### 🌐 การตั้งค่าบัญชีและระบบสำหรับ Production (Production Setup)

1. เตรียมไฟล์ `.env` สำหรับ Production:
```env
DATABASE_URL="postgresql://user:password@host:port/database" # หรือ path ฐานข้อมูลจริง
JWT_SECRET="<random_secret_at_least_32_chars>"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_SHOP_NAME="Magical Pastel Tarot 🔮"

# กำหนดบัญชีเจ้าของร้านคนแรกสำหรับ Production
INITIAL_OWNER_EMAIL="owner@yourdomain.com"
INITIAL_OWNER_PASSWORD="<รหัสผ่านที่ปลอดภัยอย่างน้อย_8_ตัวอักษร>"
INITIAL_OWNER_NAME="ชื่อเจ้าของร้าน"
```

2. เตรียมฐานข้อมูลและสร้างบัญชีเจ้าของร้านคนแรก:
```bash
npx prisma db push
NODE_ENV=production npm run db:seed
```
- ระบบจะสร้างเฉพาะบัญชี Owner เริ่มแรกตามค่าใน Environment Variables
- **ไม่สร้างคิวตัวอย่างและไม่สร้างโทเคน Demo ใดๆ ใน Production โดยปริยาย**
- หากรันซ้ำ ระบบจะไม่ลบหรือเขียนทับรหัสผ่านเดิมของบัญชีผู้ใช้ที่มีอยู่แล้ว

3. คอมไพล์และเปิดบริการ:
```bash
npm run build
npm start
```

*(ในโหมด Production ปุ่มและข้อมูล Quick Demo จะถูกซ่อนทั้งหมดโดยอัตโนมัติ)*

---

## 📱 เส้นทางหน้าเว็บ (Routes Sitemap)

- `/login` : หน้าเข้าสู่ระบบหลังบ้านธีมเวทมนตร์พาสเทล
- `/admin/dashboard` : แดชบอร์ดสรุปสถิติคิว 7 มิติ (คิวทั้งหมด, วันนี้, รอคิว, กำลังทำ, เสร็จแล้ว, ยกเลิก, ค้างรวม) ดึงจากฐานข้อมูลจริง
- `/admin/queues` : ตารางจัดการคิวทั้งหมด พร้อมระบบค้นหา, ตัวกรองสถานะ/วันที่, ปุ่มลัดคิว, และปรับเป็นการ์ดบนมือถือ
- `/admin/queues/new` : แบบฟอร์มเพิ่มคิวลูกค้าใหม่ พร้อมออกเลขคิวอัตโนมัติและสร้างลิงก์ติดตามทันที
- `/admin/queues/:id` : หน้ารายละเอียดคิว, แก้ไขข้อมูล, เปลี่ยนสถานะ, เพิกถอน/สร้างลิงก์ใหม่, และดูประวัติการแก้ไขคิว
- `/admin/calendar` : ปฏิทินและตารางคิวรายวัน เลือกดูย้อนหลังหรือล่วงหน้าได้สะดวก
- `/admin/history` : คลังประวัติคิวเก่าที่เสร็จสิ้นหรือยกเลิก ค้นหาย้อนหลังได้ตลอดเวลา
- `/admin/users` : หน้าจัดการบัญชีแอดมิน กำหนดสิทธิ์รายบุคคล และระงับบัญชี (เฉพาะเจ้าของร้าน)
- `/admin/logs` : หน้าตรวจสอบบันทึกกิจกรรม Audit Log
- `/track/:token` : **หน้าติดตามคิวสำหรับลูกค้า** ออกแบบน่ารักเป็นพิเศษ แสดงจำนวนคิวก่อนหน้า สถานะ และอัปเดตข้อมูลอัตโนมัติทุก 10 วินาที

---

## 💾 การสำรองและกู้คืนข้อมูล (Backup & Restore)

### สำหรับ SQLite (การใช้งานเครื่องหรือเซิร์ฟเวอร์ส่วนตัว)
1. **การสำรองข้อมูล (Backup):**
   คัดลอกไฟล์ `prisma/dev.db` ไปเก็บไว้ในโฟลเดอร์สำรองข้อมูลหรือ Cloud Storage
   ```bash
   # ตัวอย่างคำสั่งบน PowerShell
   Copy-Item "prisma\dev.db" -Destination "backups\tarot_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
   ```
2. **การกู้คืนข้อมูล (Restore):**
   นำไฟล์สำรองที่ต้องการมาแทนที่ `prisma/dev.db` แล้วรันคำสั่ง `npx prisma generate`

### สำหรับ Supabase / PostgreSQL (Production Cloud)
1. รันไฟล์ `prisma/supabase_schema.sql` ใน Supabase SQL Editor
2. เปลี่ยน `DATABASE_URL` ในไฟล์ `.env` เป็น Connection String ของ Supabase:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```
3. เปลี่ยน `provider = "postgresql"` ใน `prisma/schema.prisma` แล้วรัน:
   ```bash
   npx prisma db push
   ```
4. ระบบ Supabase มีฟังก์ชัน Point-in-time Recovery และ Daily Automated Backup ให้ในตัว

---

## ⏳ นโยบายวันหมดอายุของโทเคนติดตามคิว (Token Expiration Policy)

- **พฤติกรรมเริ่มต้น (Default):** โทเคนและลิงก์ติดตามคิวที่สร้างขึ้นจะ**ไม่มีวันหมดอายุโดยอัตโนมัติ** (`expiresAt: null`) เพื่อป้องกันไม่ให้ลิงก์ของลูกค้าที่กำลังใช้งานอยู่หมดอายุโดยไม่ตั้งใจ
- **การกำหนดอายุผ่าน Environment Variable (TTL):** หากร้านค้าต้องการกำหนดให้ลิงก์หมดอายุหลังจากเปิดคิว สามารถกำหนดค่าได้ใน `.env`:
  ```env
  TRACKING_TOKEN_TTL_DAYS=30
  ```
  *(กำหนดอายุโทเคนที่สร้างใหม่เป็นจำนวนวัน เช่น 30 วัน เมื่อครบกำหนด ลูกค้าที่เปิดลิงก์จะได้รับแจ้ง HTTP 410 ว่าลิงก์หมดอายุแล้ว)*
- **การคัดลอกลิงก์ (Copy Link):** การกดปุ่ม "คัดลอกลิงก์" ในหน้ารายละเอียดคิว จะคัดลอก URL เดิมของคิวโดยตรง **ไม่มีการสร้างโทเคนใหม่ และไม่มีการเพิกถอนลิงก์เดิมที่เคยส่งให้ลูกค้า**
- **การออกลิงก์ใหม่ (Regenerate Link):** หากต้องการยกเลิกการเข้าถึงของลิงก์เก่า ต้องกดปุ่ม "ออกลิงก์ใหม่" ซึ่งจะมีกล่องข้อความยืนยันเตือนก่อนเพิกถอนโทเคนเก่าทันที

---

## ⚠️ ข้อจำกัดของ SQLite และแนวทางสำหรับ Multi-Instance / Serverless

### ข้อจำกัดสำคัญของ SQLite:
1. **การล็อกไฟล์ (File-level Locking & Single Writer):**
   SQLite อนุญาตให้เขียนข้อมูลได้ครั้งละหนึ่ง Process เท่านั้น หากมีคำขอสร้างคิวหรืออัปเดตสถานะพร้อมกันสูง อาจเกิดปัญหา `database is locked` หรือ `database table is busy`
2. **ระบบไฟล์ชั่วคราวบน Serverless (Ephemeral Filesystems):**
   บนแพลตฟอร์มอย่าง Vercel, AWS Lambda, หรือ Google Cloud Run ตัว Container หรือ Instance จะหมุนเวียนและสร้างขึ้น/ทำลายทิ้งตลอดเวลา หากเก็บไฟล์ SQLite ไว้บน Instance ข้อมูลจะสูญหายทันทีเมื่อ Instance ปิดตัว
3. **ปัญหาการไม่ซิงค์ข้อมูลระหว่างหลาย Instance (Multi-instance Inconsistency):**
   หากระบบทำการขยายขนาดแนวนอน (Horizontal Scaling) โดยเปิดมากกว่า 1 Container พร้อมกัน แต่ละ Container จะมีไฟล์ SQLite ของตนเอง ทำให้ข้อมูลคิวระหว่าง Container ไม่ตรงกัน

### แนวทางสถาปัตยกรรมที่แนะนำ:
| รูปแบบการติดตั้ง | ฐานข้อมูลที่แนะนำ | แนวทางการจัดการ |
| :--- | :--- | :--- |
| **เซิร์ฟเวอร์เดี่ยว (Single VPS / Dedicated Docker)** | SQLite | ติดตั้งบน Persistent Volume โดยตรง และใช้ [Litestream](https://litestream.io/) เพื่อสตรีมสำรองข้อมูลแบบ Realtime ไปยัง S3/GCS |
| **ขยายหลายเครื่อง / คลาวด์ (Multi-instance / Cloud Run / ECS)** | Managed PostgreSQL (Supabase / Neon / Cloud SQL) | เปลี่ยน provider ใน `prisma/schema.prisma` เป็น `postgresql` เพื่อรองรับการเขียนพร้อมกันและการแชร์ข้อมูลที่ถูกต้อง |
| **Serverless (Vercel / Cloudflare)** | PostgreSQL with Connection Pooler | ใช้งาน PostgreSQL ร่วมกับ Prisma Accelerate หรือ PgBouncer เพื่อจัดการ Connection อย่างมีประสิทธิภาพ |
