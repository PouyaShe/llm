# لرن‌لایو — پلتفرم کلاس آنلاین ۲۰۲۶

پلتفرم مدرن کلاس آنلاین با ویدیو کنفرانس واقعی (WebRTC)، وایت‌برد تعاملی، اشتراک صفحه، چت real-time، پیام‌رسان خصوصی مدیر↔استاد، سیستم دسترسی زنده، و داشبوردهای مدیر/استاد/دانشجو.

**زبان رابط کاربری:** فارسی (RTL) — **تم:** تیره/روشن

---

## فهرست

- [امکانات](#امکانات)
- [پشته فناوری](#پشته-فناوری)
- [پیش‌نیازها](#پیش‌نیازها)
- [نصب روی لینوکس](#نصب-روی-لینوکس)
- [نصب روی ویندوز](#نصب-روی-ویندوز)
- [پیکربندی محیط](#پیکربندی-محیط)
- [راه‌اندازی دیتابیس](#راه‌اندازی-دیتابیس)
- [اجرای سرویس Socket](#اجرای-سرویس-socket)
- [اجرای پروژه](#اجرای-پروژه)
- [گیت‌وی Caddy](#گیتوی-caddy)
- [حساب‌های دمو](#حساب‌های-دمو)
- [ساختار پروژه](#ساختار-پروژه)
- [استقرار روی VPS](#استقرار-روی-vps)
- [عیب‌یابی](#عیب‌یابی)

---

## امکانات

### کلاس زنده
- 📹 ویدیو کنفرانس چندکاربره با WebRTC (mesh) + تشخیص گوینده فعال
- 🖼 وایت‌برد تعاملی با هم‌نوشت real-time (قلم، پاک‌کن، رنگ، ضخامت)
- 🖥 اشتراک صفحه واقعی (getDisplayMedia)
- 💬 چت متنی در هر جلسه + پیام خصوصی استاد↔دانشجو
- ⏺ ضبط جلسه (شاخص REC)
- ✋ بلند کردن دست، 🔇 قطع صدا توسط استاد، 👢 اخراج

### سیستم دسترسی زنده
- دانشجو تا اجازه‌ی استاد نمی‌تواند میکروفون/وب‌کم/اشتراک صفحه/وایت‌برد را استفاده کند — فقط چت
- استاد از پنل «افراد» به‌صورت زنده اجازه می‌دهد یا می‌گیرد
- مدیر می‌تواند قدرت استاد را محدود کند (ساخت کلاس / برگزاری جلسه)

### پیام‌رسان خصوصی
- چت ۱:۱ بین مدیر و اساتید (real-time با Socket.io)
- باز/بسته/حذف گفتگو توسط هر دو طرف
- نشانگر تایپ، شمارش خوانده‌نشده، لیست گفتگوها

### مدیریت
- **مدیر**: آمار real-time، مدیریت کاربران (نقش، وضعیت، پرچم‌های استاد)، مدیریت کلاس‌ها، مدیریت دسترسی دانشجویان، جلسات
- **استاد**: کلاس‌ها، زمان‌بندی جلسه، مدیریت دانشجویان کلاس، پیام‌رسان
- **دانشجو**: کلاس‌های ثبت‌نامی، عضویت با کد، جلسات زنده، پیوستن به کلاس

### رابط کاربری
- طراحی مدرن ۲۰۲۶، تم تیره/روشن، فونت Vazirmatn
- کاملاً ریسپانسیو و RTL
- انیمیشن‌های نرم، اسکرول‌بار سفارشی، نشانگرهای زنده

---

## پشته فناوری

| لایه | فناوری |
|---|---|
| فریمورک | Next.js 16 (App Router) |
| زبان | TypeScript 5 |
| استایل | Tailwind CSS 4 + shadcn/ui |
| دیتابیس | Prisma ORM + SQLite (قابل تعویض به MySQL/PostgreSQL) |
| احراز هویت | JWT (jose) + bcryptjs + cookie |
| Real-time | Socket.io (سرویس جداگانه روی پورت ۳۰۰۳) |
| ویدیو | WebRTC (mesh peer connections) |
| تم | next-themes |
| اجرا | Bun (پیشنهادی) یا Node.js |

---

## پیش‌نیازها

### روی هر دو سیستم‌عامل:
- **Bun** (پیشنهادی) نسخه ۱.۱ به بالا — [نصب Bun](https://bun.sh)
  - یا **Node.js** ۱۸ به بالا + npm
- **Git**
- اتصال اینترنت (برای نصب پکیج‌ها و STUN سرور WebRTC)

> برای تولید (production) توصیه می‌شود از MySQL یا PostgreSQL به جای SQLite استفاده کنید (فقط `provider` در `prisma/schema.prisma` را عوض کنید).

---

## نصب روی لینوکس

### ۱. نصب Bun
```bash
# با curl
curl -fsSL https://bun.sh/install | bash

# یا با npm
npm install -g bun

# بررسی
bun --version
```

### ۲. کلون پروژه
```bash
git clone <your-repo-url> learnlive
cd learnlive
```

### ۳. نصب وابستگی‌ها
```bash
bun install
```

### ۴. نصب وابستگی‌های سرویس Socket
```bash
cd mini-services/classroom-socket
bun install
cd ../..
```

### ۵. اجرای مراحل [پیکربندی محیط](#پیکربندی-محیط) و [راه‌اندازی دیتابیس](#راه‌اندازی-دیتابیس)

---

## نصب روی ویندوز

### ۱. نصب Bun
```powershell
# با PowerShell
powershell -c "irm bun.sh/install.ps1|iex"

# یا با npm
npm install -g bun

# بررسی
bun --version
```

> **بدیل:** اگر Bun روی ویندوز مشکل داشت، از Node.js استفاده کنید:
> ```powershell
> # نصب Node.js از https://nodejs.org
> npm install
> npm run dev   # به جای bun run dev
> ```

### ۲. کلون پروژه
```powershell
git clone <your-repo-url> learnlive
cd learnlive
```

### ۳. نصب وابستگی‌ها
```powershell
bun install
```

### ۴. نصب وابستگی‌های سرویس Socket
```powershell
cd mini-services/classroom-socket
bun install
cd ../..
```

### ۵. ادامه با [پیکربندی محیط](#پیکربندی-محیط)

---

## پیکربندی محیط

فایل `.env` در ریشه پروژه بسازید (یا ویرایش کنید):

```env
# دیتابیس SQLite (پیش‌فرض)
DATABASE_URL="file:./db/custom.db"

# برای MySQL (تولید):
# DATABASE_URL="mysql://user:password@localhost:3306/learnlive"

# برای PostgreSQL (تولید):
# DATABASE_URL="postgresql://user:password@localhost:5432/learnlive"

# رمز JWT (حتماً در تولید تغییر دهید!)
JWT_SECRET="your-super-secret-key-change-in-production"
```

> **مهم:** در محیط تولید، `JWT_SECRET` را یک رشته‌ی تصادفی طولانی قرار دهید.

---

## راه‌اندازی دیتابیس

### ۱. اعمال schema
```bash
bun run db:push
```

### ۲. تولید Prisma Client
```bash
bun run db:generate
```

### ۳. (اختیاری) بذر داده‌ی اولیه — حساب‌های دمو + کلاس نمونه
```bash
bunx tsx prisma/seed.ts
```

این دستور حساب‌های زیر را می‌سازد:

| نقش | ایمیل | رمز |
|---|---|---|
| مدیر | admin@classroom.io | admin123 |
| استاد | teacher@classroom.io | teacher123 |
| دانشجو | student@classroom.io | student123 |

---

## اجرای سرویس Socket

سرویس real-time (Socket.io) باید روی **پورت ۳۰۰۳** در پس‌زمینه اجرا شود:

```bash
cd mini-services/classroom-socket
bun run dev
```

خروجی مورد انتظار:
```
[classroom-socket] Socket.io server running on port 3003
[classroom-socket] path: "/" | CORS: * | pingTimeout: 60000 | pingInterval: 25000
```

برای اجرای دائمی در پس‌زمینه (لینوکس):
```bash
nohup bun run dev > service.log 2>&1 &
```

> **توجه:** این سرویس هم کلاس زنده (rooms, WebRTC signaling) و هم پیام‌رسان خصوصی (DM) را مدیریت می‌کند.

---

## اجرای پروژه

### حالت توسعه
```bash
bun run dev
```
پروژه روی `http://localhost:3000` اجرا می‌شود.

### بررسی کد
```bash
bun run lint
```

### حالت تولید (build)
```bash
bun run build
bun run start
```

---

## گیت‌وی Caddy

این پروژه از یک گیت‌وی Caddy استفاده می‌کند تا فقط یک پورت بیرونی暴露 شود و درخواست‌ها بر اساس کوئری `XTransformPort` به سرویس‌های مختلف مسیریابی شوند.

### فایل `Caddyfile` نمونه:
```caddyfile
:81 {
    @transform_port_query {
        query XTransformPort=*
    }

    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort} {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }

    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
```

### اجرای Caddy:
```bash
caddy run --config Caddyfile
```

حالا برنامه روی `http://localhost:81` در دسترس است و اتصالات Socket.io از طریق `/?XTransformPort=3003` به سرویس Socket هدایت می‌شوند.

> **قانون مهم:** در کد فرانت‌اند، همیشه از مسیر نسبی استفاده کنید و پورت را فقط در کوئری `XTransformPort` بگذارید:
> ```ts
> io('/?XTransformPort=3003')   // ✅ درست
> io('http://localhost:3003')   // ❌ غلط
> ```

---

## حساب‌های دمو

پس از اجرای `bunx tsx prisma/seed.ts`:

| نقش | ایمیل | رمز | دسترسی |
|---|---|---|---|
| مدیر | admin@classroom.io | admin123 | همه چیز |
| استاد | teacher@classroom.io | teacher123 | کلاس‌ها، جلسات، پیام‌رسان |
| دانشجو | student@classroom.io | student123 | کلاس‌های ثبت‌نامی |

---

## ساختار پروژه

```
learnlive/
├── prisma/
│   ├── schema.prisma          # مدل‌های دیتابیس
│   └── seed.ts                # بذر داده‌ی اولیه
├── src/
│   ├── app/
│   │   ├── api/               # API routes (Next.js Route Handlers)
│   │   │   ├── auth/          # ورود، ثبت‌نام، خروج، me
│   │   │   ├── users/         # مدیریت کاربران (مدیر)
│   │   │   ├── courses/       # کلاس‌ها + عضویت + دسترسی دانشجویان
│   │   │   ├── sessions/      # جلسات + شروع/پایان + پیام‌ها
│   │   │   ├── dm/            # پیام‌رسان خصوصی
│   │   │   ├── stats/         # آمار مدیر
│   │   │   └── notifications/
│   │   ├── layout.tsx         # RTL + Vazirmatn + ThemeProvider
│   │   ├── page.tsx           # روتر SPA (Zustand)
│   │   └── globals.css        # تم emerald 2026
│   ├── components/
│   │   ├── ui/                # کامپوننت‌های shadcn/ui
│   │   ├── classroom/         # کلاس زنده + hook + وایت‌برد
│   │   ├── dashboard/         # داشبوردهای مدیر/استاد/دانشجو + shell
│   │   ├── messenger/         # پیام‌رسان خصوصی + hook
│   │   ├── auth/              # صفحه ورود/ثبت‌نام
│   │   ├── landing.tsx
│   │   └── theme-provider.tsx
│   └── lib/
│       ├── auth.ts            # JWT + bcryptjs + cookie
│       ├── db.ts              # Prisma Client
│       ├── store.ts           # Zustand (auth + view router)
│       └── ui.ts              # کمکی‌های رنگ/زمان
├── mini-services/
│   └── classroom-socket/      # سرویس Socket.io (پورت ۳۰۰۳)
│       ├── index.ts
│       └── package.json
├── db/                        # فایل SQLite
├── Caddyfile                  # گیت‌وی
├── package.json
└── README.md
```

---

## استقرار روی VPS

### لینوکس (Ubuntu/Debian)

#### ۱. نصب پیش‌نیازها
```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

#### ۲. کلون و نصب
```bash
git clone <repo> /opt/learnlive
cd /opt/learnlive
bun install
cd mini-services/classroom-socket && bun install && cd ../..
```

#### ۳. پیکربندی `.env` برای تولید
```bash
cp .env .env.production
nano .env.production
# DATABASE_URL را به MySQL/PostgreSQL تنظیم کنید
# JWT_SECRET را تصادفی کنید
```

#### ۴. ساخت و اجرا
```bash
bun run db:push
bun run db:generate
bun run build
```

#### ۵. سرویس systemd برای Next.js
فایل `/etc/systemd/system/learnlive.service`:
```ini
[Unit]
Description=LearnLive Next.js
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/learnlive
EnvironmentFile=/opt/learnlive/.env.production
ExecStart=/home/www-data/.bun/bin/bun run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### ۶. سرویس systemd برای Socket
فایل `/etc/systemd/system/learnlive-socket.service`:
```ini
[Unit]
Description=LearnLive Socket.io
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/learnlive/mini-services/classroom-socket
ExecStart=/home/www-data/.bun/bin/bun run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### ۷. فعال‌سازی و اجرا
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now learnlive
sudo systemctl enable --now learnlive-socket
sudo systemctl status learnlive learnlive-socket
```

#### ۸. نصب Caddy به‌عنوان reverse proxy
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

فایل `/etc/caddy/Caddyfile` را با دامنه‌ی خود ویرایش کنید، سپس:
```bash
sudo systemctl restart caddy
```

### ویندوز (IIS یا سرویس)

روی ویندوز سرور می‌توانید از **NSSM** یا **pm2** برای اجرای دائمی استفاده کنید:

#### با NSSM:
```powershell
# نصب NSSM از https://nssm.cc/download
nssm install LearnLive "C:\Users\YourUser\.bun\bin\bun.exe" "run start"
nssm set LearnLive AppDirectory "C:\opt\learnlive"
nssm set LearnLive AppEnvironmentExtra "NODE_ENV=production"
nssm start LearnLive

nssm install LearnLiveSocket "C:\Users\YourUser\.bun\bin\bun.exe" "run start"
nssm set LearnLiveSocket AppDirectory "C:\opt\learnlive\mini-services\classroom-socket"
nssm start LearnLiveSocket
```

#### با IIS به‌عنوان reverse proxy:
ماژول **URL Rewrite** و **Application Request Routing (ARR)** را نصب کنید و درخواست‌ها را به `localhost:3000` هدایت کنید. برای WebSocket، ARR را برای پشتیبانی از WebSocket پیکربندی کنید.

---

## عیب‌یابی

### ❌ «Can't resolve 'socket.io-client'»
```bash
bun add socket.io-client
```

### ❌ خطای Prisma «Unknown column canCreateClass»
Prisma Client با schema همگام نیست:
```bash
bun run db:push
bun run db:generate
# سپس dev server را ری‌استارت کنید
```

### ❌ سرویس Socket اجرا نمی‌شود (پورت ۳۰۰۳ اشغال است)
```bash
# لینوکس
lsof -i :3003
kill -9 <PID>

# ویندوز
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

### ❌ ویدیو/صدا در مرورگر کار نمی‌کند
- WebRTC به **HTTPS** نیاز دارد (یا `localhost`). در تولید حتماً با TLS/SSL از Caddy یا Let's Encrypt استفاده کنید.
- دسترسی به دوربین/میکروفون را در مرورگر تأیید کنید.
- در محیط بدون دوربین (headless)، برنامه با fallback آواتار کار می‌کند.

### ❌ پیام‌رسان real-time کار نمی‌کند
- مطمئن شوید سرویس Socket روی ۳۰۰۳ در حال اجراست.
- از طریق گیت‌وی (پورت ۸۱) دسترسی داشته باشید، نه مستقیم پورت ۳۰۰۰.
- کنسول مرورگر را بررسی کنید: اتصال Socket باید `Connected` باشد.

### ❌ اتصال WebRTC بین دو کاربر برقرار نمی‌شود
- برای بیش از چند کاربر، به یک media server (Jitsi/Janus) نیاز دارید.
- در این sandbox، STUN سرور عمومی Google استفاده می‌شود؛ در شبکه‌های محدودکننده به TURN سرور نیاز است.

### ❌ تم یا فونت درست نیست
- مطمئن شوید `<html lang="fa" dir="rtl">` در `layout.tsx` تنظیم شده.
- فونت Vazirmatn از Google Fonts بارگذاری می‌شود — به اینترنت دسترسی باشد.

### ری‌استارت کامل
```bash
# توقف همه
pkill -f "next dev"
pkill -f "bun --hot"

# پاک‌سازی کش
rm -rf .next

# شروع دوباره
bun run db:push
bun run db:generate
cd mini-services/classroom-socket && bun run dev &
cd ../..
bun run dev
```

---

## مجوز

این پروژه برای استفاده‌ی آموزشی و تجاری آزاد است.

ساخته‌شده با ❤️ — **لرن‌لایو ۲۰۲۶**
