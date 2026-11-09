# Baco360 Frontend - Backend Integration Guide

## Overview
This frontend application is now configured to connect with a Lavalust PHP backend. All API endpoints, authentication, and data services are set up and ready for integration.

## Backend Requirements

### Backend Base URL
- **Development**: The frontend uses `/api`; the Vite proxy forwards it to
  `http://localhost/CiviConnect/baco360backend/public/api`.
- **Production**: Configure the deployed API base URL via `.env`.

### Authentication
The application expects JWT-based authentication with the following endpoints:

#### Auth Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-2fa` - Verify 2FA code
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/user/me` - Get current user

#### Report Endpoints
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get single report
- `POST /api/reports` - Submit new report
- `PUT /api/reports/:id` - Update report
- `POST /api/reports/:id/comments` - Add comment
- `POST /api/reports/:id/assign` - Assign to staff

Report email notifications follow each recipient's email and report-update preferences. Status changes, including resolution and rejection details, are emailed to the report's resident. Public staff updates are emailed individually; internal notes are not emailed. Assignment emails go to the selected staff member, and residents are notified by email only when an existing assignment changes to a different staff member. These emails use the existing email delivery log and do not require a new migration.

#### Admin Endpoints
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/toggle` - Toggle user
- `PUT /api/admin/users/:id/role` - Update role
- `GET /api/categories` - Get categories
- `POST /api/categories` - Add category
- `GET /api/admin/audit-logs` - Get logs
- `GET /api/admin/email-deliveries` - Review email delivery status (admin only); optional `status=pending|sent|failed`, `page`, and `per_page`

#### Announcements
- `GET /api/announcements` - Get announcements for the signed-in user
- `POST /api/announcements` - Publish an announcement (admin/staff); creates in-app recipient records and attempts email delivery to active residents and staff
- `PUT /api/announcements/:id` - Edit an active announcement (admin/staff); does not resend email
- `PATCH /api/announcements/:id/archive` - Hide an announcement from residents while retaining it for staff/admin
- `PATCH /api/announcements/:id/restore` - Restore an archived announcement
- `PATCH /api/announcements/:id/read` - Mark an announcement as read
- `GET /api/notifications` - Includes report notifications and announcements in the notification bell; announcement IDs are negative in this combined feed and are mapped to their announcement record when marked read

### Expected Response Format

All endpoints should return:
```json
{
  "success": boolean,
  "data": any,
  "message": "string",
  "errors": {}
}
```

## Configuration

### Environment Setup
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=30000
```

### Backend CORS
```php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
```

## Project Structure

```
src/
├── config/api.config.ts       # API configuration
├── lib/api.client.ts          # Axios client
├── services/                  # API services
│   ├── auth.service.ts
│   ├── reports.service.ts
│   ├── user.service.ts
│   ├── categories.service.ts
│   ├── announcements.service.ts
│   └── admin.service.ts
└── contexts/AuthContext.tsx   # Auth provider
```

## Usage

### Install Dependencies
```bash
npm install
```

### Start Development
```bash
npm run dev
```

### Using Services
```tsx
import { reportsService } from './services/reports.service'

const response = await reportsService.getReports()
if (response.success) {
  console.log(response.data.reports)
}
```

## Next Steps

1. Implement backend endpoints
2. Match response formats
3. Test integration
4. Deploy

**Ready for Lavalust backend connection!**
