# Database Backup Manager 🗄️

Automated database backup system with Google Drive integration.

![logo.png](frontend/public/logo.png)


## Quick Start

```bash
# 1. Download deployment script
curl -O https://raw.githubusercontent.com/firepeak-technology/database-backup-manager/main/deploy.sh

# 2. Configure
Check the .env.template file for configuration options.

vi .env 


# 3. Deploy
./deploy.sh
```

## Access

Open: http://localhost:3001


## Features

- Google OAuth authentication
- PostgreSQL & MySQL support
- Google Drive backups
- Scheduled daily backups (1 AM)
- Web management interface
