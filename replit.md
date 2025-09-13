# WhatsApp Business Campaign Manager

## Overview

This is a full-stack WhatsApp Business API client webapp designed for campaign management. The application provides a comprehensive platform for managing WhatsApp marketing campaigns, contacts, templates, and message analytics. Built as a modern web application with role-based access control, it enables businesses to efficiently manage their WhatsApp Business API communications through an intuitive interface.

The system supports campaign creation and management, contact organization with tags and groups, template synchronization with WhatsApp Business API, real-time message tracking, and detailed analytics with visual charts. It's designed to handle the complete lifecycle of WhatsApp marketing campaigns from creation to analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **UI Library**: Radix UI components with shadcn/ui for consistent, accessible design system
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **Charts**: Recharts library for data visualization and analytics dashboards
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript using ESM modules
- **Framework**: Express.js for REST API endpoints and middleware
- **Authentication**: Passport.js with Local Strategy and session-based authentication
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple
- **Security**: Rate limiting, CSRF protection, secure session cookies, and password hashing with scrypt
- **API Design**: RESTful endpoints following conventional patterns with proper error handling

### Data Storage Solutions
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Connection**: Neon Database serverless PostgreSQL for scalable database hosting
- **Schema**: Structured tables for users, settings, contacts, templates, campaigns, messages, and replies
- **Encryption**: Sensitive data like access tokens are encrypted at rest using AES-256-CBC

### Authentication and Authorization
- **Strategy**: Session-based authentication with secure HTTP-only cookies
- **Password Security**: Scrypt algorithm for password hashing with salt
- **Role-based Access**: Three-tier role system (admin, manager, agent) for access control
- **Session Store**: PostgreSQL-backed sessions for persistence across server restarts
- **Protection**: Protected routes on frontend with authentication checks and redirects

### External Dependencies
- **WhatsApp Business API**: Integration for template management and message sending
- **Neon Database**: Serverless PostgreSQL hosting for production database
- **Meta Graph API**: For fetching WhatsApp Business templates and sending messages
- **Development Tools**: Replit-specific plugins for development environment integration

The application uses a monorepo structure with shared TypeScript schemas between client and server, ensuring type consistency across the full stack. The build process compiles both frontend (Vite) and backend (esbuild) for production deployment.