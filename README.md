# 🎱 Boule-klubben - Socialboule

Ett komplett system för att hantera boule-kvällar med spelare, lag, matcher, ranking och resultat.

## 📱 Webbstruktur

Appen har **två huvudsakliga delar**: en för alla spelare och en för admins.

### 🌐 Publika Sidor (Tillgängliga för alla)

#### **`/` - Startsida (Spelare-vy)**
- **Vem ser den:** Alla
- **Vad finns här:**
  - 👤 Välj vem du är (PlayerSelector)
  - 📅 Kommande kvällar
  - 📊 Dina resultat och statistik
  - 💚 Lagkemi - vem du spelar bäst med
  - 🏆 Topplista
- **Navigation:** Liten "Admin →" länk uppe till höger

#### **`/nights/[id]` - Kvällsdetalj (Spelare-vy)**
- **Vem ser den:** Alla
- **Vad finns här:**
  - ✅ Närvaroregistrering (anmäl dig)
  - 👥 Se vilka som är anmälda
  - 🎲 Se laglottningar och matcher
  - 📝 Rapportera matchresultat
  - 📈 Se ställningar
- **URL exempel:** `/nights/abc123`

#### **`/spelare` - Spelare-lista**
- **Vem ser den:** Alla
- **Vad finns här:** Lista på alla spelare med stats

#### **`/lag` - Lag-lista**
- **Vem ser den:** Alla
- **Vad finns här:** Lista på alla lag (vid laglottning)

---

### 🔐 Admin-Sidor (Endast för Admins)

> **Viktigt:** Dessa sidor kräver att du är inloggad OCH har `isAdmin = true` i databasen.

#### **`/admin` - Admin-översikt**
- **Vem ser den:** Endast admins
- **Vad finns här:**
  - 📋 Alla kvällar (kommande + tidigare)
  - ➕ Skapa ny kväll
  - ✏️ Redigera kvällar
  - 🗑️ Ta bort kvällar
  - 👥 Hantera spelare (lägg till/ta bort)
- **Funktioner:**
  - Se antal anmälda per kväll
  - Skapa kvällar med datum, tid, plats, typ (dag/kväll)
  - Sätt max antal spelare
  - Välj lottningsläge (individuell/lag)

#### **`/admin/kvall/[id]` - Kvällsadministration**
- **Vem ser den:** Endast admins
- **Vad finns här:**
  - ✏️ Redigera kvällsdetaljer
  - ✅ Hantera närvaro (lägg till/ta bort spelare)
  - 🎲 Lotta rundor (Runda 1, 2, 3)
  - 🔄 Återställ rundor
  - 👥 Se alla matcher
  - 📊 Se ställningar
  - 📝 Redigera matchresultat manuellt
- **URL exempel:** `/admin/kvall/abc123`
- **Skillnad mot `/nights/[id]`:** Har ALLA admin-funktioner (lottning, återställning, manuell redigering)

#### **`/admin/onskemal` - Önskemål från spelare**
- **Vem ser den:** Endast admins
- **Vad finns här:** Lista på spelares önskemål om spelkvällar
- **Används för:** Planera kommande kvällar baserat på intresse

---

## 🔐 Autentiseringssystem

### Hur det fungerar

1. **Välj spelare på startsidan**
   - Alla ser PlayerSelector-komponenten
   - När du väljer en spelare skapas en session (cookie)
   - Sessionen varar i 30 dagar

2. **Admin-kontroll**
   - Vissa API-endpoints kräver admin-rättigheter
   - Admin-sidor (`/admin`) kräver `isAdmin = true`
   - Icke-admins får 403 Forbidden om de försöker

3. **Session-API**
   - `GET /api/auth/session` - Hämta nuvarande session
   - `POST /api/auth/session` - Logga in (skapa session)
   - `DELETE /api/auth/session` - Logga ut

---

## 🛡️ Säkerhet & Behörigheter

### Admin-krävande Operationer

| Operation | Endpoint | Kräver Admin |
|-----------|----------|--------------|
| Skapa kväll | `POST /api/boule-nights` | ✅ Ja |
| Redigera kväll | `PATCH /api/boule-nights/[id]` | ✅ Ja |
| Ta bort kväll | `DELETE /api/boule-nights/[id]` | ✅ Ja |
| Lotta rundor | `POST /api/boule-nights/[id]/draw-round-*` | ✅ Ja |
| Återställ runda | `POST /api/boule-nights/[id]/reset-round` | ✅ Ja |
| Skapa lag | `POST /api/teams` | ✅ Ja |
| Redigera lag | `PUT /api/teams/[id]` | ✅ Ja |
| Ta bort lag | `DELETE /api/teams/[id]` | ✅ Ja |

### Publika Operationer

| Operation | Endpoint | Kräver Admin |
|-----------|----------|--------------|
| Anmäla närvaro | `POST /api/boule-nights/[id]/attendance` | ❌ Nej |
| Rapportera matchresultat | `PATCH /api/matches/[id]` | ❌ Nej |
| Se kvällar | `GET /api/boule-nights` | ❌ Nej |
| Se spelare | `GET /api/players` | ❌ Nej |
| Se lag | `GET /api/teams` | ❌ Nej |

---

## 📊 Funktioner

### För Spelare
- ✅ Anmäla sig till kvällar
- 📊 Se sina resultat och statistik
- 💚 Se lagkemi med andra spelare
- 🏆 Se topplista
- 📝 Rapportera matchresultat
- ⭐ Markera favoriter

### För Admins
- ➕ Skapa och redigera kvällar
- 👥 Hantera spelare och lag
- 🎲 Lotta rundor (3 rundor)
- 🔄 Återställa rundor vid behov
- 📊 Se alla stats och ranking
- 🗑️ Ta bort kvällar och lag
- 📋 Se spelares önskemål

---

## 🚀 Installation & Setup

### 1. Installera beroenden
```bash
npm install
```

### 2. Sätt upp databas
```bash
# Kör migrationer
npx prisma migrate dev

# Generera Prisma-klient
npx prisma generate
```

### 3. Skapa första admin
```bash
# Om du har en tom databas
npm run db:seed

# ELLER manuellt via Prisma Studio
npx prisma studio
# Gå till Player-tabellen och sätt isAdmin = true på din spelare
```

### 4. Starta utvecklingsserver
```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000)

---

## 🗂️ Projektstruktur

```
socialboule/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Startsida (spelare-vy)
│   │   ├── nights/[id]/page.tsx        # Kvällsdetalj (spelare-vy)
│   │   ├── spelare/page.tsx            # Spelare-lista
│   │   ├── lag/page.tsx                # Lag-lista
│   │   ├── admin/
│   │   │   ├── page.tsx                # Admin-översikt
│   │   │   ├── kvall/[id]/page.tsx     # Kvällsadministration
│   │   │   └── onskemal/page.tsx       # Spelares önskemål
│   │   └── api/                        # API routes
│   ├── components/                      # Återanvändbara komponenter
│   ├── lib/
│   │   ├── auth.ts                     # Autentisering & auktorisering
│   │   ├── draw-helpers.ts             # Lottningslogik
│   │   └── prisma.ts                   # Prisma-klient
│   └── services/                        # Business logic
├── prisma/
│   ├── schema.prisma                   # Databasschema
│   ├── seed.ts                         # Seed script (skapar admin)
│   └── migrations/                     # Databasmigrationer
├── tests/                               # Tests
├── SETUP.md                             # Detaljerad setup-guide
└── README.md                            # Den här filen
```

---

## 🎮 Användning

### Som Spelare

1. **Gå till startsidan** (`/`)
2. **Välj ditt namn** i PlayerSelector
3. **Anmäl dig** till kommande kvällar
4. **Rapportera resultat** efter match
5. **Se din statistik** och lagkemi

### Som Admin

1. **Logga in** som spelare med `isAdmin = true`
2. **Gå till `/admin`** (klicka "Admin →" på startsidan)
3. **Skapa kvällar** med formuläret
4. **Hantera närvaro** när spelare anmäler sig
5. **Lotta rundor** när det är dags att spela
6. **Följ upp resultat** och ställningar

---

## 🔧 Teknisk Stack

- **Framework:** Next.js 16 (App Router)
- **Databas:** PostgreSQL via Neon
- **ORM:** Prisma
- **Styling:** Tailwind CSS 4
- **Autentisering:** Session-baserad med HTTP-only cookies
- **TypeScript:** Ja
- **Testing:** Vitest

---

## 📖 Dokumentation

- **SETUP.md** - Detaljerad guide för setup och autentisering
- **prisma/schema.prisma** - Databasschema med kommentarer
- **src/lib/auth.ts** - Autentiseringssystem

---

## 🐛 Felsökning

### "Unauthorized: You must be logged in"
→ Välj din spelare på startsidan för att logga in

### "Forbidden: Admin access required"
→ Din spelare saknar admin-rättigheter. Se SETUP.md för att göra dig till admin

### Admin-sidor syns inte
→ Kontrollera att `isAdmin = true` för din spelare i databasen

### "Närvarolistan har ändrats av någon annan"
→ Detta är förväntat när två personer sparar samtidigt. Ladda om sidan.

---

## 📝 Licens

Privat projekt

---

## 🤝 Bidra

Detta är ett privat projekt för en specifik boule-klubb.

---

**Skapad med ❤️ för Boule-klubben**
