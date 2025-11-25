# Habit Tracker Front-End

A modern web application for tracking habits, built with React Router v7, React 19, and TailwindCSS.

## Features

- **Habit Management**: Create, update, and track habits
- **User Authentication**: Secure login and registration system
- **Tracker System**: Monitor habit progress over time
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Type-Safe API**: Auto-generated TypeScript API client from OpenAPI spec

## Tech Stack

- **Framework**: React Router v7 (with server-side rendering)
- **UI Library**: React 19
- **Styling**: TailwindCSS v4
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Type Safety**: TypeScript

## Prerequisites

- Node.js 20 or higher
- npm or compatible package manager
- Backend API running (default: <http://localhost:8080>)

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port Vite assigns).

### Building for Production

```bash
npm run build
```

### Starting Production Server

```bash
npm run start
```

### Type Checking

```bash
npm run typecheck
```

## API Client Generation

The project uses OpenAPI TypeScript Codegen to automatically generate type-safe API clients from the backend OpenAPI specification.

To regenerate the API client:

```bash
npm run generate-api
```

**Note**: Ensure the backend API is running at `http://localhost:8080` before generating the API client.

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Docker Support

Build the Docker image:

```bash
docker build -t habit-tracker-front-end:latest .
```

Run the container:

```bash
docker run -p 3000:3000 habit-tracker-front-end:latest
```

Or use with Podman:

```bash
podman build -t habit-tracker-front-end:latest .
podman run -p 3000:3000 habit-tracker-front-end:latest
```

## Project Structure

```
src/
├── api/                    # Auto-generated API client
├── app/                    # React Router app configuration
│   └── routes/             # Application routes
├── components/             # Reusable components
│   ├── layouts/            # Page Layouts
│   └── ui/                 # UI components
├── features/               # Feature-based modules
│   ├── auth/               # Authentication
│   ├── habits/             # Habit management
│   ├── trackers/           # Habit tracking
│   └── users/              # User management
├── lib/                    # Global Utilities
└── types/                  # Global Types
```

## Related Projects

- [Habit Tracker API](https://github.com/kugelblitz104/habit-tracker) - Backend API service

## Code Style

The project uses Prettier with custom configuration. Settings are defined in `package.json`.

## License

This project is private and not licensed for public use.
