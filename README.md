# Couple2Couple - Dating Platform for Couples

A modern web application designed for adult couples seeking to connect with other couples for social meetups and relationships. Built with vanilla JavaScript, Vite, and Supabase.

## 🌐 Live Demo

**Deployment URL:** [https://couple2couple.netlify.app](https://couple2couple.netlify.app)

### Demo Credentials

For testing purposes, use these credentials:

**Admin Account:**
- Email: `nik@gmail.com`
- Password: `Password123!`

**Regular User Account (Maria):**
- Email: `maria@gmail.com`
- Password: `Password123!`

**Regular User Account (Sofi):**
- Email: `sofi@gmail.com`
- Password: `pas123`

> **Note:** These are demo accounts. Please do not change the passwords as they are shared for evaluation purposes.

## 📋 Project Description

Couple2Couple is a specialized dating platform where adult couples can:

- **Register & Profile Creation**: Create detailed couple profiles with information about both partners
- **Photo Gallery**: Upload and manage multiple photos (subject to admin approval)
- **User Discovery**: Browse other registered couples with filtering options
- **Messaging System**: Real-time private messaging between couples with read receipts
- **Friend Management**: Add/remove couples to your friends list
- **Admin Panel**: Administrative control for user approval, photo moderation, and platform management

### Key Features

- ✅ Age verification (18+ only)
- ✅ Dual-partner profile system (Partner 1 & Partner 2)
- ✅ Photo approval workflow by administrators
- ✅ Real-time messaging with optimistic UI updates
- ✅ Friend system with symmetric relationships
- ✅ Admin dashboard with statistics and user management
- ✅ Responsive design for mobile and desktop
- ✅ Row-level security (RLS) for data protection

## 🏗️ Architecture & Tech Stack

### Frontend
- **HTML5, CSS3, Vanilla JavaScript** - Modern web standards without frameworks
- **Vite** - Fast build tool and development server
- **Bootstrap 5** - UI component library and responsive grid
- **Bootstrap Icons** - Icon library
- **Navigo** - Client-side routing for multi-page navigation

### Backend
- **Supabase** - Backend-as-a-Service platform
  - **PostgreSQL Database** - Relational database with 12+ tables
  - **Supabase Auth** - Authentication and user management
  - **Supabase Storage** - File storage for profile photos
  - **Supabase Realtime** - WebSocket subscriptions for live updates
  - **Edge Functions** - Serverless functions for admin notifications

### Deployment & Hosting
- **Netlify** - Static site hosting with auto-deployment from GitHub
- **GitHub** - Version control and CI/CD integration

### Development Tools
- **Node.js & npm** - Package management and build scripts
- **ESM Modules** - Modern JavaScript module system
- **Git** - Version control

## 📊 Database Schema

The application uses 12 main database tables with Row Level Security (RLS) policies:

### Core Tables
1. **`profiles`** - User profile information (couples)
2. **`profile_photos`** - Photo gallery with approval status
3. **`messages`** - Private messages between users
4. **`friendships`** - Symmetric friend relationships
5. **`user_roles`** - Role-based access control (admin/user)

### Admin & Audit Tables
6. **`admin_notifications`** - Pending admin actions queue
7. **`admin_audit_log`** - Administrative action history
8. **`profile_change_log`** - Profile modification tracking

### Legacy Tables (from initial template)
9. **`projects`** - Legacy project management
10. **`project_members`** - Legacy project membership
11. **`project_stages`** - Legacy project stages
12. **`tasks`** - Legacy task management

All tables feature:
- RLS policies for security
- Foreign key relationships
- Indexed columns for performance
- Timestamps (`created_at`, `updated_at`)

**Database migrations:** All schema changes are tracked in `supabase/migrations/` (21 migration files).

## 🚀 Local Development Setup

### Prerequisites

Before you start, ensure you have installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Niko5886/CoupleCouple.git
cd CoupleCouple
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Supabase

1. Create a new project in [Supabase Dashboard](https://app.supabase.com/)

2. Create `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Get your credentials from Supabase Dashboard:
   - Project Settings → API → Project URL
   - Project Settings → API → `anon` `public` key

### Step 4: Apply Database Migrations

**Option A: Using Supabase SQL Editor**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents from migration files in `supabase/migrations/` (in order by timestamp)
3. Execute each migration

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Step 5: Set Up Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `profile-photos`
3. Set it to **Public** bucket
4. Configure RLS policies (see `supabase/migrations/20260226122000_create_storage_bucket_profile_photos.sql`)

### Step 6: Create Initial Admin User

Run this SQL in Supabase SQL Editor:

```sql
-- Insert admin user (update email/password as needed)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@example.com', crypt('YourPassword123!', gen_salt('bf')), now());

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@example.com';
```

### Step 7: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Step 8: Build for Production

```bash
npm run build
```

Production files will be in `dist/` folder.

## 📁 Project Structure

```
CoupleCouple/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── dialog/          # Confirmation dialog
│   │   ├── footer/          # Page footer
│   │   ├── header/          # Top navigation bar
│   │   ├── profile-modal/   # Profile quick view modal
│   │   └── toast/           # Toast notifications
│   ├── pages/               # Application pages
│   │   ├── admin/           # Admin dashboard
│   │   ├── dashboard/       # User dashboard (home)
│   │   ├── friends/         # Friends list page
│   │   ├── index/           # Landing page
│   │   ├── login/           # Login page
│   │   ├── messages/        # Private messaging
│   │   ├── profile/         # User profile view/edit
│   │   ├── register/        # Registration page
│   │   └── users/           # User discovery/listing
│   ├── router/              # Client-side routing
│   │   ├── routeConfig.js   # Route definitions
│   │   └── router.js        # Router implementation
│   ├── services/            # Business logic & API calls
│   │   ├── adminService.js  # Admin operations
│   │   ├── authState.js     # Authentication state management
│   │   ├── friendService.js # Friend management
│   │   ├── messageService.js # Messaging operations
│   │   ├── messageNotificationService.js # Message notifications
│   │   ├── profileService.js # Profile operations
│   │   └── supabaseClient.js # Supabase client initialization
│   ├── styles/              # Global styles
│   │   ├── bootstrap-theme.css # Bootstrap customization
│   │   └── global.css       # Global CSS variables & base styles
│   └── main.js              # Application entry point
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── admin-notifications/ # Email notifications for admins
│   │   └── delete-user/     # User deletion handler
│   ├── migrations/          # Database schema migrations (21 files)
│   └── seeds/               # Seed data for development
├── public/                  # Static assets (images, icons)
├── dist/                    # Production build output (generated)
├── .env.local               # Environment variables (create this)
├── index.html               # HTML entry point
├── package.json             # npm dependencies & scripts
├── vite.config.js           # Vite configuration
├── copilot-instructions.md  # AI development guidelines
└── README.md                # This file
```

### Key Files & Their Purpose

| File/Folder | Purpose |
|-------------|---------|
| `src/main.js` | Application bootstrap and initialization |
| `src/router/` | Multi-page navigation without page reload |
| `src/services/supabaseClient.js` | Supabase SDK configuration |
| `src/services/authState.js` | Centralized authentication state |
| `src/pages/*/` | Each page is a self-contained module (HTML, CSS, JS) |
| `supabase/migrations/` | Database version control (applied in timestamp order) |
| `vite.config.js` | Build tool configuration |
| `.env.local` | Supabase credentials (not committed to Git) |

## 🎯 User Roles & Permissions

### Regular Users (`user` role)
- ✅ Register and create profiles
- ✅ Upload photos (pending admin approval)
- ✅ Browse other verified users
- ✅ Send/receive private messages
- ✅ Add/remove friends
- ✅ Edit own profile information
- ❌ Cannot access admin panel

### Administrators (`admin` role)
- ✅ All regular user permissions
- ✅ Approve/reject new user registrations
- ✅ Moderate uploaded photos
- ✅ View platform statistics
- ✅ Delete user accounts
- ✅ Access admin dashboard at `/admin`
- ✅ View audit logs

## 🔒 Security Features

- **Row Level Security (RLS)**: All database tables secured with policies
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Privacy**: Users can only view approved profiles
- **Photo Moderation**: Admin approval required for all photos
- **Input Validation**: Frontend and database-level validation
- **HTTPS**: All production traffic encrypted
- **Environment Variables**: Sensitive credentials in `.env.local`

## 📱 Responsive Design

The application is fully responsive and optimized for:

- 📱 **Mobile** (320px - 767px)
- 📱 **Tablet** (768px - 991px)
- 💻 **Desktop** (992px+)

Key responsive features:
- Mobile-first navigation
- Adaptive image galleries
- Touch-friendly UI components
- Responsive grid layouts

## 🧪 Testing the Application

### Manual Testing Checklist

1. **Registration Flow**
   - [ ] Register new user (email/password)
   - [ ] Verify age confirmation (18+)
   - [ ] Complete profile information
   - [ ] Upload profile photo

2. **Admin Approval**
   - [ ] Login as admin
   - [ ] Approve pending user
   - [ ] Approve/reject uploaded photos

3. **User Discovery**
   - [ ] Browse users list
   - [ ] View user profiles
   - [ ] Add user as friend

4. **Messaging**
   - [ ] Send private message
   - [ ] Receive real-time message
   - [ ] View unread count badge
   - [ ] Mark messages as read

5. **Profile Management**
   - [ ] Edit profile fields
   - [ ] Upload multiple photos
   - [ ] View photo gallery

## 🤝 Contributing

This is a capstone project for educational purposes. Contributions are not currently accepted.

## 📄 License

This project is created for educational purposes as part of a software development course.

## 👨‍💻 Author

**Niko5886**
- GitHub: [@Niko5886](https://github.com/Niko5886)

## 📧 Support

For issues or questions about this project, please open an issue on GitHub.

---

**Project Status:** ✅ Completed and Deployed

**Last Updated:** March 4, 2026
