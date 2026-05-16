# Multi-Database Management Dashboard

Aplikacion web full-stack që menaxhon 3 databaza SQL Server përmes një interface të vetëm.

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express + mssql
- **Databaza**: SQL Server (3 db: personal_blog, movie_rental, student_gradebook)

## Struktura
```
project/
├── backend/
│   ├── config/db.js           # Connection pools
│   ├── controllers/           # Business logic
│   ├── routes/                # API endpoints
│   └── server.js
├── frontend/
│   └── src/
│       ├── pages/             # 3 dashboards
│       ├── components/        # Shared UI
│       └── services/api.js    # Axios calls
└── database/                  # SQL schemas + seed data
```

## Instalimi

### 1. Databaza
Hap SQL Server Management Studio dhe ekzekuto skedarët:
```
database/personal_blog.sql
database/movie_rental.sql
database/student_gradebook.sql
```

### 2. Backend
```bash
cd backend
npm install
```

Edito `.env` dhe vendos passwordin tënd:
```env
DB_PASSWORD=fjalëkalimi_yt
```

Starto:
```bash
npm run dev    # me nodemon (zhvillim)
npm start      # prodhim
```

Backend do të jetë aktiv në: `http://localhost:5000`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend do të jetë aktiv në: `http://localhost:5173`

## API Endpoints

### Blog (`/api/blog`)
| Method | Endpoint | Përshkrim |
|--------|----------|-----------|
| GET | /stats | Statistika |
| GET/POST | /users | Lista/Krijoni user |
| PUT/DELETE | /users/:id | Edito/Fshi user |
| GET/POST | /posts | Lista/Krijoni post |
| PUT/DELETE | /posts/:id | Edito/Fshi post |
| GET | /comments | Lista komenteve |
| PUT | /comments/:id/approve | Aprovo koment |
| DELETE | /comments/:id | Fshi koment |
| GET/POST | /categories | Kategoritë |
| GET/POST | /tags | Etiketat |

### Movies (`/api/movies`)
| Method | Endpoint | Përshkrim |
|--------|----------|-----------|
| GET | /stats | Statistika |
| GET/POST | / | Lista/Shto film |
| POST | /rent | Merr me qira |
| POST | /return/:id | Kthe filmin |
| GET | /customers | Lista klientëve |
| GET | /rentals/active | Qiratë aktive |
| GET | /transactions | Histori pagesash |

### Gradebook (`/api/gradebook`)
| Method | Endpoint | Përshkrim |
|--------|----------|-----------|
| GET | /stats | Statistika |
| GET/POST | /students | Studentët |
| GET/POST | /courses | Kurset |
| POST | /enrollments | Regjistro student |
| GET/POST | /grades | Notat |
| GET/POST | /assignments | Detyrat |
| GET/POST | /messages | Mesazhet |

## Karakteristika
- Dark/Light mode toggle
- Parameterized queries (SQL injection i parandaluar)
- Pagination për të gjitha tabelat
- Search & filter dinamik
- Toast notifications
- Loading skeletons
- Confirm modals për fshirje
- Soft delete (is_active flag)
- Auto-llogaritje GPA
- Late fee automatik për qira të vonuara
