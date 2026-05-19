# Project Sofia 2

A comprehensive image folder management and viewing system, rewritten from the original Python FastAPI project into a modern Spring Boot and React stack.

## 🚀 Project Overview

Sofia 2 is designed to manage and view image files organized in folders. It scans physical directories, stores metadata and folder structures in a PostgreSQL database, generates thumbnails, and provides a rich web interface for browsing and viewing images with EXIF metadata support.

- **Backend:** Spring Boot 3.4.x, Java 17/21, Spring Security (JWT with HttpOnly Cookies), JPA (PostgreSQL).
- **Frontend:** React 19, Vite, Tailwind CSS 4, shadcn/ui, AG Grid, Zustand, React Router 7, TanStack Query.
- **Database:** PostgreSQL.
- **Auth:** JWT-based authentication with Access and Refresh tokens.

## 🛠 Building and Running

The project provides several convenience scripts in the root directory:

### Backend (Spring Boot)
Use `./bm.sh` for backend management:
- `./bm.sh run`: Start the development server (default port: `9595`, context-path: `/sofia`).
- `./bm.sh build`: Full build (compile + JAR/WAR).
- `./bm.sh clean`: Clean build artifacts.
- `./bm.sh test`: Run tests.

### Frontend (React)
Use `./fm.sh` for frontend management:
- `./fm.sh dev`: Start the Vite development server (default port: `5173`).
- `./fm.sh install`: Install npm dependencies.
- `./fm.sh build`: Production build.
- `./fm.sh lint`: Run ESLint.

### Database
Use `./db.sh` for database operations:
- Provides a menu for listing tables, viewing table descriptions, running SQL, and performing backups.

### Deployment
- `./deploy.sh`: Handles the deployment process to the production server (`jskn.iptime.org`).

## ⚙️ Configuration

The project uses environment variables managed through `.env` files.

- **SOFIA_MODE:** Determines which environment file to load (e.g., `local`, `prod`). Defaults to `local`.
- **Environment Files:** `.env.local`, `.env.prod`, etc., should be located in the root or `backend/` directory.
- **Key Variables:**
  - `DB_USERNAME` / `DB_PASSWORD`: PostgreSQL credentials.
  - `JWT_SECRET`: Secret key for JWT signing.
  - `SOFIA_MODE`: Active profile/mode.

## 📂 Project Structure

### Backend (`/backend`)
- `src/main/java/kr/co/kalpa/sofia/`: Root package.
  - `controller/`: REST endpoints.
  - `domain/`: JPA Entities (User, ImageFile, ImageFolder, etc.).
  - `dto/`: Data Transfer Objects.
  - `repository/`: Spring Data JPA repositories.
  - `security/`: JWT and Security configuration.
  - `service/`: Business logic (ImageService, FolderService, etc.).
- `src/main/resources/`: Configuration files (`application.properties`).

### Frontend (`/frontend`)
- `src/domain/`: Business-logic specific pages and components (e.g., `folder/`, `user/`).
- `src/shared/`: Reusable components, hooks, and layouts.
- `src/lib/`: API clients (axios) and utility functions.
- `src/store/`: Zustand state management (auth, UI, status).
- `src/components/ui/`: shadcn/ui components.

## 📝 Development Conventions

- **Frontend Structure:** Pages should be organized by domain under `src/domain/`. UI components should use shadcn/ui.
- **API Communication:** Use the centralized axios instance in `src/lib/api.ts` which handles JWT tokens automatically via HttpOnly cookies.
- **State Management:** Use Zustand for lightweight global state.
- **Backend Packages:** Follow the established package structure. Use `@JsonIgnoreProperties` on entities to prevent infinite recursion during JSON serialization.
- **Thumbnails:** Generated using Thumbnailator and stored in the path defined by `sofia.base.folder`.

## 🌐 API & Endpoints

- **Health Check:** `http://localhost:9595/sofia/pcms/health`
- **Frontend Dev Server:** `http://localhost:5173`
- **Backend API Base:** `http://localhost:9595/sofia/api/` (proxied from frontend dev server)
