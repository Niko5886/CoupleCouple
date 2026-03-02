import './profile.css';
import profileTemplate from './profile.html?raw';
import toast from '../../components/toast/toast.js';
import { fetchProfileWithPhotos, calculateAge, formatLastSeen, updateProfile, uploadProfilePhoto } from '../../services/profileService.js';
import { getAuthUser } from '../../services/authState.js';
import { router } from '../../router/router.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatGender(value) {
  if (!value) return '—';
  const normalized = String(value).toLowerCase();
  if (normalized === 'male') return 'Мъж';
  if (normalized === 'female') return 'Жена';
  if (normalized === 'couple') return 'Двойка';
  return value;
}

function renderFact(label, displayValue, isEditable = false, field = '', type = 'text', rawValue = '') {
  const editableClass = isEditable ? 'editable-field' : '';
  const dataAttrs = isEditable ? `data-editable="true" data-field="${field}" data-type="${type}" data-raw-value="${escapeHtml(rawValue)}"` : '';
  
  return `<div class="public-profile-fact ${editableClass}" ${dataAttrs}>
    <span class="public-profile-fact__label">${label}</span>
    <span class="public-profile-fact__value" data-display>${escapeHtml(displayValue || '—')}</span>
  </div>`;
}

function renderTags(container, items, isEditable = false, tagField = '') {
  const formattedItems = (!Array.isArray(items) || items.length === 0) ? [] : items;
  
  if (isEditable) {
    container.classList.add('editable-field');
    container.dataset.editable = 'true';
    container.dataset.field = tagField;
    container.dataset.type = 'array';
    container.dataset.rawValue = formattedItems.join(', ');
  } else {
    container.classList.remove('editable-field');
    delete container.dataset.editable;
  }

  if (formattedItems.length === 0) {
    container.innerHTML = '<p class="public-profile-empty">Няма добавени тагове.</p>';
    return;
  }

  container.innerHTML = formattedItems
    .map((item) => `<span class="public-profile-tag">${escapeHtml(item.trim())}</span>`)
    .join('');
}

function renderGallery(container, photos) {
  if (!Array.isArray(photos) || photos.length === 0) {
    container.innerHTML = '<p class="public-profile-empty">Няма видими снимки.</p>';
    return;
  }

  container.innerHTML = photos
    .map(
      (photo) =>
        `<img class="public-profile-photo" src="${escapeHtml(photo.photo_url)}" alt="Профилна снимка" loading="lazy" />`
    )
    .join('');
}

function setupActions(page, profileName, isOwnProfile, profileId) {
  const actionsSection = page.querySelector('[data-actions-section]');
  if (actionsSection) {
    if (isOwnProfile) {
      actionsSection.hidden = true;
      return;
    }
    actionsSection.hidden = false;
  }

  page.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action]');
      const action = btn?.dataset?.action;
      if (!action) return;

      if (action === 'message') {
        router.navigate(`/messages?userId=${profileId}`);
    } else if (action === 'friend') {
      toast.info('Добавянето в приятели ще се свърже в следваща стъпка.', { title: `Приятелство с ${profileName}` });
    } else if (action === 'like') {
      toast.success('Профилът е харесан.', { title: 'Харесване' });
    }
  });
}

function getEighteenYearsAgoString() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().split('T')[0];
}

async function loadPublicProfile(page, userId, routerContext) {
  const statusEl = page.querySelector('[data-status]');
  const nameEl = page.querySelector('[data-name]');
  const metaEl = page.querySelector('[data-meta]');
  const avatarEl = page.querySelector('[data-avatar]');
  const coverEl = page.querySelector('[data-cover]');
  const factsEl = page.querySelector('[data-facts]');
  
  const aboutWrapperEl = page.querySelector('[data-about-wrapper]');
  const aboutEl = page.querySelector('[data-about]');
  const lookingForEl = page.querySelector('[data-looking-for]');
  const fetishesEl = page.querySelector('[data-fetishes]');
  const galleryEl = page.querySelector('[data-gallery]');
  
  const addPhotoBtn = page.querySelector('[data-add-photo]');
  const photoInput = page.querySelector('[data-photo-input]');

  const currentUser = getAuthUser();
  const isOwnProfile = currentUser?.id === userId;

  statusEl.textContent = 'Зареждане на профила...';
  statusEl.classList.remove('error');

  try {
    const { profile, photos } = await fetchProfileWithPhotos(userId);

    if (!profile) {
      statusEl.textContent = 'Профилът не е намерен.';
      statusEl.classList.add('error');
      return;
    }

    const age = calculateAge(profile.birth_date);
    const visiblePhotos = isOwnProfile 
      ? (photos || [])
      : (photos || []).filter((photo) => (photo.approval_status || 'approved') === 'approved');
      
    const primaryPhoto = visiblePhotos.find((photo) => photo.is_primary) || visiblePhotos[0] || null;

    const profileName = profile.username || 'Профил';
    const city = profile.city || '—';

    nameEl.textContent = profileName;
    metaEl.textContent = `${city}${age ? `, ${age} г.` : ''}`;
    statusEl.textContent = profile.is_online ? 'Онлайн' : 'Профилът е зареден';

    if (primaryPhoto?.photo_url || profile.avatar_url) {
      const avatarUrl = primaryPhoto?.photo_url || profile.avatar_url;
      avatarEl.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(profileName)}" />`;
      coverEl.style.backgroundImage = `url('${avatarUrl.replace(/'/g, "\\'")}')`;
      coverEl.classList.add('has-image');
    } else {
      avatarEl.innerHTML = '';
      avatarEl.textContent = profileName.charAt(0).toUpperCase();
      coverEl.style.backgroundImage = '';
      coverEl.classList.remove('has-image');
    }

    factsEl.innerHTML = [
      renderFact('Потребител', profile.username || '—', isOwnProfile, 'username', 'text', profile.username || ''),
      renderFact('Възраст', age ? `${age} г.` : '—', isOwnProfile, 'birth_date', 'date', profile.birth_date || ''),
      renderFact('Пол', formatGender(profile.gender), isOwnProfile, 'gender', 'select', profile.gender || ''),
      renderFact('Град', profile.city || '—', isOwnProfile, 'city', 'text', profile.city || ''),
      renderFact('Ръст', profile.height_cm ? `${profile.height_cm} см` : '—', isOwnProfile, 'height_cm', 'number', profile.height_cm || ''),
      renderFact('Тегло', profile.weight_kg ? `${profile.weight_kg} кг` : '—', isOwnProfile, 'weight_kg', 'number', profile.weight_kg || ''),
      renderFact('18+ верификация', profile.is_verified_18_plus ? 'Да' : 'Не', false),
      renderFact('Последно онлайн', formatLastSeen(profile.last_seen_at), false)
    ].join('');

    aboutEl.textContent = profile.bio || profile.about || (isOwnProfile ? 'Напиши нещо за себе си тук...' : 'Потребителят все още не е добавил описание.');
    if (isOwnProfile) {
      aboutWrapperEl.classList.add('editable-field');
      aboutWrapperEl.dataset.editable = 'true';
      aboutWrapperEl.dataset.field = 'about';
      aboutWrapperEl.dataset.type = 'textarea';
      aboutWrapperEl.dataset.rawValue = profile.bio || profile.about || '';
    } else {
      aboutWrapperEl.classList.remove('editable-field');
      delete aboutWrapperEl.dataset.editable;
    }

    renderTags(lookingForEl, profile.looking_for || [], isOwnProfile, 'looking_for');
    renderTags(fetishesEl, profile.fetishes || [], isOwnProfile, 'fetishes');
    renderGallery(galleryEl, visiblePhotos);
    
    setupActions(page, profileName, isOwnProfile, userId);
    
    if (isOwnProfile) {
      addPhotoBtn.hidden = false;
      photoInput.hidden = false;
      setupEditableFields(page, userId);
      setupPhotoUpload(addPhotoBtn, photoInput, userId, () => loadPublicProfile(page, userId, routerContext));
    } else {
      addPhotoBtn.hidden = true;
      if (photoInput) photoInput.hidden = true;
    }
  } catch (error) {
    statusEl.textContent = error?.message || 'Възникна грешка при зареждането на профила.';
    statusEl.classList.add('error');
    console.error(error);
  }
}

function setupPhotoUpload(addBtn, fileInput, userId, onUploadSuccess) {
  const newBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newBtn, addBtn);
  const newInput = fileInput.cloneNode(true);
  fileInput.parentNode.replaceChild(newInput, fileInput);

  newBtn.addEventListener('click', () => newInput.click());

  newInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      newBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
      newBtn.disabled = true;
      toast.info('Качване на снимката...', { duration: 2000 });
      
      await uploadProfilePhoto(userId, file);
      toast.success('Снимката е качена успешно!');
      
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Неуспшно качване на снимка.');
      newBtn.innerHTML = '<i class="bi bi-plus-lg"></i>';
      newBtn.disabled = false;
    } finally {
      newInput.value = '';
    }
  });
}

function createEditForm(type, field, initialValue, onSave, onCancel) {
  const form = document.createElement('form');
  form.className = 'inline-edit-form';
  
  if (type === 'textarea') {
    form.classList.add('inline-edit-form--textarea');
    form.innerHTML = `
      <textarea class="inline-edit-textarea" required>${escapeHtml(initialValue)}</textarea>
      <div class="textarea-actions">
        <button type="button" class="inline-edit-btn btn btn-outline-secondary btn-sm" data-cancel><i class="bi bi-x-lg me-1"></i>Отказ</button>
        <button type="submit" class="inline-edit-btn btn btn-primary btn-sm"><i class="bi bi-check-lg me-1"></i>Запази</button>
      </div>
    `;
  } else if (type === 'array') {
     form.innerHTML = `
      <input type="text" class="inline-edit-input" value="${escapeHtml(initialValue)}" placeholder="разделени със запетая..." />
      <div class="inline-edit-actions">
        <button type="submit" class="inline-edit-btn btn btn-primary btn-sm" title="Запази"><i class="bi bi-check-lg"></i></button>
        <button type="button" class="inline-edit-btn btn btn-outline-secondary btn-sm" data-cancel title="Отказ"><i class="bi bi-x-lg"></i></button>
      </div>
    `;
  } else if (type === 'select' && field === 'gender') {
    form.innerHTML = `
      <select class="inline-edit-input" required>
        <option value="male" ${initialValue === 'male' ? 'selected' : ''}>Мъж</option>
        <option value="female" ${initialValue === 'female' ? 'selected' : ''}>Жена</option>
        <option value="couple" ${initialValue === 'couple' ? 'selected' : ''}>Двойка</option>
      </select>
      <div class="inline-edit-actions">
        <button type="submit" class="inline-edit-btn btn btn-primary btn-sm" title="Запази"><i class="bi bi-check-lg"></i></button>
        <button type="button" class="inline-edit-btn btn btn-outline-secondary btn-sm" data-cancel title="Отказ"><i class="bi bi-x-lg"></i></button>
      </div>
    `;
  } else if (type === 'date') {
    form.innerHTML = `
      <input type="${type}" class="inline-edit-input" value="${escapeHtml(initialValue)}" required max="${getEighteenYearsAgoString()}" />
      <div class="inline-edit-actions">
        <button type="submit" class="inline-edit-btn btn btn-primary btn-sm" title="Запази"><i class="bi bi-check-lg"></i></button>
        <button type="button" class="inline-edit-btn btn btn-outline-secondary btn-sm" data-cancel title="Отказ"><i class="bi bi-x-lg"></i></button>
      </div>
    `;
  } else {
    form.innerHTML = `
      <input type="${type}" class="inline-edit-input" value="${escapeHtml(initialValue)}" required />
      <div class="inline-edit-actions">
        <button type="submit" class="inline-edit-btn btn btn-primary btn-sm" title="Запази"><i class="bi bi-check-lg"></i></button>
        <button type="button" class="inline-edit-btn btn btn-outline-secondary btn-sm" data-cancel title="Отказ"><i class="bi bi-x-lg"></i></button>
      </div>
    `;
  }

  form.querySelector('[data-cancel]').addEventListener('click', () => onCancel());
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input, textarea, select');
    let finalValue = input.value;
    
    if (type === 'array') {
      finalValue = finalValue.split(',').map(s => s.trim()).filter(Boolean);
    } else if (type === 'number') {
      finalValue = Number(finalValue);
    }
    
    if (finalValue === '' && type !== 'array') {
        finalValue = null;
    }

    onSave(finalValue);
  });
  
  return form;
}

function setupEditableFields(page, userId) {
  if (page.dataset.editingBound === 'true') return;
  page.dataset.editingBound = 'true';

  page.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-editable="true"]');
    if (!el || el.classList.contains('is-editing')) return;

    const isInsideForm = e.target.closest('form');
    if (isInsideForm) return;

    el.classList.add('is-editing');
    const field = el.dataset.field;
    const type = el.dataset.type;
    const rawValue = el.dataset.rawValue || '';
    
    let containerForForm = el;
    let oldContent = '';

    if (type === 'textarea') {
      containerForForm = el;
      oldContent = el.innerHTML;
    } else if (type === 'array') {
      containerForForm = el;
      oldContent = el.innerHTML;
    } else {
      const displaySpan = el.querySelector('[data-display]');
      if (displaySpan) {
        containerForForm = displaySpan;
        oldContent = displaySpan.innerHTML;
      }
    }

    const cancel = () => {
      containerForForm.innerHTML = oldContent;
      el.classList.remove('is-editing');
    };

    const save = async (newValue) => {
      const formNode = containerForForm.querySelector('form');
      if (formNode) {
        formNode.querySelectorAll('button, input, textarea, select').forEach(b => b.disabled = true);
      }
      
      try {
        let payloadField = field;
        if (field === 'about') {
           payloadField = 'bio';
        }

        await updateProfile(userId, { [payloadField]: newValue });
        toast.success('Промяната е запазена!');
        el.dataset.rawValue = Array.isArray(newValue) ? newValue.join(', ') : (newValue || '');
        
        if (type === 'textarea') {
          containerForForm.innerHTML = `<p class="public-profile-about-text" data-about>${escapeHtml(newValue || 'Напиши нещо за себе си тук...')}</p>`;
        } else if (type === 'array') {
          renderTags(el, newValue, true, field);
        } else if (type === 'select' && field === 'gender') {
          containerForForm.innerHTML = escapeHtml(formatGender(newValue));
        } else if (field === 'birth_date') {
          containerForForm.innerHTML = escapeHtml(newValue ? `${calculateAge(newValue)} г.` : '—');
        } else {
          containerForForm.innerHTML = escapeHtml(newValue ? (newValue + (field === 'height_cm' ? ' см' : field === 'weight_kg' ? ' кг' : '')) : '—');
        }
      } catch (err) {
        console.error(err);
        toast.error('Грешка при запазване: ' + err.message);
        cancel();
      } finally {
        el.classList.remove('is-editing');
      }
    };

    const form = createEditForm(type, field, rawValue, save, cancel);
    containerForForm.innerHTML = '';
    containerForForm.appendChild(form);
    
    setTimeout(() => {
      const input = form.querySelector('input, textarea, select');
      if (input) input.focus();
    }, 10);
  });
}

export function renderPublicProfilePage(context = {}) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = profileTemplate;
  const page = wrapper.firstElementChild;

  const userId = context?.params?.id;
  if (!userId) {
    const statusEl = page.querySelector('[data-status]');
    statusEl.textContent = 'Липсва идентификатор на профил.';
    statusEl.classList.add('error');
    return page;
  }

  loadPublicProfile(page, userId, context);
  return page;
}
