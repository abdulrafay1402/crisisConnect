
<!-- Header Wave -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=180&color=DC143C&section=header&text=🚨CrisisConnect&fontSize=48&fontColor=FFFFFF&animation=fadeIn&fontAlignY=38" alt="CrisisConnect Header">
</p>

<p align="center">
  <b>Disaster Response & Emergency Management Platform</b><br>
  Connecting Citizens, NGOs, Rescue Teams, and Administrators in Real-Time
</p>

<!-- Tech Badges -->
<p align="center">

  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-18+-DC143C?style=for-the-badge&logo=node.js&logoColor=white" />
  </a>

  <a href="https://expressjs.com/">
    <img src="https://img.shields.io/badge/Express.js-4.x-DC143C?style=for-the-badge&logo=express&logoColor=white" />
  </a>

  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React-18-DC143C?style=for-the-badge&logo=react&logoColor=white" />
  </a>

  <a href="https://vite.dev/">
    <img src="https://img.shields.io/badge/Vite-5-DC143C?style=for-the-badge&logo=vite&logoColor=white" />
  </a>

  <a href="https://www.microsoft.com/sql-server">
    <img src="https://img.shields.io/badge/SQL_Server-Database-DC143C?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" />
  </a>

</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" />
  <img src="https://img.shields.io/badge/License-Educational-DC143C?style=flat-square" />
  <img src="https://img.shields.io/badge/Built%20With-Love-DC143C?style=flat-square" />
</p>

---

Disaster response and emergency management platform combining Node.js/Express backend, React/Vite frontend, and Microsoft SQL Server. Supports role-based workflows for citizens, rescue teams, NGOs, and administrators with real-time coordination and resource management.

## Features

- Role-based access (Admin, Citizen, NGO, Rescue Team)
- Disaster and emergency tracking with alerts
- Resource and donation management
- Real-time messaging via Socket.IO
- JWT authentication with bcryptjs hashing
- Rate limiting, input sanitization, SQL injection prevention
- File uploads with OCR support

## Tech Stack

**Backend:** Node.js, Express, Socket.IO, JWT, bcryptjs, mssql, msnodesqlv8  
**Frontend:** React 18, Vite, Axios, React Router, Tailwind CSS, Leaflet, Recharts  
**Database:** Microsoft SQL Server 2016+

## Installation

**Prerequisites:** Node.js 18+, npm, Microsoft SQL Server 2016+

```bash
# Clone
git clone https://github.com/abdulrafay1402/crisisConnect.git
cd crisisConnect

# Install
cd backend && npm install
cd ../frontend && npm install
```

## Configuration

Create `backend/.env` from `backend/.env.example`:

```env
NODE_ENV=production
PORT=5000
DB_SERVER=your-sql-server
DB_PORT=1433
DB_NAME=DisasterManagement
DB_USER=sa
DB_PASSWORD=your-password
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

Apply schema:

```bash
sqlcmd -S your-server -U sa -P password -i database/disaster_management_consolidated.sql
```

## Usage

**Backend:**
```bash
cd backend
npm run dev    # Development
npm start      # Production
npm test       # Tests
```

**Frontend:**
```bash
cd frontend
npm run dev    # Development
npm run build  # Build
```

Backend: `http://localhost:5000` | Frontend: `http://localhost:5173`

## Project Structure

```
backend/src/       Controllers, models, middleware, routes
database/          SQL Server schema
frontend/src/      React components, pages
.gitignore         Ignore rules
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register/citizen` | Register |
| GET/POST | `/api/disasters` | Manage disasters |
| GET/POST | `/api/emergencies` | Manage emergencies |
| GET | `/api/resources` | List resources |
| POST | `/api/donations` | Create donation |
| GET | `/api/messages` | Get messages |
| GET | `/api/notifications` | Notifications |

## License

Educational and operational use.

---

<div align="center">

### Connect With Me

[![Email](https://img.shields.io/badge/Email-DC143C?style=for-the-badge&logo=gmail&logoColor=white)](mailto:abdulrafay1402@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-DC143C?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/arafay-ib)
[![GitHub](https://img.shields.io/badge/GitHub-DC143C?style=for-the-badge&logo=github&logoColor=white)](https://github.com/abdulrafay1402)
[![Issues](https://img.shields.io/badge/Report%20Issues-DC143C?style=for-the-badge&logo=github&logoColor=white)](https://github.com/abdulrafay1402/crisisConnect/issues)

<p>
  <em>"In times of crisis, coordination saves lives."</em>
</p>

</div>

<!-- Footer Wave -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=120&color=DC143C&section=footer" alt="Footer Wave">
</p>

