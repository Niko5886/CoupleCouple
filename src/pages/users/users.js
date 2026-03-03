import './users.css';
import usersTemplate from './users.html?raw';
import { supabase } from '../../services/supabaseClient.js';

const AVATAR_EMOJIS = ['👨', '👩', '🧑', '👨‍🦱', '👩‍🦱', '🧑‍🦱'];

function getAvatarEmoji(userId) {
  const seed = userId.charCodeAt(0) + userId.charCodeAt(1);
  return AVATAR_EMOJIS[seed % AVATAR_EMOJIS.length];
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getGenderSymbol(gender) {
  if (gender === 'male') return '♂️';
  if (gender === 'female') return '♀️';
  if (gender === 'couple') return '⚥';
  return '';
}

function createUserCard(user, navigateToProfile) {
  const card = document.createElement('div');
  card.className = 'user-card card h-100';
  card.dataset.userId = user.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'link');
  card.setAttribute('aria-label', `Отвори профила на ${user.username || 'потребител'}`);
  
  // Calculate ages for both partners
  const age1 = calculateAge(user.partner1_birth_date || user.birth_date);
  const age2 = calculateAge(user.partner2_birth_date);
  
  let ageGenderStr = '';
  if (age1 && age2) {
    const gender1 = getGenderSymbol(user.partner1_gender);
    const gender2 = getGenderSymbol(user.partner2_gender);
    ageGenderStr = `${age1}${gender1} + ${age2}${gender2}`;
  } else if (age1) {
    const gender1 = getGenderSymbol(user.partner1_gender || user.gender);
    ageGenderStr = `${age1}${gender1}`;
  }
  
  const locationStr = user.city
    ? `<div class="user-location"><i class="bi bi-geo-alt me-1"></i>${user.city}</div>`
    : '';

  card.innerHTML = `
    <div class="user-card-image">
      ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}" loading="lazy">` : `<div class="user-avatar-placeholder">${getAvatarEmoji(user.id)}</div>`}
    </div>
    <div class="user-card-info">
      <div class="user-name">
        ${user.username || 'User'}
        ${user.is_online ? `<span class="status-dot" title="Online"></span>` : ''}
      </div>
      ${ageGenderStr ? `<div class="user-details"><i class="bi bi-cake2 me-1"></i>${ageGenderStr}</div>` : ''}
      ${locationStr}
    </div>
  `;

  card.addEventListener('click', () => {
    navigateToProfile(user.id);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToProfile(user.id);
    }
  });

  return card;
}

async function loadUsers(page, navigateToProfile) {
  const grid = page.querySelector('[data-users-grid]');
  const noUsersMsg = page.querySelector('.no-users-message');

  try {
    grid.innerHTML = '<div class="loading-message"><div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>Loading users...</div>';

    const { data, error } = await supabase.rpc('get_registered_users');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      grid.innerHTML = '';
      noUsersMsg.hidden = false;
      return;
    }

    grid.innerHTML = '';
    noUsersMsg.hidden = true;

    data.forEach((user) => {
      const card = createUserCard(user, navigateToProfile);
      grid.append(card);
    });
  } catch (error) {
    console.error('Error loading users:', error);
    grid.innerHTML = '<div class="loading-message text-danger"><i class="bi bi-exclamation-triangle me-2"></i>Error loading users. Please try again.</div>';
  }
}

function setupRealtimeUpdates(page, navigateToProfile) {
  return supabase
    .channel('profiles-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      loadUsers(page, navigateToProfile);
    })
    .subscribe();
}

export function renderUsersPage(context = {}) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = usersTemplate;
  const page = wrapper.firstElementChild;
  const navigateToProfile = (userId) => {
    if (context?.router) {
      context.router.navigate(`/profile/${userId}`);
    }
  };

  setTimeout(() => {
    loadUsers(page, navigateToProfile);
    setupRealtimeUpdates(page, navigateToProfile);
  }, 0);

  return page;
}
