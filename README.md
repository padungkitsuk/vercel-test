# hello-vercel: React (Vite) + Spring Boot

```
hello-vercel/
├── vercel.json          # วิธี A: deploy web + api ใน Vercel project เดียว (Services)
├── web/                 # React + Vite
│   ├── src/App.jsx      # เรียก GET {VITE_API_BASE_URL}/api/hello
│   └── .env.example
└── api/                 # Spring Boot 3.5 + Java 17 + Maven
    ├── src/main/java/com/example/hello/
    │   ├── HelloController.java   # GET /api/hello?name=...
    │   └── CorsConfig.java        # อ่าน CORS_ALLOWED_ORIGINS
    ├── Dockerfile.vercel          # image สำหรับ Vercel (ฟังพอร์ต 80)
    └── Dockerfile                 # image ทั่วไปสำหรับ Render/Railway/Fly (พอร์ต 8080)
```

## รันบนเครื่อง

ต้องมี Java 17 ขึ้นไป, Maven 3.9+, Node 20+

```bash
# Terminal 1: API ที่ http://localhost:8080
cd api
mvn spring-boot:run
# ทดสอบ: curl "http://localhost:8080/api/hello?name=Vercel"

# Terminal 2: Web ที่ http://localhost:5173
cd web
npm install
npm run dev
```

ตอน dev ฝั่ง Vite จะ proxy `/api` ไปที่ `localhost:8080` ให้เอง จึงไม่ต้องตั้ง `VITE_API_BASE_URL` และไม่ติด CORS

---

# วิธี deploy บน Vercel

## ข้อควรรู้ก่อน: Vercel กับ Java

Vercel **ไม่มี runtime สำหรับ Java โดยตรง** (runtime ทางการมีแค่ Node.js, Bun, Python, Go, Ruby, Rust, Wasm, Edge)
แต่ตอนนี้ Vercel รองรับ **Container Images (Beta, ทุก plan)**: ใส่ไฟล์ `Dockerfile.vercel` แล้ว Vercel จะ build image และรันเป็น Vercel Function ให้
Spring Boot จึงขึ้น Vercel ได้ผ่านทางนี้

สิ่งที่ต้องรู้เกี่ยวกับ Container บน Vercel (จาก docs ณ ต.ค. 2026):
- container ต้องเปิด HTTP server ที่ **พอร์ต 80** (หรือตั้ง env `PORT` ใน Project Settings เพื่อเปลี่ยน) ซึ่ง `Dockerfile.vercel` ในโปรเจคนี้ตั้ง `PORT=80` ไว้แล้ว และ Spring อ่าน `server.port=${PORT:8080}`
- ถ้าไม่มี traffic 5 นาที (production) หรือ 30 วินาที (preview) instance จะถูกปิด รอบถัดไปจะมี **cold start** ของ Spring Boot ราวไม่กี่วินาที
- คิดเงินแบบ Active CPU และใช้ limit เดียวกับ Vercel Functions
- ยังเป็น **Beta**: ถ้าต้องการความเสถียรระดับ production ดูวิธี C

มี 3 ทางเลือก:

| วิธี | web | api | CORS | เหมาะกับ |
|---|---|---|---|---|
| **A. Project เดียว (Services)** แนะนำ | Vercel | Vercel (container) | ไม่ต้อง (domain เดียว) | ง่ายสุด, ทดลอง |
| B. แยก 2 Projects บน Vercel | Vercel | Vercel (container) | ต้องตั้ง | อยาก deploy แยกกัน |
| C. Web บน Vercel, API ที่อื่น | Vercel | Render / Railway / Fly.io / Cloud Run | ต้องตั้ง | production ที่ไม่อยากพึ่ง Beta |

ทุกวิธีเริ่มจาก push โฟลเดอร์ `hello-vercel/` ขึ้น GitHub repo ก่อน (ให้ `vercel.json` อยู่ที่ root ของ repo)

---

## วิธี A: Web + API ใน Vercel Project เดียว (Services)

`vercel.json` ที่ root ทำงานนี้ให้แล้ว:

```json
{
  "services": {
    "web": { "root": "web/", "framework": "vite" },
    "api": { "root": "api/", "entrypoint": "Dockerfile.vercel" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "api" } },
    { "source": "/(.*)",     "destination": { "service": "web" } }
  ]
}
```

request ไป `/api/hello` จะเข้า Spring Boot โดย path ยังเป็น `/api/hello` เหมือนเดิม ส่วน path อื่นไปที่ React

ขั้นตอน:
1. ไปที่ https://vercel.com/new แล้ว Import repo
2. **Root Directory ให้เป็น root ของ repo** (ที่มี `vercel.json`) ไม่ต้องเลือก Framework
3. กด Deploy (ไม่ต้องตั้ง `VITE_API_BASE_URL` เพราะเรียก same origin)
4. เปิด `https://<project>.vercel.app` แล้วกด "Say hello"
   ทดสอบ API ตรงๆ: `https://<project>.vercel.app/api/hello?name=Vercel`

หรือใช้ CLI:
```bash
npm i -g vercel
cd hello-vercel
vercel          # preview
vercel --prod   # production
```

---

## วิธี B: แยก Web และ API เป็น 2 Projects บน Vercel

### B1. Deploy API
1. https://vercel.com/new → Import repo เดิม
2. **Root Directory = `api`** (Vercel จะเจอ `Dockerfile.vercel` และ build เป็น container เอง)
3. Environment Variables:
   - `CORS_ALLOWED_ORIGINS` = `https://<web-project>.vercel.app,https://<web-project>-*.vercel.app`
     (ตัวที่สองครอบ preview URLs; ใส่ค่าทีหลังได้ แล้ว Redeploy)
4. Deploy แล้วจด URL เช่น `https://hello-api-xxx.vercel.app`
5. ทดสอบ: `curl https://hello-api-xxx.vercel.app/api/hello`

CLI: `cd api && vercel --prod` แล้วตั้ง env ด้วย `vercel env add CORS_ALLOWED_ORIGINS production`

### B2. Deploy Web
1. https://vercel.com/new → Import repo เดิมอีกครั้ง (เป็น project ใหม่)
2. **Root Directory = `web`**, Framework = Vite (ปกติ detect ให้เอง)
   Build Command `npm run build`, Output `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL` = `https://hello-api-xxx.vercel.app` (ไม่ต้องมี `/` ท้าย)
4. Deploy

> `VITE_*` ถูกฝังตอน **build** ถ้าแก้ค่า ต้อง Redeploy web ใหม่ทุกครั้ง

> ถ้าใช้วิธี B ให้ลบหรือไม่สนใจ `vercel.json` ที่ root ได้ เพราะเมื่อตั้ง Root Directory เป็น `api` หรือ `web` Vercel จะไม่อ่านไฟล์นั้น

---

## วิธี C: Web บน Vercel, API บน host ที่รัน Docker/Java ได้

ใช้ `api/Dockerfile` (พอร์ต 8080, อ่าน `PORT` จาก host) กับผู้ให้บริการไหนก็ได้ ตัวอย่าง Render:
1. https://render.com → New → Web Service → เลือก repo
2. Root Directory = `api`, Runtime = Docker
3. Environment: `CORS_ALLOWED_ORIGINS=https://<web-project>.vercel.app`
4. Deploy แล้วจด URL เช่น `https://hello-api.onrender.com`

Railway / Fly.io / Google Cloud Run ก็ทำแบบเดียวกัน (ชี้ไปที่ `api/Dockerfile`)

จากนั้น deploy web ตามขั้น **B2** โดยตั้ง `VITE_API_BASE_URL` เป็น URL ของ API

---

## CORS

ต้องตั้งเฉพาะเมื่อ web กับ api อยู่คนละ domain (วิธี B, C)

`api/src/main/java/com/example/hello/CorsConfig.java` อนุญาต origin จาก env `CORS_ALLOWED_ORIGINS` (คั่นด้วย `,` และใช้ `*` แทน subdomain ได้):

```properties
# application.properties
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

ตัวอย่างค่า:
```
CORS_ALLOWED_ORIGINS=https://hello-web.vercel.app,https://hello-web-*.vercel.app
```

ตรวจว่าใช้ได้:
```bash
curl -i -H "Origin: https://hello-web.vercel.app" https://<api-url>/api/hello
# ต้องเห็น header: Access-Control-Allow-Origin: https://hello-web.vercel.app
```

## Troubleshooting

| อาการ | สาเหตุที่พบบ่อย |
|---|---|
| หน้าเว็บขึ้น `Error: Failed to fetch` | CORS ไม่ตรง origin ของ web หรือ `VITE_API_BASE_URL` ผิด/ไม่ได้ redeploy หลังแก้ |
| API บน Vercel ตอบ 502/timeout | container ไม่ได้ฟังพอร์ต 80 (หรือตั้ง `PORT` ใน Project Settings ไม่ตรง) |
| request แรกช้า | cold start ของ Spring Boot หลัง instance ถูกปิด เป็นปกติ |
| Web ขึ้น 404 ตอน refresh หน้าย่อย | โปรเจคนี้มีหน้าเดียว ถ้าเพิ่ม React Router ให้เพิ่ม rewrite ไป `/index.html` |

## อ้างอิง
- Vercel Runtimes: https://vercel.com/docs/functions/runtimes
- Vercel Container Images: https://vercel.com/docs/functions/container-images
- Vercel Services: https://vercel.com/docs/services
- Services routing: https://vercel.com/docs/services/routing
