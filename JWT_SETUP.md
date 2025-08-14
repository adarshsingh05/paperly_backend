# JWT Authentication Setup Guide

## Environment Variables Required

Add these to your `.env` file:

```env
# Database Configuration
MONGODB_URI=your_mongodb_connection_string_here

# JWT Configuration (REQUIRED)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Other configurations
NODE_ENV=development
```

## Generate a Secure JWT Secret

You can generate a secure JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## API Endpoints

### 1. Login
- **URL**: `POST /api/userLogin`
- **Body**: 
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "OrganizationType": "Business"
  },
  "expiresIn": "7d"
}
```

### 2. Verify Token
- **URL**: `GET /api/userLogin/verify`
- **Headers**: `Authorization: Bearer YOUR_TOKEN_HERE`
- **Response**:
```json
{
  "success": true,
  "message": "Token is valid",
  "user": { ... }
}
```

### 3. Refresh Token
- **URL**: `POST /api/userLogin/refresh`
- **Body**:
```json
{
  "token": "your_existing_token"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "new_token_here",
  "expiresIn": "7d"
}
```

## Using Protected Routes

To protect any route, import and use the `authenticateToken` middleware:

```javascript
import { authenticateToken } from "../../middleware/auth.js";

router.get("/protected-route", authenticateToken, (req, res) => {
    // req.user contains the authenticated user data
    res.json({ user: req.user });
});
```

## Client-Side Usage

### Storing Token
```javascript
// After successful login
const response = await fetch('/api/userLogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});

const data = await response.json();
if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
}
```

### Using Token in Requests
```javascript
// For protected routes
const token = localStorage.getItem('token');
const response = await fetch('/api/protected-route', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

## Security Features

1. **Token Expiration**: Tokens expire after 7 days
2. **Secure Password Comparison**: Uses bcrypt for password verification
3. **User Enumeration Protection**: Same error message for invalid email/password
4. **Database Validation**: Verifies user exists in database on each request
5. **Error Handling**: Comprehensive error handling for all JWT scenarios

## Token Structure

The JWT token contains:
- `userId`: User's MongoDB ID
- `email`: User's email address
- `organizationType`: User's organization type
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp
