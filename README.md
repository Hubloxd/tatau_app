# tatau_app

Backend: FastAPI, PostgreSQL, uploady lokalnie (`STORAGE_MODE=local`) lub do GCS. Frontend: Angular 21 + Tailwind (katalog `frontend/`).

## Wymagania

- Node.js 24 (np. `nvm use` — w repo jest [`.nvmrc`](.nvmrc))
- Python 3.12+ i `pip` (backend poza Dockerem)
- Docker Compose (opcjonalnie, cały stack)

## Cały stack w Dockerze

Z katalogu głównego:

```bash
docker compose up --build
```

- API: [http://localhost:8000](http://localhost:8000) (Swagger: `/docs`)
- Frontend: [http://localhost:4200](http://localhost:4200) (proxy do API w kontenerze)

Pliki uploadów lądują w `./uploads` (zamontowany wolumen).

## Backend lokalnie (bez Dockera)

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Utwórz `.env` z m.in.:

```env
DATABASE_URL=postgresql://USER:PASS@localhost:5432/DBNAME
POSTGRES_SSLMODE=require
STORAGE_MODE=local
PUBLIC_BASE_URL=http://localhost:8000
LOCAL_UPLOAD_DIR=uploads
```

Uruchomienie:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend lokalnie

Zobacz [frontend/README.md](frontend/README.md).

Stary statyczny frontend znajduje się w `frontend_old/` (referencja).
