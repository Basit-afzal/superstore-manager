# Production Deployment Guide

## Security Fixes Implemented

### 1. CORS Configuration
- Restricted CORS to specific frontend domains in production
- Added `FRONTEND_URL` environment variable for production CORS whitelist
- Development allows localhost:5173 and localhost:3000

### 2. Security Headers
- Added Helmet middleware for security headers
- Configured nginx with additional security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### 3. Rate Limiting
- Global rate limit: 100 requests per 15 minutes per IP
- Auth endpoints stricter: 5 login/register attempts per 15 minutes per IP
- Prevents brute-force attacks

### 4. JWT Secret
- Updated `.env.example` with guidance for strong JWT secrets
- Use `openssl rand -base64 32` to generate a secure secret

### 5. Environment Variables
- Added `client/.env` to `.gitignore` to prevent accidental commits
- All `.env` files are now properly ignored

## Production Hosting Setup

### Option 1: Docker Compose (Single VPS)

1. **Prepare Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Generate Strong JWT Secret**
   ```bash
   openssl rand -base64 32
   # Add this to JWT_SECRET in .env
   ```

3. **Deploy with Docker Compose**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **Configure Nginx**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/superstore
   sudo ln -s /etc/nginx/sites-available/superstore /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

### Option 2: Separate Hosting (Vercel + Railway)

#### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variable: `VITE_API_URL=https://api.yourdomain.com/api`
3. Deploy - Vercel handles SSL automatically

#### Backend (Railway)
1. Connect your GitHub repository to Railway
2. Set environment variables:
   - `MONGODB_URI` (Railway MongoDB or external)
   - `JWT_SECRET` (strong random secret)
   - `STRIPE_SECRET_KEY`
   - `FRONTEND_URL=https://yourdomain.vercel.app`
   - `NODE_ENV=production`
3. Deploy - Railway handles SSL automatically

### Option 3: CI/CD with GitHub Actions

1. **Add GitHub Secrets**
   Go to Settings → Secrets and variables → Actions:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `SERVER_HOST`
   - `SERVER_USER`
   - `SSH_PRIVATE_KEY`

2. **Update docker-compose.yml on Server**
   Change image references to use your Docker Hub username:
   ```yaml
   server:
     image: your-docker-username/superstore-server:latest
   client:
     image: your-docker-username/superstore-client:latest
   ```

3. **Push to Main Branch**
   The workflow will automatically build, push, and deploy

## Required Environment Variables

### Server (.env)
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/superstore
JWT_SECRET=<strong_random_secret>
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_...
FRONTEND_URL=https://yourdomain.com
```

### Client (.env)
```
VITE_API_URL=https://api.yourdomain.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Post-Deployment Checklist

- [ ] Update `FRONTEND_URL` in server .env to your actual domain
- [ ] Update `VITE_API_URL` in client .env to your actual API URL
- [ ] Generate and set strong JWT_SECRET
- [ ] Configure SSL certificates
- [ ] Test all API endpoints
- [ ] Test file uploads
- [ ] Test Stripe integration
- [ ] Set up database backups
- [ ] Configure monitoring/alerting
- [ ] Review and adjust rate limits if needed

## Monitoring & Maintenance

### View Logs
```bash
docker-compose logs -f
docker-compose logs -f server
docker-compose logs -f client
```

### Restart Services
```bash
docker-compose restart
```

### Update Application
```bash
git pull origin main
./deploy.sh
```

### Database Backup
```bash
docker exec superstore-mongodb mongodump --archive=/backup/$(date +%Y%m%d).archive
```

## Security Best Practices

1. **Never commit .env files** - They're in .gitignore
2. **Use strong, unique secrets** - Generate with `openssl rand -base64 32`
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Enable HTTPS only** - nginx config redirects HTTP to HTTPS
5. **Review rate limits** - Adjust based on your traffic patterns
6. **Monitor logs** - Set up log aggregation (e.g., ELK, Datadog)
7. **Regular backups** - Automate MongoDB backups
8. **Use environment-specific configs** - Separate dev/staging/production
