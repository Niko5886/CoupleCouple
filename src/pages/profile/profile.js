import './profile.css';
import profileTemplate from './profile.html?raw';
import toast from '../../components/toast/toast.js';
import { fetchProfileWithPhotos, calculateAge, formatLastSeen, updateProfile, uploadProfilePhoto } from '../../services/profileService.js';
import { fetchMessagesWith, sendMessage, markAsRead, subscribeToMessages } from '../../services/messageService.js';
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

function getGenderSymbol(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'male') return '♂';
  if (normalized === 'female') return '♀';
  if (normalized === 'couple') return '⚥';
  return '';
}

function formatCoupleMeta(profile) {
  const age1 = calculateAge(profile.partner1_birth_date || profile.birth_date);
  const age2 = calculateAge(profile.partner2_birth_date);

  if (age1 && age2) {
    const p1 = `${age1}${getGenderSymbol(profile.partner1_gender)}`;
    const p2 = `${age2}${getGenderSymbol(profile.partner2_gender)}`;
    return `${p1} + ${p2}`;
  }

  if (age1) {
    return `${age1}${getGenderSymbol(profile.partner1_gender)} г.`;
  }

  return '';
}

function renderFact(label, displayValue, isEditable = false, field = '', type = 'text', rawValue = '') {
  const editableClass = isEditable ? 'editable-field' : '';
  const dataAttrs = isEditable ? `data-editable="true" data-field="${field}" data-type="${type}" data-raw-value="${escapeHtml(rawValue)}"` : '';
  
  return `<div class="public-profile-fact ${editableClass}" ${dataAttrs}>
    <span class="public-profile-fact__label">${label}</span>
    <span class="public-profile-fact__value" data-display>${escapeHtml(displayValue || '—')}</span>
  </div>`;
}

function renderPartnerCard(profile, partnerIndex, isOwnProfile) {
  const prefix = `partner${partnerIndex}_`;
  const fallbackBirthDate = partnerIndex === 1 ? profile.birth_date : null;
  const fallbackGender = partnerIndex === 1 ? profile.gender : null;
  const fallbackPhoto = partnerIndex === 1 ? profile.avatar_url : null;

  const photoUrl = profile[`${prefix}photo_url`] || fallbackPhoto;
  const birthDate = profile[`${prefix}birth_date`] || fallbackBirthDate;
  const gender = profile[`${prefix}gender`] || fallbackGender;
  const age = calculateAge(birthDate);

  const roleTitle = partnerIndex === 1 ? 'Партньор 1 (Жена)' : 'Партньор 2 (Мъж)';

  return `
    <article class="partner-info-card" data-partner-card="${partnerIndex}">
      <div class="partner-info-card__head">
        <div class="partner-info-card__photo">
          ${photoUrl
            ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(roleTitle)}" loading="lazy" />`
            : `<div class="partner-info-card__placeholder"><i class="bi bi-person"></i></div>`}
        </div>
        <div class="partner-info-card__meta">
          <p class="partner-info-card__title">${roleTitle}</p>
          <p class="partner-info-card__subtitle">${getGenderSymbol(gender)} ${age ? `${age} г.` : '—'}</p>
        </div>
        ${isOwnProfile ? `<button type="button" class="btn btn-outline-light btn-sm partner-photo-upload-btn" data-upload-partner-photo="${partnerIndex}"><i class="bi bi-camera me-1"></i>Снимка</button>` : ''}
      </div>

      <div class="public-profile-facts">
        ${renderFact('Пол', formatGender(gender), isOwnProfile, `${prefix}gender`, 'select', gender || '')}
        ${renderFact('Възраст', age ? `${age} г.` : '—', isOwnProfile, `${prefix}birth_date`, 'date', birthDate || '')}
        ${renderFact('Ръст', profile[`${prefix}height_cm`] ? `${profile[`${prefix}height_cm`]} см` : '—', isOwnProfile, `${prefix}height_cm`, 'number', profile[`${prefix}height_cm`] || '')}
        ${renderFact('Тегло', profile[`${prefix}weight_kg`] ? `${profile[`${prefix}weight_kg`]} кг` : '—', isOwnProfile, `${prefix}weight_kg`, 'number', profile[`${prefix}weight_kg`] || '')}
        ${renderFact('Цвят на коса', profile[`${prefix}hair_color`] || '—', isOwnProfile, `${prefix}hair_color`, 'text', profile[`${prefix}hair_color`] || '')}
        ${renderFact('Цвят на очи', profile[`${prefix}eye_color`] || '—', isOwnProfile, `${prefix}eye_color`, 'text', profile[`${prefix}eye_color`] || '')}
        ${renderFact('Телосложение', profile[`${prefix}appearance`] || '—', isOwnProfile, `${prefix}appearance`, 'text', profile[`${prefix}appearance`] || '')}
        ${renderFact('Ориентация', profile[`${prefix}orientation`] || '—', isOwnProfile, `${prefix}orientation`, 'text', profile[`${prefix}orientation`] || '')}
        ${renderFact('Зодия', profile[`${prefix}zodiac_sign`] || '—', isOwnProfile, `${prefix}zodiac_sign`, 'text', profile[`${prefix}zodiac_sign`] || '')}
      </div>
    </article>
  `;
}

function renderPartners(container, profile, isOwnProfile) {
  container.innerHTML = [
    renderPartnerCard(profile, 1, isOwnProfile),
    renderPartnerCard(profile, 2, isOwnProfile)
  ].join('');
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

function createPhotoButton(photo, index) {
  const isPending = photo.approval_status === 'pending';
  const pendingBadge = isPending ? `<span class="photo-pending-badge">изчаква одобрение</span>` : '';
  return `<button type="button" class="public-profile-photo-btn" data-gallery-open="${index}" aria-label="Отвори снимка ${index + 1}">
    <img class="public-profile-photo" src="${escapeHtml(photo.photo_url)}" alt="Профилна снимка ${index + 1}" loading="lazy" />
    ${pendingBadge}
  </button>`;
}

function renderGallery(container, photos) {
  if (!Array.isArray(photos) || photos.length === 0) {
    container.dataset.galleryMode = 'empty';
    container.dataset.currentIndex = '0';
    container.innerHTML = '<p class="public-profile-empty">Няма видими снимки.</p>';
    return;
  }

  // Dynamically determine photos per slide based on screen width
  let PHOTOS_PER_SLIDE = 3;
  if (window.innerWidth < 680) {
    PHOTOS_PER_SLIDE = 1;
  } else if (window.innerWidth < 1100) {
    PHOTOS_PER_SLIDE = 2;
  }

  const isSliderMode = photos.length > PHOTOS_PER_SLIDE;
  const previousIndex = Number(container.dataset.currentIndex || 0);
  const maxOffset = Math.max(0, photos.length - PHOTOS_PER_SLIDE);
  const currentIndex = Number.isFinite(previousIndex)
    ? ((previousIndex % (maxOffset + 1)) + (maxOffset + 1)) % (maxOffset + 1)
    : 0;

  container.dataset.galleryMode = isSliderMode ? 'slider' : 'grid';
  container.dataset.currentIndex = String(currentIndex);
  container.dataset.photosPerSlide = String(PHOTOS_PER_SLIDE);

  if (!isSliderMode) {
    container.innerHTML = photos
      .map((photo, index) => createPhotoButton(photo, index))
      .join('');
    return;
  }

  const visiblePhotos = photos.slice(currentIndex, currentIndex + PHOTOS_PER_SLIDE);
  const photosHtml = visiblePhotos
    .map((photo, i) => {
      const actualIndex = currentIndex + i;
      return createPhotoButton(photo, actualIndex);
    })
    .join('');

  container.innerHTML = `
    <div class="public-profile-slider">
      <button type="button" class="public-profile-slider__nav" data-gallery-nav="prev" aria-label="Предишни снимки">
        <i class="bi bi-chevron-left"></i>
      </button>
      <div class="public-profile-slider__frame">
        ${photosHtml}
      </div>
      <button type="button" class="public-profile-slider__nav" data-gallery-nav="next" aria-label="Следващи снимки">
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>
  `;
}

function ensureGalleryLightbox(page) {
  let lightbox = page.querySelector('[data-gallery-lightbox]');
  if (lightbox) return lightbox;

  lightbox = document.createElement('div');
  lightbox.className = 'profile-gallery-lightbox';
  lightbox.dataset.galleryLightbox = 'true';
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="profile-gallery-lightbox__overlay" data-lightbox-action="close"></div>
    <div class="profile-gallery-lightbox__content" role="dialog" aria-modal="true" aria-label="Галерия">
      <button type="button" class="profile-gallery-lightbox__close" data-lightbox-action="close" aria-label="Затвори">
        <i class="bi bi-x-lg"></i>
      </button>
      <button type="button" class="profile-gallery-lightbox__nav" data-lightbox-action="prev" aria-label="Предишна снимка">
        <i class="bi bi-chevron-left"></i>
      </button>
      <img class="profile-gallery-lightbox__image" data-lightbox-image src="" alt="Голяма снимка" loading="lazy" />
      <button type="button" class="profile-gallery-lightbox__nav" data-lightbox-action="next" aria-label="Следваща снимка">
        <i class="bi bi-chevron-right"></i>
      </button>
      <p class="profile-gallery-lightbox__counter" data-lightbox-counter>1 / 1</p>
    </div>
  `;

  page.appendChild(lightbox);
  return lightbox;
}

function renderGalleryLightboxImage(page) {
  const photos = Array.isArray(page._galleryPhotos) ? page._galleryPhotos : [];
  const lightbox = ensureGalleryLightbox(page);
  const imageEl = lightbox.querySelector('[data-lightbox-image]');
  const counterEl = lightbox.querySelector('[data-lightbox-counter]');

  if (!photos.length || !imageEl || !counterEl) return;

  const safeIndex = ((Number(page._lightboxIndex) % photos.length) + photos.length) % photos.length;
  page._lightboxIndex = safeIndex;

  imageEl.src = photos[safeIndex].photo_url;
  imageEl.alt = `Голяма снимка ${safeIndex + 1}`;
  counterEl.textContent = `${safeIndex + 1} / ${photos.length}`;
}

function openGalleryLightbox(page, index) {
  const photos = Array.isArray(page._galleryPhotos) ? page._galleryPhotos : [];
  if (!photos.length) return;

  const lightbox = ensureGalleryLightbox(page);
  page._lightboxIndex = index;
  renderGalleryLightboxImage(page);
  lightbox.hidden = false;
  document.body.classList.add('profile-lightbox-open');
}

function closeGalleryLightbox(page) {
  const lightbox = page.querySelector('[data-gallery-lightbox]');
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.classList.remove('profile-lightbox-open');
}

function setupGalleryInteractions(page, galleryEl, photos) {
  if (!galleryEl) return;

  page._galleryPhotos = Array.isArray(photos) ? photos : [];

  if (galleryEl.dataset.galleryBound !== 'true') {
    galleryEl.dataset.galleryBound = 'true';

    galleryEl.addEventListener('click', (event) => {
      const navBtn = event.target.closest('[data-gallery-nav]');
      if (navBtn) {
        const items = Array.isArray(page._galleryPhotos) ? page._galleryPhotos : [];
        const PHOTOS_PER_SLIDE = Number(galleryEl.dataset.photosPerSlide || 3);
        
        // Only allow navigation if slider mode
        if (items.length <= PHOTOS_PER_SLIDE) return;
        
        const current = Number(galleryEl.dataset.currentIndex || 0);
        const maxOffset = items.length - PHOTOS_PER_SLIDE;
        const nextIndex = navBtn.dataset.galleryNav === 'prev'
          ? (current - 1 + maxOffset + 1) % (maxOffset + 1)
          : (current + 1) % (maxOffset + 1);

        galleryEl.dataset.currentIndex = String(nextIndex);
        renderGallery(galleryEl, items);
        return;
      }

      const openBtn = event.target.closest('[data-gallery-open]');
      if (!openBtn) return;
      const photoIndex = Number(openBtn.dataset.galleryOpen || 0);
      openGalleryLightbox(page, photoIndex);
    });
  }

  if (page.dataset.lightboxBound !== 'true') {
    page.dataset.lightboxBound = 'true';

    page.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-lightbox-action]');
      if (!actionEl) return;

      const action = actionEl.dataset.lightboxAction;
      if (action === 'close') {
        closeGalleryLightbox(page);
        return;
      }

      const photosList = Array.isArray(page._galleryPhotos) ? page._galleryPhotos : [];
      if (!photosList.length) return;

      if (action === 'prev') {
        page._lightboxIndex = ((Number(page._lightboxIndex) || 0) - 1 + photosList.length) % photosList.length;
      } else if (action === 'next') {
        page._lightboxIndex = ((Number(page._lightboxIndex) || 0) + 1) % photosList.length;
      }

      renderGalleryLightboxImage(page);
    });
  }
}

function formatChatMessageTime(isoString) {
  return new Date(isoString).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
}

function renderProfileChatMessages(flowEl, messages, currentUserId) {
  if (!Array.isArray(messages) || !messages.length) {
    flowEl.innerHTML = '<p class="profile-chat-modal__empty">Няма съобщения. Започнете разговора.</p>';
    return;
  }

  flowEl.innerHTML = messages
    .map((msg) => {
      const isMine = msg.sender_id === currentUserId;
      return `
        <div class="profile-chat-modal__row ${isMine ? 'is-mine' : 'is-theirs'}">
          <div class="profile-chat-modal__bubble">
            <p>${escapeHtml(msg.content || '')}</p>
            <span>${formatChatMessageTime(msg.created_at)}</span>
          </div>
        </div>
      `;
    })
    .join('');

  flowEl.scrollTop = flowEl.scrollHeight;
}

function appendProfileChatMessage(flowEl, msg, currentUserId) {
  const empty = flowEl.querySelector('.profile-chat-modal__empty');
  if (empty) flowEl.innerHTML = '';

  const isMine = msg.sender_id === currentUserId;
  flowEl.insertAdjacentHTML(
    'beforeend',
    `
      <div class="profile-chat-modal__row ${isMine ? 'is-mine' : 'is-theirs'}">
        <div class="profile-chat-modal__bubble">
          <p>${escapeHtml(msg.content || '')}</p>
          <span>${formatChatMessageTime(msg.created_at)}</span>
        </div>
      </div>
    `
  );

  flowEl.scrollTop = flowEl.scrollHeight;
}

function ensureProfileMessageModal(page) {
  let modal = page.querySelector('[data-profile-chat-modal]');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.className = 'profile-chat-modal';
  modal.dataset.profileChatModal = 'true';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="profile-chat-modal__overlay" data-profile-chat-close></div>
    <div class="profile-chat-modal__panel" role="dialog" aria-modal="true" aria-label="Съобщения">
      <header class="profile-chat-modal__header">
        <div>
          <h3 data-profile-chat-title>Съобщение</h3>
          <p data-profile-chat-status></p>
        </div>
        <button type="button" class="profile-chat-modal__close" data-profile-chat-close aria-label="Затвори">
          <i class="bi bi-x-lg"></i>
        </button>
      </header>
      <div class="profile-chat-modal__flow" data-profile-chat-flow>
        <p class="profile-chat-modal__empty">Зареждане...</p>
      </div>
      <form class="profile-chat-modal__form" data-profile-chat-form>
        <textarea data-profile-chat-input rows="1" placeholder="Напиши съобщение..."></textarea>
        <button type="submit" aria-label="Изпрати">
          <i class="bi bi-send-fill"></i>
        </button>
      </form>
    </div>
  `;

  page.appendChild(modal);
  return modal;
}

function closeProfileMessageModal(page) {
  const modal = page.querySelector('[data-profile-chat-modal]');
  if (!modal) return;

  modal.hidden = true;
  document.body.classList.remove('profile-chat-open');

  if (page._profileChatSub && typeof page._profileChatSub.unsubscribe === 'function') {
    page._profileChatSub.unsubscribe();
  }
  page._profileChatSub = null;
}

async function openProfileMessageModal(page, profileId, profileName, profileStatus) {
  const currentUser = getAuthUser();
  if (!currentUser) {
    router.navigate('/login');
    return;
  }

  const modal = ensureProfileMessageModal(page);
  const titleEl = modal.querySelector('[data-profile-chat-title]');
  const statusEl = modal.querySelector('[data-profile-chat-status]');
  const flowEl = modal.querySelector('[data-profile-chat-flow]');
  const formEl = modal.querySelector('[data-profile-chat-form]');
  const inputEl = modal.querySelector('[data-profile-chat-input]');

  page._profileChatTargetId = profileId;
  titleEl.textContent = `Съобщение до ${profileName}`;
  statusEl.textContent = profileStatus || '';
  flowEl.innerHTML = '<p class="profile-chat-modal__empty">Зареждане...</p>';
  modal.hidden = false;
  document.body.classList.add('profile-chat-open');

  if (page._profileChatSub && typeof page._profileChatSub.unsubscribe === 'function') {
    page._profileChatSub.unsubscribe();
  }

  try {
    const messages = await fetchMessagesWith(profileId);
    renderProfileChatMessages(flowEl, messages, currentUser.id);
    await markAsRead(profileId);
  } catch (error) {
    console.error(error);
    flowEl.innerHTML = '<p class="profile-chat-modal__empty">Грешка при зареждане на съобщения.</p>';
  }

  page._profileChatSub = subscribeToMessages((newMsg) => {
    const chatTargetId = page._profileChatTargetId;
    if (!chatTargetId) return;

    const mineToTarget = newMsg.sender_id === currentUser.id && newMsg.receiver_id === chatTargetId;
    const targetToMine = newMsg.sender_id === chatTargetId && newMsg.receiver_id === currentUser.id;
    if (!mineToTarget && !targetToMine) return;

    appendProfileChatMessage(flowEl, newMsg, currentUser.id);
    if (targetToMine) {
      markAsRead(chatTargetId);
    }
  });

  if (!modal.dataset.bound) {
    modal.dataset.bound = 'true';

    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-profile-chat-close]')) {
        closeProfileMessageModal(page);
      }
    });

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      const targetId = page._profileChatTargetId;
      const content = inputEl.value.trim();
      if (!targetId || !content) return;

      inputEl.value = '';

      try {
        await sendMessage(targetId, content);
      } catch (error) {
        console.error(error);
        toast.error('Неуспешно изпращане на съобщение.');
        inputEl.value = content;
      }
    });
  }

  setTimeout(() => inputEl.focus(), 20);
}

function setupActions(page, profileName, profileStatus, isOwnProfile, profileId) {
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
        openProfileMessageModal(page, profileId, profileName, profileStatus);
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
  const partnersEl = page.querySelector('[data-partners]');
  
  const aboutWrapperEl = page.querySelector('[data-about-wrapper]');
  const aboutEl = page.querySelector('[data-about]');
  const lookingForEl = page.querySelector('[data-looking-for]');
  const fetishesEl = page.querySelector('[data-fetishes]');
  const galleryEl = page.querySelector('[data-gallery]');
  const partnerPhotoInput = page.querySelector('[data-partner-photo-input]');
  
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

    const visiblePhotos = isOwnProfile 
      ? (photos || []).filter((photo) => photo.approval_status !== 'rejected')
      : (photos || []).filter((photo) => (photo.approval_status || 'approved') === 'approved');
      
    const primaryPhoto = visiblePhotos.find((photo) => photo.is_primary) || visiblePhotos[0] || null;

    const profileName = profile.username || 'Профил';
    const city = profile.city || '—';
    const coupleMeta = formatCoupleMeta(profile);

    nameEl.textContent = profileName;
    metaEl.textContent = `${city}${coupleMeta ? ` • ${coupleMeta}` : ''}`;
    statusEl.textContent = profile.is_online ? 'Онлайн' : 'Профилът е зареден';

    if (primaryPhoto?.photo_url || profile.avatar_url) {
      const avatarUrl = primaryPhoto?.photo_url || profile.avatar_url;
      avatarEl.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(profileName)}" />`;
    } else {
      avatarEl.innerHTML = '';
      avatarEl.textContent = profileName.charAt(0).toUpperCase();
    }

    renderPartners(partnersEl, profile, isOwnProfile);

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
    setupGalleryInteractions(page, galleryEl, visiblePhotos);
    
    const profileStatus = profile.is_online ? 'Онлайн' : formatLastSeen(profile.last_seen_at);
    setupActions(page, profileName, profileStatus, isOwnProfile, userId);
    
    if (isOwnProfile) {
      addPhotoBtn.hidden = false;
      photoInput.hidden = true;
      setupEditableFields(page, userId);
      setupPhotoUpload(addPhotoBtn, photoInput, userId, () => loadPublicProfile(page, userId, routerContext));
      setupPartnerPhotoUpload(page, partnerPhotoInput, userId, () => loadPublicProfile(page, userId, routerContext));
    } else {
      addPhotoBtn.hidden = true;
      if (photoInput) photoInput.hidden = true;
      if (partnerPhotoInput) partnerPhotoInput.hidden = true;
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
      newBtn.disabled = true;
      toast.info('Качване на снимката...', { duration: 2000 });
      
      await uploadProfilePhoto(userId, file);
      toast.success('Снимката е качена и изчаква одобрение от админ.');
      
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Неуспшно качване на снимка.');
      newBtn.disabled = false;
    } finally {
      newInput.value = '';
    }
  });
}

function setupPartnerPhotoUpload(page, input, userId, onUploadSuccess) {
  if (!input || page.dataset.partnerPhotoUploadBound === 'true') return;
  page.dataset.partnerPhotoUploadBound = 'true';

  page.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-upload-partner-photo]');
    if (!trigger) return;

    input.dataset.partnerIndex = trigger.dataset.uploadPartnerPhoto;
    input.click();
  });

  input.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    const partnerIndex = input.dataset.partnerIndex;
    if (!file || !partnerIndex) return;

    try {
      toast.info('Качване на снимката...', { duration: 1800 });
      const uploaded = await uploadProfilePhoto(userId, file);
      await updateProfile(userId, { [`partner${partnerIndex}_photo_url`]: uploaded.photo_url });
      toast.success('Снимката е качена и изчаква одобрение от админ.');
      onUploadSuccess();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Неуспешно качване на снимка.');
    } finally {
      input.value = '';
      delete input.dataset.partnerIndex;
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
  } else if (type === 'select' && (field === 'partner1_gender' || field === 'partner2_gender')) {
    form.innerHTML = `
      <select class="inline-edit-input" required>
        <option value="male" ${initialValue === 'male' ? 'selected' : ''}>Мъж</option>
        <option value="female" ${initialValue === 'female' ? 'selected' : ''}>Жена</option>
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
        } else if (type === 'select' && (field === 'gender' || field === 'partner1_gender' || field === 'partner2_gender')) {
          containerForForm.innerHTML = escapeHtml(formatGender(newValue));
        } else if (field === 'birth_date' || field === 'partner1_birth_date' || field === 'partner2_birth_date') {
          containerForForm.innerHTML = escapeHtml(newValue ? `${calculateAge(newValue)} г.` : '—');
        } else {
          const heightFields = ['height_cm', 'partner1_height_cm', 'partner2_height_cm'];
          const weightFields = ['weight_kg', 'partner1_weight_kg', 'partner2_weight_kg'];
          const suffix = heightFields.includes(field) ? ' см' : weightFields.includes(field) ? ' кг' : '';
          containerForForm.innerHTML = escapeHtml(newValue ? `${newValue}${suffix}` : '—');
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
