# Abdi Nono Model Primary School results

A light results portal for **Abdi Nono Model Primary School**. Admins run the school records, teachers enter marks for the classes they are given, directors read school-wide reports, and students see only their own published results. The school name is the same in English, Afaan Oromoo, and Amharic, and an admin can change it in Settings.

The same code runs in two ways:

1. **Online** on Netlify with hosted Postgres (Neon or Netlify DB).
2. **Offline** on a school computer, reached by phones and PCs on the school Wi-Fi. No CDN, no Google fonts, no outside API.

## Demo logins

Seeded accounts do not force a password change, so you can open them immediately. Accounts created later start with the student ID as the password and must change it on first login.

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | the value of `SEED_ADMIN_PASSWORD` |
| Director | `director` | `director123` |
| Teacher (grade 5) | `tigist.bekele` | `ABT001` |
| Teacher (sciences) | `samuel.desta` | `ABT002` |
| Student | `abebe.kebede` | `AB0001` |

Other demo students use `first.father` as the username and their student ID (`AB0002` … `AB0012`) as the password. Examples: `chaltu.megersa` / `AB0002`, `tolosa.gemechu` / `AB0009` (grade 11 Natural), `yonas.tesfaye` / `AB0011` (grade 11 Social). Students and teachers must change that password on first login. The admin password is whatever you set in `SEED_ADMIN_PASSWORD` before seeding. It is not stored in this repository.

Turn `DEMO_HINTS` off before a real school uses the site. The login page hides the demo box when it is not `true`.

## What the school can do

- Grades are not fixed. The admin adds KG, 1–12, or any name, plus sections and streams such as Natural and Social.
- Each grade has its own subjects. A subject can apply to one stream or to the whole grade. Names are stored in English, Afaan Oromoo, and Amharic.
- New subjects start as class work 10, assignment 10, quiz 10, test 10, mid exam 20, final exam 40. The admin can change names and weights per subject.
- Pass or fail uses a percentage. The default pass mark is 50%, so it still means half even if the weights change.
- Totals, the average across that student's subjects, section rank, and pass/fail are calculated when the page is opened.
- Students see a semester only after the admin publishes it. Earlier years stay visible after promotion.
- Creating a student (one at a time or from Excel/CSV) creates the login. The username is lowercase `first.father`, with a number if that name is taken (`abebe.kebede2`). The first password is the student ID. The admin can see the username immediately, reset the password back to the student ID, and print or download the list.
- Year-end promotion moves a class to the next grade, with repeat and graduate exceptions. Old marks stay.
- The director dashboard is read-only: pass rates, averages, highest and lowest, female and male counts, top students, semester and year comparison, and which mark sheets are still incomplete. Reports export to Excel and PDF.
- The interface is English, Afaan Oromoo (Qubee), and Amharic (Ge'ez). The language switcher is on every page, including login, and is remembered on the account. Ge'ez uses the bundled Noto Sans Ethiopic font, including in PDFs.
- Dates can show the Ethiopian calendar beside the Gregorian date. That switch is in Settings.

## Local setup on a school computer

### Docker (simplest)

Install Docker Desktop, then from this folder:

```bash
./scripts/start-local.sh
```

On Windows, double-click `scripts/start-local.bat`.

Open `http://localhost:43123` on the school computer. On a phone, join the same Wi-Fi and open `http://` plus the computer's LAN address, for example `http://192.168.1.20:43123`. The start script prints the addresses it can see. Allow port **43123** through the computer firewall.

The database is Postgres inside Docker. Data stays in the `ifaboru-data` volume.

### Without Docker

You need Node.js 22 and Postgres.

```bash
cp .env.example .env
# Edit DATABASE_URL, DIRECT_URL, AUTH_SECRET, and SEED_ADMIN_PASSWORD.
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

`npm run dev` listens on port 43123. `npm run build && npm start` is the production server, which is what Docker runs.

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection. On Neon, use the pooled URL here. |
| `DIRECT_URL` | Direct Postgres URL used by Prisma migrations. Same as `DATABASE_URL` for a local database. |
| `AUTH_SECRET` | Long random string. Sessions are signed with it. |
| `SEED_ADMIN_PASSWORD` | Password for the seeded `admin` user. At least 8 characters. Used only by `npm run seed`. |
| `DEPLOYMENT_MODE` | `local` or `cloud`. Documentation only; both modes use the same code. |
| `COOKIE_SECURE` | Set `true` only behind HTTPS. Leave `false` for a school Wi-Fi server. Vercel sets secure cookies when `VERCEL=1`. |
| `DEMO_HINTS` | `true` shows demo logins on the login page. |
| `SYNC_TOKEN` | Shared secret for optional online sync. Set the same value on both servers. |
| `SYNC_REMOTE_URL` | Set only on the offline server: the public URL of the online site. |
| `APP_URL` | Public URL of this copy, for your own notes. |

## Deploy on Netlify

The repo includes `netlify.toml`. The build runs `prisma generate`, `prisma migrate deploy`, and `next build`, then `@netlify/plugin-nextjs` (OpenNext) serves the app.

1. Create a Postgres database. Neon and Netlify DB both work. Copy the **pooled** connection string into `DATABASE_URL` and the **direct** (non-pooled) string into `DIRECT_URL`. Prisma migrations use `DIRECT_URL`.
2. In Netlify: Add new site → Import an existing project → GitHub → `ayefita/abdi-nono-results-portal`. Netlify reads the build command from `netlify.toml`. Leave the publish directory as `.next`.
3. Set these environment variables on the site (Site configuration → Environment variables), for both production and deploy previews if you use them:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Pooled Postgres URL |
   | `DIRECT_URL` | Direct Postgres URL |
   | `AUTH_SECRET` | Long random string |
   | `SEED_ADMIN_PASSWORD` | Admin password, at least 8 characters. Needed only when you run the seed. |
   | `DEPLOYMENT_MODE` | `cloud` |
   | `DEMO_HINTS` | `false` on a real school site |
   | `COOKIE_SECURE` | `true` |

4. Deploy. The first build applies the Prisma migrations.
5. Seed the demo school once from your computer, with `.env` pointing at that same database: `npm run seed`. Do not commit that `.env`.

Docker and the offline school server are unchanged. `scripts/start-local.sh` still starts Postgres and the app on port 43123. Docker Compose passes `SEED_ADMIN_PASSWORD` (local default `local-dev-admin` when the variable is unset).

## Android app

`android-app` is a Capacitor wrapper named **Abdi Nono Results**. It opens the deployed site. Until that site exists, the address is `https://placeholder.abdinono.invalid`. Change it in one place:

```bash
cd android-app
SITE_URL=https://your-site.netlify.app npm run sync
```

The green-and-gold ANMPS icon and splash are in the Android resources. If the site cannot be reached, the wrapper shows `www/offline.html`. The Android back button walks the page history, then leaves the app. Report-card Print uses the Android print sheet, and file downloads go to the Downloads folder.

A debug APK is built by the GitHub Actions workflow `.github/workflows/android-apk.yml` (on a tag `android-v*` or when you run the workflow by hand). Set the repository variable `SITE_URL` to the Netlify address before that build. The workflow uploads the APK as an artifact.

Android Chrome can also install the site from the browser menu once it is served over HTTPS. The web manifest includes 192 and 512 PNG icons, a maskable icon, `display: standalone`, and a service worker.

## Languages

Translation files live in `messages/`:

- `messages/en.ts` is the source. Every key must exist in the other files.
- `messages/om.ts` is Afaan Oromoo.
- `messages/am.ts` is Amharic.

To add a language, for example Somali:

1. Copy `messages/en.ts` to `messages/so.ts` and translate the string values. Keep the keys.
2. Add `so` to the `Lang` union and the `dictionaries` map in `src/lib/i18n.ts`.
3. Add `{ code: "so", label: "Soomaali" }` to `LANGUAGE_NAMES` in that same file.

The switcher updates a cookie and, when someone is logged in, `preferredLanguage` on their account. Subject names, the school name, streams, years, and semesters are edited by the admin in all three languages. Those names are stored in the database, not in the translation files.

Noto Sans Ethiopic is stored in `public/fonts` (for the browser) and `assets/fonts` (for PDFs). Do not load fonts from a CDN.

## Backup, restore, and sync

**File backup (USB).** An admin downloads a JSON backup from Backup and sync. It contains students, marks, settings, and password hashes. Keep the file private. Restore it with **Merge** or **Replace**.

- **Merge** copies rows by id. If both sides changed the same row, the later `updatedAt` wins. If the times are equal, the file being imported wins. A delete wins when its tombstone is newer than the row. Use this after the two systems started from the same copy.
- **Replace** wipes this database and loads the file. Type `REPLACE` to confirm. You will need to log in again. Use this when the file is the new source of truth, or when the two databases were created separately and do not share ids.

Set the computer clock before syncing. Two schools that were never copied from each other should use Replace, not Merge, or they will keep both sets of records.

**Postgres dump.** On the school server, `scripts/backup.sh` writes `backups/ifaboru-DATE.sql`. Restore with `scripts/restore.sh backups/that-file.sql`.

**Optional online sync.** Put the same `SYNC_TOKEN` on the school server and the Vercel site. On the school server only, set `SYNC_REMOTE_URL` to the online URL. Push sends this database to the online site (merge). Pull brings the online database here (merge). The same conflict rules apply. If the token or URL is missing, the buttons explain that sync is off and the USB file still works.

## Offline results on a phone

The app is a small PWA. Static files, the logo, and the Ethiopic font are bundled. After a student logs in and opens My results while the school Wi-Fi is up, the service worker keeps that page. If the phone later has no connection, the saved results page can still open. Mark entry is not cached, so teachers do not keep a stale sheet.

## Tests

```bash
npm test
npm run test:access
```

`npm test` checks usernames, mark totals, rank, the Ethiopian calendar, role rules, and that every English string exists in Afaan Oromoo and Amharic.

`npm run test:access` needs the server running. It logs in as each role and checks that a student cannot read another student's marks or an unpublished semester, that a director can read but cannot change marks or settings, and that a teacher can save marks only for an assigned class.

## Roles

Access is checked in middleware and again in server actions and API routes.

| | Admin | Teacher | Director | Student |
| --- | --- | --- | --- | --- |
| Students, settings, publish | edit | no | no | no |
| Marks | edit any class | assigned classes only | read | own published marks only |
| Reports | through the records | own classes | whole school, read-only | own report card |
