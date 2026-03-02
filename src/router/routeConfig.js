import { renderHomePage } from '../pages/index/index.js';
import { renderUsersPage } from '../pages/users/users.js';
import { renderLoginPage } from '../pages/login/login.js';
import { renderRegisterPage } from '../pages/register/register.js';
import { renderAdminPage } from '../pages/admin/admin.js';
import { renderPublicProfilePage } from '../pages/profile/profile.js';

export const appRoutes = [
  {
    path: '/',
    render: renderHomePage,
    implemented: true,
    protected: true,
    requiredRole: null
  },
  {
    path: '/users',
    render: renderUsersPage,
    implemented: true,
    protected: true,
    requiredRole: null
  },
  {
    path: '/login',
    render: renderLoginPage,
    implemented: true,
    protected: false,
    requiredRole: null
  },
  {
    path: '/register',
    render: renderRegisterPage,
    implemented: true,
    protected: false,
    requiredRole: null
  },
  { path: '/messages', implemented: false, protected: true, requiredRole: null },
  { path: '/search', implemented: false, protected: true, requiredRole: null },
  { path: '/friends', implemented: false, protected: true, requiredRole: null },
  {
    path: '/admin',
    render: renderAdminPage,
    implemented: true,
    protected: true,
    requiredRole: 'admin'
  },
  {
    path: '/profile/:id',
    render: renderPublicProfilePage,
    implemented: true,
    protected: true,
    requiredRole: null
  }
];
