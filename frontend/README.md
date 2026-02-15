<div align="center">

<img src="public/icons/logo.svg" alt="Savlink Logo" width="120" height="120" />

# **Savlink**

**Your Personal Web Library**

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.4.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-9.23.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-10.16.0-FF0055?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

**Save once. Use forever.**

A beautiful, fast, and secure personal library for your important links. Built for professionals who collect the internet.

[🚀 Live Demo](https://savlink.app) • [📖 Documentation](https://docs.savlink.app) • [🐛 Report Bug](https://github.com/yourusername/savlink-frontend/issues) • [💡 Request Feature](https://github.com/yourusername/savlink-frontend/issues)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🏠 **Core Features**
- 🔗 **Instant Save** - Save any link with one click
- 📁 **Smart Organization** - Auto-categorization & custom collections
- ⚡ **Lightning Search** - Full-text search across all content
- 🔒 **Privacy First** - Your data, encrypted and secure
- 📱 **Universal Access** - Works on any device, anywhere

</td>
<td width="50%">

### 🎯 **Advanced Features**  
- 🎨 **Clean Short Links** - Branded URLs with analytics
- 🏷️ **Smart Tagging** - Organize with custom tags
- 📊 **Usage Analytics** - Track your reading habits
- 🌙 **Dark Mode** - Beautiful interface, easy on eyes
- 🔄 **Real-time Sync** - Instant updates across devices

</td>
</tr>
</table>

---

## 🎨 Screenshots

<div align="center">
<table>
<tr>
<td align="center">
<img src="public/screenshots/dashboard.png" width="300" alt="Dashboard" />
<br /><sub><b>📊 Dashboard</b></sub>
</td>
<td align="center">
<img src="public/screenshots/mobile.png" width="300" alt="Mobile View" />
<br /><sub><b>📱 Mobile Experience</b></sub>
</td>
</tr>
<tr>
<td align="center">
<img src="public/screenshots/search.png" width="300" alt="Search" />
<br /><sub><b>🔍 Powerful Search</b></sub>
</td>
<td align="center">
<img src="public/screenshots/collections.png" width="300" alt="Collections" />
<br /><sub><b>📁 Smart Collections</b></sub>
</td>
</tr>
</table>
</div>

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** `>=18.0.0`
- **npm** `>=9.0.0` or **yarn** `>=1.22.0`
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/savlink-frontend.git
   cd savlink-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   
   # Backend API
   VITE_API_URL=http://localhost:5000
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` 🎉

---

## 🛠️ Tech Stack

<div align="center">

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Framer Motion |
| **Authentication** | Firebase Auth, Google OAuth |
| **State Management** | React Context, Custom Hooks |
| **Build Tools** | Vite, ESLint, Prettier |
| **Deployment** | Vercel, PWA Support |

</div>

---

## 📁 Project Structure

```
src/
├── 📁 components/           # Reusable UI components
│   ├── 📁 dashboard/        # Dashboard-specific components
│   ├── 📁 home/            # Landing page components
│   └── 📁 auth/            # Authentication components
├── 📁 pages/               # Route components
│   ├── 📁 auth/            # Authentication pages
│   ├── 📁 dashboard/       # Dashboard pages
│   └── 📁 public/          # Public pages
├── 📁 services/            # API service layer
├── 📁 utils/              # Utility functions
├── 📁 contexts/           # React contexts
├── 📁 config/             # Configuration files
└── 📁 styles/             # Global styles
```

---

## 🎯 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript checks |

### Code Quality

We maintain high code quality standards:

- **ESLint** for code linting
- **Prettier** for code formatting  
- **TypeScript** for type safety
- **Husky** for pre-commit hooks

### Browser Support

- ✅ Chrome (last 2 versions)
- ✅ Firefox (last 2 versions)  
- ✅ Safari (last 2 versions)
- ✅ Edge (last 2 versions)
- ✅ Mobile browsers

---

## 📱 PWA Features

Savlink works as a Progressive Web App:

- 🏠 **Add to Home Screen** - Install like a native app
- ⚡ **Fast Loading** - Optimized performance
- 🔄 **Background Sync** - Works even when offline
- 📱 **Native Feel** - App-like experience
- 🔔 **Push Notifications** - Stay updated

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Enable automatic deployments

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Manual Build

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new link sharing feature
fix: resolve mobile menu overlap issue
docs: update installation instructions
style: improve button hover animations
refactor: optimize link card component
test: add unit tests for auth service
```

---

## 📋 Roadmap

- [ ] 🔍 **Advanced Search Filters** - Filter by date, type, tags
- [ ] 📊 **Analytics Dashboard** - Detailed usage insights  
- [ ] 🏷️ **Smart Auto-tagging** - AI-powered categorization
- [ ] 🔗 **Link Validation** - Check for broken links
- [ ] 📱 **Mobile App** - Native iOS/Android apps
- [ ] 🌐 **Team Collaboration** - Share collections with teams
- [ ] 🎨 **Custom Themes** - Personalize your experience
- [ ] 📑 **Import/Export** - Migrate from other tools

---

## 📊 Performance

<div align="center">

| Metric | Score |
|--------|-------|
| **Performance** | 98/100 |
| **Accessibility** | 100/100 |
| **Best Practices** | 100/100 |
| **SEO** | 100/100 |
| **PWA** | ✅ |

*Lighthouse scores on desktop*

</div>

---

## 🆘 Support

Need help? We're here for you!

- 📚 [Documentation](https://docs.savlink.app)
- 💬 [Discord Community](https://discord.gg/savlink)
- 📧 [Email Support](mailto:support@savlink.app)
- 🐛 [Report Issues](https://github.com/yourusername/savlink-frontend/issues)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👏 Acknowledgments

- 🎨 **Design Inspiration** - Linear, Notion, Arc Browser
- 🔥 **Icons** - Heroicons, Lucide Icons
- 📸 **Images** - Unsplash contributors
- 💡 **Community** - All our amazing contributors

---

<div align="center">

**[⬆ Back to Top](#savlink---your-personal-web-library)**

Made with ❤️ by the Savlink Team

[Website](https://savlink.vercel.app) • [GitHub](https://github.com/srinathnulidonda/savlink)

</div>