# Baco360 Frontend

A modern civic reporting system built with React, TypeScript, and Vite - **Ready for Lavalust Backend Integration**

## 🚀 Features

- 📱 Responsive civic reporting interface
- 👥 Multi-role support (Resident, Staff, Admin)
- 🔐 JWT Authentication with 2FA
- 🌍 Multi-language support (English/Tagalog)
- 📊 Dashboard and analytics
- 🗺️ Location-based reporting
- 📎 File attachments support
- 🔔 Notification management

## 🛠️ Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Axios** for API communication
- **Lucide React** for icons
- **Oxlint** for code quality

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start development server
npm run dev
```

## 🔧 Backend Integration

This frontend is **fully configured** for Lavalust backend connection.

### Quick Setup:

1. **Backend URL**: With this project at `C:\wamp64\www\Baco360`, start WampServer
   (Apache and MySQL) and the Vite proxy forwards `/api` to
   `http://localhost/Baco360/baco360backend/public`. The default `.env` uses this
   same-origin path:
   ```env
   VITE_API_BASE_URL=/api
   ```

2. **Start Development**:
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   ```

3. **Use API Services**:
   ```tsx
   import { authService } from './services/auth.service'
   import { reportsService } from './services/reports.service'
   
   // Login
   await authService.login({ email, password })
   
   // Get reports
   const reports = await reportsService.getReports()
   ```

### 📚 Documentation

- **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)** - Quick overview of what's ready
- **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** - Complete integration guide

## 📂 Project Structure

```
src/
├── config/               # API configuration
│   └── api.config.ts
├── lib/                  # Core utilities
│   └── api.client.ts     # Axios HTTP client
├── services/             # API services layer
│   ├── auth.service.ts
│   ├── reports.service.ts
│   ├── user.service.ts
│   ├── categories.service.ts
│   └── admin.service.ts
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication state
├── components/           # Reusable components
├── pages/                # Page components
└── data/                 # Mock data & types
```

## 🔐 Authentication

The app includes a complete authentication system:

```tsx
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Wrap your app
<AuthProvider>
  <App />
</AuthProvider>

// Use in components
const { user, login, logout, isAuthenticated } = useAuth()
```

## 🌐 API Services

All API endpoints are configured and ready:

- **Authentication**: Login, register, 2FA, logout
- **Reports**: CRUD operations, comments, assignments
- **Users**: Profile, notification settings, user management
- **Categories**: Category management
- **Admin**: Audit logs, dashboard stats

## 🧪 Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📋 Backend Requirements

Your Lavalust backend should implement:

### Response Format
```json
{
  "success": boolean,
  "data": any,
  "message": "string",
  "errors": {}
}
```

### CORS Setup
```php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
```

### Key Endpoints
- `POST /api/auth/login`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/admin/users`
- `GET /api/categories`

See [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) for complete endpoint list.

## ✨ What's Included

- ✅ Complete API service layer
- ✅ Authentication context with auto token management
- ✅ Axios client with interceptors
- ✅ Error handling
- ✅ File upload support
- ✅ TypeScript types
- ✅ Development proxy
- ✅ Environment configuration

## 🎯 Next Steps

1. Implement Lavalust backend endpoints
2. Match the expected response format
3. Test the integration
4. Deploy!

## 📄 License

This project is part of Baco360 - A civic engagement platform.

---

**Status**: ✅ Ready for Lavalust Backend Connection

For questions or issues, refer to the integration documentation.
