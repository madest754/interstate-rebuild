# Chaveirim Dispatcher

A full-stack emergency dispatch management system for Chaveirim volunteer organizations. Built with React, Express, PostgreSQL, and TypeScript.

![Chaveirim Dispatcher](./docs/screenshot.png)

## 🚀 Features

### Core Functionality
- **Call Management**: Create, edit, broadcast, and close emergency calls
- **Member Directory**: Manage volunteer roster with skills, zones, and contact info
- **Assignment System**: Assign members to calls with ETA tracking
- **Queue Management**: Phone queue login/logout for dispatchers
- **Real-time Updates**: WebSocket-powered live updates across all clients
- **Draft System**: Auto-save drafts locally and to the cloud

### Location Support
- **Highway Mode**: Select highway, direction, exits, mile markers
- **Address Mode**: Google Places autocomplete integration
- **Free Text Mode**: Manual location entry for complex situations
- **Map Integration**: Google Maps links and coordinate support

### Vehicle Identification
- **Make/Model Selection**: Searchable database of vehicles
- **Color Picker**: Visual color selection
- **Custom Entry**: Free-form vehicle descriptions
- **Fuzzy Matching**: AI-powered vehicle text extraction

### Communication
- **Broadcast System**: Send to WhatsApp, SMS, and email
- **Multi-channel**: Configurable notification channels
- **Message Templates**: Auto-generated broadcast messages

### Admin Features
- **User Management**: Role-based access (Admin, Dispatcher, Member)
- **Schedule Management**: Dispatcher shift scheduling
- **Reference Data**: Manage highways, vehicles, agencies, problem codes
- **Webhook Logs**: Track all outgoing/incoming integrations
- **System Settings**: Configure app behavior

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **TanStack Query** for data fetching and caching
- **Tailwind CSS** for styling
- **Vite** for development and building
- **Lucide React** for icons

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **WebSocket** for real-time updates
- **Multer** for file uploads

### Integrations
- **Google Maps/Places** for location services
- **SendGrid** for email
- **Twilio** for SMS
- **WAHA** for WhatsApp
- **OpenAI** for AI features

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/chaveirim-dispatcher.git
cd chaveirim-dispatcher
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=your-64-character-random-string

# Optional integrations
GOOGLE_MAPS_API_KEY=your-google-api-key
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
OPENAI_API_KEY=your-openai-key
```

4. **Initialize database**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🗄 Database Schema

The application uses 28 PostgreSQL tables:

### Core Tables
- `users` - Authentication accounts
- `members` - Volunteer directory
- `calls` - Emergency call records
- `callAssignments` - Member-to-call assignments
- `callLogs` - Activity audit trail
- `drafts` - Incomplete call drafts

### Schedule Tables
- `schedules` - Recurring dispatcher shifts
- `shiftOverrides` - Temporary schedule changes
- `queueSessions` - Active phone queue logins

### Reference Tables
- `highways` - Highway directory
- `highwayExits` - Exit coordinates
- `carMakes` - Vehicle manufacturers
- `carModels` - Vehicle models
- `agencies` - Requesting organizations
- `problemCodes` - Call nature/types
- `importantPhones` - Contact directory

### System Tables
- `settings` - App configuration
- `webhookLogs` - Integration audit
- `feedback` - User feedback

## 🔌 API Endpoints

The server exposes 90 REST API endpoints:

### Authentication (12 endpoints)
- `POST /api/login` - Authenticate user
- `POST /api/logout` - End session
- `GET /api/user` - Current user info
- `POST /api/register` - Create account
- `POST /api/forgot-password` - Request reset
- `POST /api/reset-password` - Reset with token

### Calls (15 endpoints)
- `GET /api/calls` - List calls
- `GET /api/calls/:id` - Call details
- `POST /api/calls` - Create call
- `PATCH /api/calls/:id` - Update call
- `POST /api/calls/:id/close` - Close call
- `POST /api/calls/:id/assign` - Assign member
- `POST /api/calls/:id/broadcast` - Send broadcast

### Members (12 endpoints)
- `GET /api/members` - List members
- `GET /api/members/:id` - Member details
- `POST /api/members` - Create member
- `PATCH /api/members/:id` - Update member
- `GET /api/search-directory` - Search members

### Schedules (7 endpoints)
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `GET /api/queue-sessions` - Active queue members
- `POST /api/phone-system/queue-login` - Join queue

[See full API documentation](./docs/api.md)

## 🏗 Project Structure

```
chaveirim-dispatcher/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── ui/        # Base UI primitives
│   │   │   ├── CallCard.tsx
│   │   │   ├── MemberSearch.tsx
│   │   │   ├── LocationPicker.tsx
│   │   │   └── ...
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useCalls.ts
│   │   │   └── ...
│   │   ├── pages/         # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CallForm.tsx
│   │   │   └── ...
│   │   ├── lib/          # Utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/                # Express backend
│   ├── index.ts          # Entry point
│   ├── auth.ts           # Passport config
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database layer
│   ├── websocket.ts      # Real-time server
│   ├── integrations.ts   # External services
│   └── vite.ts           # Dev server
├── shared/               # Shared code
│   ├── schema.ts         # Database schema
│   └── db.ts             # DB connection
├── public/               # Static assets
│   ├── sw.js            # Service worker
│   └── manifest.json    # PWA manifest
└── package.json
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | 64+ char random string |
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Server port (default: 3000) |
| `APP_URL` | No | Production URL for CORS |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps/Places API |
| `SENDGRID_API_KEY` | No | Email sending |
| `TWILIO_ACCOUNT_SID` | No | SMS sending |
| `TWILIO_AUTH_TOKEN` | No | SMS sending |
| `TWILIO_PHONE_NUMBER` | No | SMS from number |
| `WHATSAPP_API_URL` | No | WAHA server URL |
| `WHATSAPP_API_TOKEN` | No | WAHA auth token |
| `OPENAI_API_KEY` | No | AI features |

### Feature Flags

Configure features in the admin settings panel or via environment:

- Google Places autocomplete
- SMS notifications
- WhatsApp integration
- AI-powered features
- Push notifications

## 📱 PWA Support

The app is a Progressive Web App with:

- **Offline Support**: Service worker caches static assets
- **Install Prompt**: Add to home screen on mobile
- **Push Notifications**: Real-time call alerts
- **Background Sync**: Queue offline actions

## 🧪 Development

### Scripts

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Build for production
npm run start      # Start production server
npm run db:push    # Push schema to database
npm run db:studio  # Open Drizzle Studio
npm run db:generate # Generate migrations
npm run typecheck  # Run TypeScript checks
```

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Requirements

- Node.js 18+
- PostgreSQL 14+
- SSL certificate (for production)
- WebSocket support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🙏 Acknowledgments

Built with ❤️ for the Chaveirim volunteer network.

---

**Need help?** Open an issue or contact the development team.
