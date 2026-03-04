import './profileModal.css';
import { getAuthUser, userHasRole } from '../../services/authState.js';
import toast from '../toast/toast.js';
import { showConfirm } from '../dialog/dialog.js';
import {
  fetchProfileWithPhotos,
  uploadProfilePhoto,
  setPrimaryPhoto,
  deletePhoto,
  calculateAge,
  formatLastSeen,
  updateProfile
} from '../../services/profileService.js';

let activeModal = null;
let editMode = false;

function renderTags(tags) {
  if (!tags || !tags.length) return '<span>—</span>';
  return tags.map((t) => `<span class="profile-tag">${t}</span>`).join('');
}

function renderGallery(photos, isOwner) {
  if (!photos || !photos.length) {
    return '<p>Няма снимки.</p>';
  }

  return photos
    .map((photo) => {
      const primaryClass = photo.is_primary ? 'is-primary' : '';
      const status = photo.approval_status || 'approved';
      const isApproved = status === 'approved';
      const statusLabel = status === 'approved'
        ? 'Одобрена'
        : status === 'rejected'
          ? 'Отхвърлена'
          : status === 'in_review'
            ? 'В преглед'
            : 'Чака одобрение';
      const statusClass = `photo-status photo-status--${status}`;
      const controls = isOwner
        ? `<div class="profile-photo__actions">
             <button data-action="set-primary" data-photo-id="${photo.id}" ${isApproved ? '' : 'disabled'}>Основна</button>
             <button data-action="delete-photo" data-photo-id="${photo.id}">Изтрий</button>
           </div>`
        : '';
      return `<div>
        <div class="profile-photo__wrapper">
          <span class="${statusClass}">${statusLabel}</span>
          <img src="${photo.photo_url}" class="profile-photo ${primaryClass}" alt="Profile photo" />
        </div>
        ${controls}
      </div>`;
    })
    .join('');
}

function getPrimaryPhotoUrl(photos, profile) {
  const primary = photos?.find((photo) => photo.is_primary);
  return primary?.photo_url || profile?.avatar_url || '';
}

function renderProfileContent({ profile, photos }, isOwner, inEditMode = false) {
  const age = calculateAge(profile?.birth_date);
  const primaryPhotoUrl = getPrimaryPhotoUrl(photos, profile);
  const avatarMarkup = primaryPhotoUrl
    ? `<img src="${primaryPhotoUrl}" class="profile-avatar__img" alt="Profile avatar" />`
    : '<div class="profile-avatar__placeholder">?</div>';
  const heroMarkup = `
    <div class="profile-hero">
      <div class="profile-avatar">${avatarMarkup}</div>
      <div class="profile-hero__info">
        <div class="profile-hero__name">${profile?.username || 'Профил'}</div>
        <div class="profile-hero__meta">${profile?.city || '—'}${age ? `, ${age} г.` : ''}</div>
      </div>
    </div>
  `;
  
  if (!inEditMode) {
    return `
      ${heroMarkup}
      <div class="profile-meta">
        <div class="profile-field"><label>Град</label><span>${profile?.city || '—'}</span></div>
        <div class="profile-field"><label>Пол</label><span>${profile?.gender || '—'}</span></div>
        <div class="profile-field"><label>Години</label><span>${age || '—'}</span></div>
        <div class="profile-field"><label>Тегло</label><span>${profile?.weight_kg ? profile.weight_kg + ' кг' : '—'}</span></div>
        <div class="profile-field"><label>Ръст</label><span>${profile?.height_cm ? profile.height_cm + ' см' : '—'}</span></div>
        <div class="profile-field"><label>Какво търси</label><div class="profile-tags">${renderTags(profile?.looking_for)}</div></div>
        <div class="profile-field"><label>Фетиши</label><div class="profile-tags">${renderTags(profile?.fetishes)}</div></div>
        <div class="profile-field"><label>Последно онлайн</label><span>${formatLastSeen(profile?.last_seen_at)}</span></div>
        <div class="profile-field"><label>18+ верификация</label><span>${profile?.is_verified_18_plus ? 'Да' : 'Не'}</span></div>
      </div>
      <div class="profile-gallery">
        ${renderGallery(photos, isOwner)}
      </div>
      ${isOwner ? '<div class="profile-upload"><input type="file" accept="image/*" data-photo-upload /><button data-action="upload-photo">Качи снимка</button><small>Макс 5MB</small></div>' : ''}
      <div class="profile-actions">
        <button data-action="toggle-edit" ${isOwner ? '' : 'disabled'}>Редактирай профил</button>
        ${isOwner ? '' : '<small class="profile-edit-hint">Само за собствения профил</small>'}
      </div>
    `;
  }

  // Edit mode
  const lookingForOptions = ['двойки', 'мъже', 'жени', 'групи', 'свинг партита'];
  const lookingForChecked = profile?.looking_for || [];
  
  return `
    <form class="profile-edit-form" data-profile-form>
      ${heroMarkup}
      <div class="profile-field">
        <label>Град</label>
        <input type="text" name="city" value="${profile?.city || ''}" placeholder="София" />
      </div>
      <div class="profile-field">
        <label>Пол</label>
        <select name="gender">
          <option value="">Избери...</option>
          <option value="male" ${profile?.gender === 'male' ? 'selected' : ''}>Мъж</option>
          <option value="female" ${profile?.gender === 'female' ? 'selected' : ''}>Жена</option>
          <option value="couple" ${profile?.gender === 'couple' ? 'selected' : ''}>Двойка</option>
        </select>
      </div>
      <div class="profile-field">
        <label>Рождена дата</label>
        <input type="date" name="birth_date" value="${profile?.birth_date || ''}" />
      </div>
      <div class="profile-field">
        <label>Тегло (кг)</label>
        <input type="number" name="weight_kg" value="${profile?.weight_kg || ''}" placeholder="70" min="30" max="300" />
      </div>
      <div class="profile-field">
        <label>Ръст (см)</label>
        <input type="number" name="height_cm" value="${profile?.height_cm || ''}" placeholder="170" min="100" max="250" />
      </div>
      <div class="profile-field profile-field--wide">
        <label>Какво търси</label>
        <div class="checkbox-group">
          ${lookingForOptions.map(opt => `
            <label class="checkbox-label">
              <input type="checkbox" name="looking_for" value="${opt}" ${lookingForChecked.includes(opt) ? 'checked' : ''} />
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="profile-field profile-field--wide">
        <label>Фетиши (разделени със запетая)</label>
        <textarea name="fetishes" rows="3" placeholder="бондаж, ролеви игри, ...">${(profile?.fetishes || []).join(', ')}</textarea>
      </div>
      <div class="profile-gallery">
        ${renderGallery(photos, isOwner)}
      </div>
      ${isOwner ? `<div class="profile-upload">
        <input type="file" accept="image/*" data-photo-upload />
        <button type="button" data-action="upload-photo">Качи снимка</button>
        <small>Макс 5MB</small>
      </div>` : ''}
      <div class="profile-actions profile-actions--edit">
        <button type="submit" class="btn-primary">Запази</button>
        <button type="button" data-action="cancel-edit" class="btn-secondary">Отказ</button>
      </div>
    </form>
  `;
}

async function loadProfile(modalEl, userId, isOwner, inEditMode = false) {
  const statusEl = modalEl.querySelector('[data-status]');
  const contentEl = modalEl.querySelector('[data-content]');
  statusEl.textContent = 'Зареждане...';
  statusEl.classList.remove('profile-status--error');
  try {
    const data = await fetchProfileWithPhotos(userId);
    statusEl.textContent = inEditMode ? 'Режим редактиране' : 'Профилът е зареден';
    contentEl.innerHTML = renderProfileContent(data, isOwner, inEditMode);
  } catch (err) {
    statusEl.textContent = err.message || 'Грешка при зареждане на профила';
    statusEl.classList.add('profile-status--error');
  }
}

async function handleActions(modalEl, userId) {
  const isOwner = getAuthUser()?.id === userId;
  
  modalEl.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    
    try {
      if (action === 'toggle-edit') {
        if (!isOwner) {
          const statusEl = modalEl.querySelector('[data-status]');
          statusEl.textContent = 'Можеш да редактираш само своя профил.';
          statusEl.classList.add('profile-status--error');
          return;
        }
        editMode = true;
        await loadProfile(modalEl, userId, isOwner, true);
        attachFormHandlers(modalEl, userId);
      }
      if (action === 'cancel-edit') {
        editMode = false;
        await loadProfile(modalEl, userId, isOwner, false);
      }
      if (action === 'upload-photo') {
        const fileInput = modalEl.querySelector('[data-photo-upload]');
        const file = fileInput?.files?.[0];
        if (!fileInput) return;
        if (!file) {
          fileInput.click();
          return;
        }
        const photoData = await uploadProfilePhoto(userId, file, { setPrimary: true });
        const isAdmin = await userHasRole('admin');
        
        if (isAdmin) {
          toast.success('Снимката е качена и автоматично одобрена.', { 
            title: 'Снимка одобрена',
            duration: 4000 
          });
        } else {
          toast.info('Снимката е качена и чака одобрение от администратор.', { 
            title: 'Снимка качена',
            duration: 5000 
          });
        }
        
        await loadProfile(modalEl, userId, isOwner, editMode);
        if (editMode) attachFormHandlers(modalEl, userId);
      }
      if (action === 'set-primary') {
        const photoId = e.target.dataset.photoId;
        await setPrimaryPhoto(userId, photoId);
        toast.success('Снимката беше зададена като основна.', { title: 'Основна снимка' });
        await loadProfile(modalEl, userId, isOwner, editMode);
        if (editMode) attachFormHandlers(modalEl, userId);
      }
      if (action === 'delete-photo') {
        const photoId = e.target.dataset.photoId;
        const confirmed = await showConfirm({
          title: 'Изтриване на снимка',
          message: 'Сигурни ли сте, че искате да изтриете тази снимка?',
          confirmText: 'Изтрий',
          cancelText: 'Отказ',
          confirmClass: 'btn-danger'
        });
        if (!confirmed) return;
        await deletePhoto(userId, photoId);
        toast.warning('Снимката беше изтрита.', { title: 'Снимка изтрита' });
        await loadProfile(modalEl, userId, isOwner, editMode);
        if (editMode) attachFormHandlers(modalEl, userId);
      }
    } catch (err) {
      const statusEl = modalEl.querySelector('[data-status]');
      statusEl.textContent = err.message || 'Грешка при действие';
      statusEl.classList.add('profile-status--error');
      toast.error(err.message || 'Грешка при изпълнение на действието.', { title: 'Грешка' });
    }
  });

  modalEl.addEventListener('change', async (e) => {
    if (!isOwner) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-photo-upload]')) return;
    const file = target.files?.[0];
    if (!file) return;
    try {
      const photoData = await uploadProfilePhoto(userId, file, { setPrimary: true });
      const isAdmin = await userHasRole('admin');
      
      if (isAdmin) {
        toast.success('Снимката е качена и автоматично одобрена.', { 
          title: 'Снимка одобрена',
          duration: 4000 
        });
      } else {
        toast.info('Снимката е качена и чака одобрение от администратор.', { 
          title: 'Снимка качена',
          duration: 5000 
        });
      }
      
      await loadProfile(modalEl, userId, isOwner, editMode);
      if (editMode) attachFormHandlers(modalEl, userId);
    } catch (err) {
      const statusEl = modalEl.querySelector('[data-status]');
      statusEl.textContent = err.message || 'Грешка при качване на снимка';
      statusEl.classList.add('profile-status--error');
      toast.error(err.message || 'Грешка при качване на снимка.', { title: 'Грешка' });
    }
  });
}

function attachFormHandlers(modalEl, userId) {
  const isOwner = getAuthUser()?.id === userId;
  const form = modalEl.querySelector('[data-profile-form]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = modalEl.querySelector('[data-status]');
    
    try {
      const formData = new FormData(form);
      const lookingFor = formData.getAll('looking_for');
      const fetishesRaw = formData.get('fetishes') || '';
      const fetishes = fetishesRaw.split(',').map(f => f.trim()).filter(Boolean);
      
      const payload = {
        city: formData.get('city') || null,
        gender: formData.get('gender') || null,
        birth_date: formData.get('birth_date') || null,
        weight_kg: formData.get('weight_kg') ? parseInt(formData.get('weight_kg'), 10) : null,
        height_cm: formData.get('height_cm') ? parseInt(formData.get('height_cm'), 10) : null,
        looking_for: lookingFor.length > 0 ? lookingFor : null,
        fetishes: fetishes.length > 0 ? fetishes : null
      };

      // Validate age 18+
      if (payload.birth_date) {
        const age = calculateAge(payload.birth_date);
        if (age < 18) {
          throw new Error('Трябва да си навършил 18 години');
        }
      }

      statusEl.textContent = 'Записване...';
      await updateProfile(userId, payload);
      statusEl.textContent = 'Профилът е обновен успешно!';
      
      toast.success('Промените са запазени успешно!', { 
        title: 'Профил актуализиран',
        duration: 4000 
      });
      
      editMode = false;
      
      setTimeout(() => {
        loadProfile(modalEl, userId, isOwner, false);
      }, 1000);
    } catch (err) {
      statusEl.textContent = err.message || 'Грешка при записване';
      statusEl.classList.add('profile-status--error');
      toast.error(err.message || 'Грешка при записване на профила.', { title: 'Грешка' });
    }
  });
}

export async function openProfileModal(userId, { title = 'Профил', closable = true } = {}) {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }

  editMode = false; // Reset edit mode when opening modal
  const currentUser = getAuthUser();
  const isOwner = currentUser && currentUser.id === userId;

  const backdrop = document.createElement('div');
  backdrop.className = 'profile-modal__backdrop';
  backdrop.innerHTML = `
    <div class="profile-modal">
      <div class="profile-modal__header">
        <h2 class="profile-modal__title">${title}</h2>
        ${closable ? '<button class="profile-modal__close" aria-label="Close">×</button>' : ''}
      </div>
      <p class="profile-status" data-status>Зареждане...</p>
      <div data-content></div>
    </div>
  `;

  if (closable) {
    backdrop.querySelector('.profile-modal__close').addEventListener('click', () => {
      backdrop.remove();
      activeModal = null;
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
        activeModal = null;
      }
    });
  }

  document.body.append(backdrop);
  activeModal = backdrop;

  await loadProfile(backdrop.querySelector('.profile-modal'), userId, isOwner);
  handleActions(backdrop.querySelector('.profile-modal'), userId);
}
