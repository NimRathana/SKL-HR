# SKL HR Admin

A modern, responsive admin dashboard for Human Resource Management built with Next.js, React, and Material-UI.

## Overview

SKL HR Admin is a comprehensive web-based administration interface for managing human resources operations. It provides an intuitive UI for managing employee data, with support for multiple languages and dark/light themes.

## Features

- 📊 **Admin Dashboard** - Comprehensive HR management interface
- 🌍 **Multi-language Support** - Internationalization (i18n) ready
- 🎨 **Theme Customization** - Dark/Light mode and custom color schemes
- 📱 **Responsive Design** - Mobile-friendly UI with Material-UI components
- ⚡ **Modern Stack** - Built with Next.js 16 and React 19
- 🔐 **TypeScript** - Full type safety
- 📋 **Tailwind CSS** - Utility-first CSS framework

## Tech Stack

| Layer                          | Technology              |
| ------------------------------ | ----------------------- |
| **Framework**            | Next.js 16.2.1          |
| **UI Library**           | React 19.2.4            |
| **Component Library**    | Material-UI (MUI) 7.3.9 |
| **Styling**              | Tailwind CSS 4.2.2      |
| **Language**             | TypeScript 5.9.3        |
| **Internationalization** | i18next 26.0.3          |
| **HTTP Client**          | Axios 1.4.0             |
| **CSS-in-JS**            | Emotion                 |
| **Icons**                | Remix Icon 4.9.1        |

## Project Structure

```
hr-application-admin/
├── public/                    # Static assets (images, icons, etc.)
├── src/
│   ├── @core/                 # Core template utilities and helpers
│   ├── @layouts/              # Layout components (wrapper layouts)
│   ├── @menu/                 # Menu/Navigation components
│   ├── app/                   # Next.js App Router and page routes
│   ├── assets/                # SVG and static resources
│   ├── components/            # Reusable React components
│   ├── configs/               # Configuration files
│   │   ├── i18n.ts            # i18n setup and language configuration
│   │   ├── primaryColorConfig/ # Primary color theme settings
│   │   └── themeConfig.ts     # Global theme configuration
│   ├── contexts/              # React Context for state management
│   ├── data/                  # Static data files
│   │   ├── dictionaries/      # Translation strings for localization
│   │   ├── navigation/        # Menu navigation structure
│   │   └── search/            # Search-related data
│   ├── hooks/                 # Custom React hooks
│   │   └── useIntersection/   # Viewport intersection detection hook
│   └── views/                 # Page-level components
├── .editorconfig              # Editor configuration
├── .env.local                 # Local environment variables
├── .env.production            # Production environment variables
├── .env.example               # Example environment variables
├── .eslintrc.js               # ESLint configuration
├── .gitignore                 # Git ignore rules
├── .prettierrc.json           # Prettier code formatting config
├── .stylelintrc.json          # CSS linting configuration
├── next.config.mjs            # Next.js configuration
├── postcss.config.mjs         # PostCSS configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x (or yarn/pnpm)
- Backend API running (default: `http://127.0.0.1:8000`)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hr-application-admin
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:

```env
# Server configuration
IP=127.0.0.1
BASEPATH=

# API endpoint
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`   | Start development server with hot reload |
| `npm run build` | Build application for production         |
| `npm start`     | Start production server                  |
| `npm run lint`  | Run ESLint to check code quality         |

## Docker Support

### Build Docker Image

```bash
docker build -t hr_web .
```

### Run Container Locally

```bash
docker run --rm -p 3000:3000 hr_web
```

### Using Docker Compose (Recommended)

```bash
# Start services
docker compose up --build

# Stop services
docker compose down
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Configuration

### Theme Configuration

Customize theme colors and settings in `src/configs/themeConfig.ts` and `src/configs/primaryColorConfig/`.

### Internationalization (i18n)

Language translations are stored in `src/data/dictionaries/`. The app auto-detects the browser language and can be manually switched.

Configure i18n in `src/configs/i18n.ts`.

## Development Guidelines

- Use TypeScript for type safety
- Follow ESLint rules for code consistency
- Use Material-UI components for UI elements
- Keep components reusable in `src/components/`
- Add custom hooks in `src/hooks/`
- Store application state using React Context

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Environment Details

- **Next.js App Router** - Modern routing with App Router
- **TypeScript** - Full type support throughout the project
- **PostCSS & Tailwind** - Advanced CSS processing and utility-first styling
- **Emotion** - CSS-in-JS for dynamic styling

## Troubleshooting

### Port 3000 Already in Use

```bash
# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### API Connection Issues

Ensure the backend API is running and `NEXT_PUBLIC_API_URL` is correctly configured in `.env.local`.

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add new feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## License

This project is proprietary software.

All rights reserved.

## Support & Contact

For issues, questions, or suggestions, please contact the development team or open an issue in the repository.
