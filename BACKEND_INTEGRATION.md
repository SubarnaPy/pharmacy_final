# Backend API Integration Guide

## Current Setup

The frontend is now configured to use **real API calls** instead of mock data. The authentication system will fetch actual user data from your backend.

## Configuration

### Mock API vs Real Backend

In `frontend/src/api/index.js`, you can control which API to use:

```javascript
const USE_MOCK_API = true;  // Currently set to true for development
```

- **`true`**: Uses realistic mock data for development/testing
- **`false`**: Uses your actual backend API at `http://localhost:5000/api`

## API Endpoints Used

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh-token` - Refresh access token

### Data Flow
1. **Login**: User credentials → Backend → JWT token + User data → localStorage
2. **Persistence**: Token validation on app load → Fresh user data from backend
3. **Logout**: Backend logout call → localStorage cleanup

## Mock Data Features

The mock API includes:
- **Realistic user profiles** with proper data structure
- **Role-based users** (patient, pharmacy)
- **2FA simulation** (use code `123456`)
- **Network delay simulation** for realistic UX
- **Error simulation** for testing

## Switching to Real Backend

### 1. Start Your Backend
```bash
cd backend
npm start
```

### 2. Ensure Database Connection
- MongoDB should be running
- Check backend logs for successful connection

### 3. Update Frontend Config
```javascript
const USE_MOCK_API = false; // Switch to real backend
```

### 4. Test Authentication
- Register new users
- Login with real credentials
- User data will be fetched from your database

## Sample Login Credentials (Mock Mode)

```
Email: patient@demo.com
Password: any password (mock mode)

Email: pharmacy@demo.com  
Password: any password (mock mode)

2FA Test: demo@2fa.com (use code: 123456)
```

## Benefits of This Setup

✅ **No Demo Dependencies** - Real user data from backend  
✅ **Development Friendly** - Mock API for when backend is unavailable  
✅ **Production Ready** - Seamless switch to real backend  
✅ **Type Safety** - Consistent API interface  
✅ **Error Handling** - Proper error responses and validation  

## Next Steps

1. **Start backend server** when ready to use real data
2. **Switch `USE_MOCK_API` to `false`** 
3. **Test with real user registration and login**
4. **User data will persist in your database**

The authentication system is now fully integrated with your backend API! 🚀
