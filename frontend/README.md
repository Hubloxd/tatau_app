# Frontend (Angular)

Projekt wygenerowany [Angular CLI](https://github.com/angular/angular-cli) 21.x, Tailwind CSS 4 (`@import 'tailwindcss'` w `src/styles.css`).

## Serwer deweloperski

Użyj Node **24** (w katalogu nadrzędnym repozytorium jest `.nvmrc`):

```bash
nvm use 24
npm install
npm start
```

Aplikacja: [http://localhost:4200](http://localhost:4200). Skrypt `start` ustawia `--poll` (lepsze działanie na WSL/Docker volume) i korzysta z [proxy.conf.json](proxy.conf.json): żądania do `/user`, `/image`, `/interaction`, `/comment`, `/static` idą na backend pod `http://localhost:8000`.

Backend musi działać osobno (lub przez `docker compose` tylko serwisy `db` + `backend`).

## Docker (sam frontend w kontenerze)

Z katalogu głównego repozytorium, żeby zbudować i uruchomić tylko frontend w tle:

```bash
docker compose up -d --build frontend
```

Frontend używa [proxy.conf.docker.json](proxy.conf.docker.json) (`start:docker`), target API: `http://backend:8000`. Cały stack: `docker compose up -d --build`.

## Pozostałe polecenia

| Cel | Polecenie |
|-----|-----------|
| Build dev | `ng build --configuration development` |
| Build prod | `ng build` |
| Testy | `ng test` |
| Nowy komponent | `ng generate component nazwa` |

Pełna dokumentacja CLI: [Angular CLI](https://angular.dev/tools/cli).
