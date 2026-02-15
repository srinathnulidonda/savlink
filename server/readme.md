<div align="center">

# 🔗 Savlink Backend

### Smart Bookmark & URL Shortener API

**Fast** • **Intelligent** • **Production-Ready**

[![Live](https://img.shields.io/badge/status-live-success?style=for-the-badge)](https://savlinks-test-g445.onrender.com)
[![Python](https://img.shields.io/badge/python-3.11+-blue?style=for-the-badge&logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/flask-3.0+-green?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue?style=for-the-badge&logo=postgresql)](https://postgresql.org)

[🚀 Live Demo](https://savlinks-test-g445.onrender.com) • [📖 API Docs](https://savlinks-test-g445.onrender.com/health) • [🐛 Report Bug](https://github.com/yourusername/savlink/issues)

</div>

---

## ✨ What is Savlink?

Savlink is a **powerful bookmark management and URL shortening API** that helps users save, organize, and share links intelligently. Built with modern web technologies and designed for scale.

### 🎯 Key Features

<table>
<tr>
<td width="33%" valign="top">

#### 🔐 **Smart Authentication**
- Firebase integration
- Email-based emergency access
- Secure session management
- OAuth 2.0 ready

</td>
<td width="33%" valign="top">

#### 🔗 **Intelligent Links**
- Save & shorten URLs
- Auto-metadata extraction
- Rich previews with favicons
- Click tracking & analytics

</td>
<td width="33%" valign="top">

#### 📁 **Smart Organization**
- Nested folders
- Tag system
- Quick access pins
- Favorites/starred items

</td>
</tr>
<tr>
<td width="33%" valign="top">

#### 🔍 **Advanced Search**
- Full-text search
- Smart filters
- Search history
- Instant suggestions

</td>
<td width="33%" valign="top">

#### 📊 **Rich Analytics**
- Click tracking
- Geographic data
- Device analytics
- Performance metrics

</td>
<td width="33%" valign="top">

#### ⚡ **Performance**
- Redis caching
- Connection pooling
- Async processing
- Sub-second responses

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

```bash
Python 3.11+
PostgreSQL 16+
Redis (optional)
```

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/savlink-backend.git
cd savlink-backend/server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python manage.py migrate

# Start development server
python run.py
```

**🎉 Server running at:** `http://localhost:10000`

---

## 📡 API Overview

### Base URL
```
Production: https://savlinks-test-g445.onrender.com
Development: http://localhost:10000
```

### Quick Test

```bash
# Health check
curl https://savlinks-test-g445.onrender.com/health

# Response
{
  "status": "healthy",
  "service": "savlink-backend",
  "timestamp": "2026-02-15T17:32:00.000Z"
}
```

### Core Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/auth/login` | POST | User login | ❌ |
| `/auth/register` | POST | Create account | ❌ |
| `/api/links` | GET | List user links | ✅ |
| `/api/links` | POST | Create link | ✅ |
| `/api/links/{id}` | PUT | Update link | ✅ |
| `/api/links/{id}` | DELETE | Delete link | ✅ |
| `/api/dashboard/links` | GET | Dashboard view | ✅ |
| `/api/dashboard/home/quick-access` | GET | Quick access | ✅ |
| `/api/search/everything` | GET | Search all | ✅ |
| `/api/folders` | GET/POST | Manage folders | ✅ |
| `/api/tags` | GET/POST | Manage tags | ✅ |
| `/r/{slug}` | GET | Redirect short link | ❌ |

> 🔑 **Auth Required**: Include `Authorization: Bearer <token>` header

---

## 📚 API Examples

### 🔗 Create a Saved Link

```bash
POST /api/links
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "original_url": "https://github.com/features",
  "title": "GitHub Features",
  "link_type": "saved",
  "folder_id": 1,
  "tag_ids": [1, 2]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "link": {
      "id": 123,
      "title": "GitHub Features",
      "original_url": "https://github.com/features",
      "display_url": "github.com/features",
      "preview": {
        "favicon": "https://github.com/favicon.ico",
        "image": "https://github.com/preview.png",
        "site_name": "GitHub"
      },
      "tags": [
        { "id": 1, "name": "development", "color": "#3B82F6" }
      ],
      "created_at": "2026-02-15T17:30:00.000Z"
    }
  }
}
```

### ✂️ Create a Short Link

```bash
POST /api/shortlinks
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "original_url": "https://verylongurl.com/article/123456",
  "slug": "my-article",
  "expires_at": "7d",
  "utm_params": {
    "source": "twitter",
    "medium": "social"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "link": {
      "id": 124,
      "slug": "my-article",
      "short_url": "https://savlink.app/r/my-article",
      "original_url": "https://verylongurl.com/article/123456?utm_source=twitter",
      "click_count": 0,
      "expires_at": "2026-02-22T17:30:00.000Z"
    }
  }
}
```

### 🔍 Search Everything

```bash
GET /api/search/everything?q=github&starred=true&limit=10
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "github",
    "links": [...],
    "folders": [...],
    "tags": [...],
    "stats": {
      "total_results": 15,
      "links_count": 12,
      "folders_count": 2,
      "tags_count": 1
    },
    "suggestions": ["site:github.com", "github actions"]
  }
}
```

### 📊 Get Dashboard Stats

```bash
GET /api/dashboard/stats
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "overview": {
        "total_links": 247,
        "active_links": 235,
        "total_clicks": 1523
      },
      "counts": {
        "all": 235,
        "starred": 42,
        "recent": 18,
        "archived": 12
      },
      "folders": [...],
      "tags": [...]
    }
  }
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  CLIENT APP                      │
│         (React/Vue/Mobile/Desktop)              │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS/REST
┌───────────────────▼─────────────────────────────┐
│              SAVLINK API                         │
│  ┌─────────────────────────────────────────┐   │
│  │  Flask Application (Gunicorn)           │   │
│  ├─────────────────────────────────────────┤   │
│  │  • Auth (Firebase + Emergency)          │   │
│  │  • Links Management                     │   │
│  │  • Folders & Tags                       │   │
│  │  • Search Engine                        │   │
│  │  • Metadata Extraction                  │   │
│  │  • Analytics & Tracking                 │   │
│  └─────────────────────────────────────────┘   │
└───────────┬─────────────────┬───────────────────┘
            │                 │
    ┌───────▼───────┐  ┌─────▼──────┐
    │  PostgreSQL   │  │   Redis    │
    │  (Supabase)   │  │  (Cache)   │
    └───────────────┘  └────────────┘
```

---

## 🗂️ Project Structure

```
server/
├── 📄 run.py                    # Application entry point
├── 📄 manage.py                 # CLI management tool
├── 📦 requirements.txt          # Dependencies
│
├── 📁 app/
│   ├── 🎯 __init__.py          # App factory
│   ├── ⚙️  config.py            # Configuration
│   ├── 🗄️  database.py          # DB manager
│   │
│   ├── 📁 models/              # Database models
│   │   ├── user.py
│   │   ├── link.py
│   │   ├── folder.py
│   │   └── tag.py
│   │
│   ├── 📁 auth/                # Authentication
│   ├── 📁 links/               # Link management
│   ├── 📁 dashboard/           # Dashboard & analytics
│   ├── 📁 folders/             # Folder organization
│   ├── 📁 tags/                # Tag system
│   ├── 📁 search/              # Search engine
│   ├── 📁 shortlinks/          # Short link features
│   ├── 📁 metadata/            # Metadata extraction
│   ├── 📁 redirect/            # URL redirection
│   ├── 📁 migrations/          # Database migrations
│   └── 📁 utils/               # Utilities
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Security
SECRET_KEY=your-secret-key-here

# Firebase
FIREBASE_CONFIG_JSON='{"project_id": "...", ...}'

# Application URLs
BASE_URL=https://your-frontend.com
API_URL=https://your-api.com

# Optional: Redis
REDIS_URL=redis://localhost:6379/0

# Optional: Email (Brevo)
BREVO_API_KEY=your-brevo-key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Environment
FLASK_ENV=production
DEBUG=false
```

### Firebase Setup

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Generate service account key
3. Copy JSON content to `FIREBASE_CONFIG_JSON` environment variable

---

## 🚀 Deployment

### Deploy to Render

1. **Create Web Service** on [Render](https://render.com)

2. **Environment Variables:**
   ```
   DATABASE_URL=<supabase-url>
   FIREBASE_CONFIG_JSON=<your-firebase-json>
   SECRET_KEY=<random-secret>
   ```

3. **Build Command:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start Command:**
   ```bash
   gunicorn run:app
   ```

5. **Deploy!** 🎉

### Health Checks

Render will automatically monitor:
- `GET /health` - Basic health check
- `GET /ping` - Ultra-lightweight ping

---

## 📊 Database Migrations

### Run Migrations

```bash
# Check migration status
python manage.py migration_status

# Run pending migrations
python manage.py migrate

# Dry run (preview changes)
python manage.py migrate --dry-run
```

### Check Database

```bash
# View database status
python manage.py db_status

# Output:
# ✅ Database connection: OK
# 📋 Tables: users, links, folders, tags, link_tags, emergency_tokens
# 👥 User count: 42
# 🔗 Link count: 1,523
```

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

---

## 📈 Performance

### Benchmarks

| Operation | Response Time | Notes |
|-----------|--------------|-------|
| List Links | ~150ms | Cached queries |
| Search | ~200ms | Full-text search |
| Create Link | ~300ms | With metadata |
| Redirect | ~50ms | Cached redirects |
| Health Check | ~10ms | Lightweight |

### Optimization Features

- ⚡ **Redis Caching** - Search results, metadata
- 🔄 **Connection Pooling** - Optimized DB connections
- 📦 **Lazy Loading** - Background metadata extraction
- 🎯 **Query Optimization** - Indexed queries
- 🚀 **Async Processing** - Non-blocking operations

---

## 🛡️ Security

### Features

- 🔒 **Firebase Authentication** - Industry-standard auth
- 🔑 **JWT Tokens** - Secure session management
- 🚫 **Rate Limiting** - Prevent abuse
- 🔐 **SQL Injection Protection** - Parameterized queries
- 🌐 **CORS Protection** - Configured origins
- 🛡️ **XSS Protection** - Input sanitization
- 📧 **Emergency Access** - Email-based recovery

### Best Practices

```python
# ✅ Always use environment variables for secrets
SECRET_KEY = os.environ.get('SECRET_KEY')

# ✅ Validate all user inputs
if not validate_url(url):
    return error_response('Invalid URL', 400)

# ✅ Use authentication middleware
@require_auth
def protected_endpoint():
    # Your code here
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing`)
5. **Open** a Pull Request

### Development Setup

```bash
# Install dev dependencies
pip install -r requirements-dev.txt

# Run linter
flake8 app/

# Format code
black app/

# Type checking
mypy app/
```

---

## 📝 API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "link": { ... }
  },
  "message": "Link created successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Link not found",
  "code": "LINK_NOT_FOUND"
}
```

### Pagination

```json
{
  "success": true,
  "data": {
    "links": [...],
    "meta": {
      "count": 20,
      "has_more": true,
      "next_cursor": "eyJpZCI6MTIzfQ=="
    }
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check DATABASE_URL format
postgresql://user:password@host:5432/database

# Test connection
python -c "from app.database import db_manager; print(db_manager.check_health())"
```

**Firebase Auth Error**
```bash
# Verify FIREBASE_CONFIG_JSON is valid JSON
echo $FIREBASE_CONFIG_JSON | python -m json.tool

# Check Firebase project settings
```

**Migration Issues**
```bash
# Reset migrations (development only)
python manage.py db_status

# Check pending migrations
python manage.py migration_status
```

---

## 📖 Documentation

- 📘 [API Documentation](./docs/API.md)
- 🚀 [Deployment Guide](./docs/DEPLOYMENT.md)
- 🗄️ [Database Schema](./docs/DATABASE.md)
- 🔧 [Migration Guide](./docs/MIGRATIONS.md)

---

## 📊 Tech Stack

<div align="center">

| Category | Technology |
|----------|-----------|
| **Framework** | Flask 3.0+ |
| **Database** | PostgreSQL 16 (Supabase) |
| **Caching** | Redis 7+ |
| **Auth** | Firebase Admin SDK |
| **Server** | Gunicorn |
| **ORM** | SQLAlchemy 2.0 |
| **Migrations** | Custom Migration System |
| **Async** | aiohttp, asyncio |

</div>

---

## 🎯 Roadmap

- [x] ✅ Core link management
- [x] ✅ Advanced search
- [x] ✅ Metadata extraction
- [x] ✅ Nested folders
- [x] ✅ Analytics dashboard
- [ ] 🔄 Browser extension API
- [ ] 🔄 Webhooks system
- [ ] 🔄 Link collections/playlists
- [ ] 🔄 AI-powered categorization
- [ ] 🔄 Collaborative workspaces

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file.

---

## 💬 Support

Need help? Have questions?

- 📧 Email: srinathnulidonda.dev@gmail.com
- 📝 Issues: [GitHub Issues](https://github.com/yourusername/savlink/issues)

---

## 🌟 Acknowledgments

Built with ❤️ by the Savlink team

- Flask community for the amazing framework
- Firebase for authentication services
- Supabase for managed PostgreSQL
- Render for seamless deployment

---

<div align="center">

**[⬆ Back to Top](#-savlink-backend)**

Made with 💙 by [srinathnulidonda](https://github.com/srinathnulidonda)

⭐ **Star us on GitHub** — it motivates us a lot!

</div>