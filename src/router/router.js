import Navigo from 'navigo';
import { appRoutes } from './routeConfig.js';
import { createHeader } from '../components/header/header.js';
import { createFooter } from '../components/footer/footer.js';
import { isAuthenticated, userHasRole } from '../services/authState.js';

export const router = new Navigo('/');

function createComingSoon(path) {
  const section = document.createElement('section');
  section.innerHTML = `
    <h1>Coming Soon</h1>
    <p>The page <strong>${path}</strong> is mapped but not implemented yet.</p>
  `;
  return section;
}

function renderLayout(contentNode, activePath) {
  const app = document.querySelector('#app');
  app.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const headerFragment = createHeader(router, activePath);
  shell.append(headerFragment);

  const content = document.createElement('main');
  content.className = 'app-content';
  content.append(contentNode);
  shell.append(content);

  shell.append(createFooter());
  app.append(shell);
  
  // Toggle background image based on active page
  if (activePath === '/login' || activePath === '/register' || activePath === '/') {
    document.body.classList.add('auth-body');
  } else {
    document.body.classList.remove('auth-body');
  }
}

export function initializeRouter() {
  appRoutes.forEach((route) => {
    router.on(route.path, async (match) => {
      // Check if route is protected
      if (route.protected && !isAuthenticated()) {
        // Redirect to login if not authenticated
        router.navigate('/login');
        return;
      }

      if (route.requiredRole) {
        const hasRequiredRole = await userHasRole(route.requiredRole);
        if (!hasRequiredRole) {
          router.navigate('/users');
          return;
        }
      }

      if (route.implemented && route.render) {
        renderLayout(route.render({ router, match, params: match?.data || {} }), route.path);
        return;
      }

      renderLayout(createComingSoon(route.path), route.path);
    });
  });

  router.notFound(() => {
    renderLayout(createComingSoon(window.location.pathname), window.location.pathname);
  });

  router.resolve();
}
