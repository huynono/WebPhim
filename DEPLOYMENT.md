# Deployment Guide for WebPhim

## Railpack Deployment

### Files Created for Deployment:

1. **start.sh** - Build script for Unix/Linux systems
2. **start.bat** - Build script for Windows systems  
3. **package.json** - Main package.json for monorepo
4. **.railpack** - Railpack configuration
5. **.railpackignore** - Files to ignore during deployment

### Environment Variables Required:

Create a `.env` file in the backend directory with:

```env
DATABASE_URL="your_database_url_here"
JWT_SECRET="your_jwt_secret_here"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your_email@gmail.com"
EMAIL_PASS="your_app_password"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
PORT=3000
NODE_ENV=production
```

### Deployment Steps:

1. Push your code to GitHub
2. Connect your repository to Railpack
3. Set environment variables in Railpack dashboard
4. Deploy!

### How it Works:

- Railpack will run `bash start.sh` to build the project
- Frontend (React) gets built to `project/dist/`
- Backend serves both API routes and static files
- All routes not starting with `/api` serve the React app

### Troubleshooting:

- Make sure all environment variables are set
- Check that your database is accessible from Railpack
- Verify Cloudinary credentials are correct
