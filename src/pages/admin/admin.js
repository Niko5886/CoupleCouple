import './admin.css';
import adminTemplate from './admin.html?raw';
import { getAuthUser, userHasRole } from '../../services/authState.js';
import { router } from '../../router/router.js';
import toast from '../../components/toast/toast.js';
import {
  fetchAdminStats,
  fetchPendingProfiles,
  updateProfileStatus,
  fetchPendingPhotos,
  approvePhotosBatch,
  rejectPhotosBatch,
  fetchAuditLog,
  fetchProfileHistory,
  fetchNotifications
} from '../../services/adminService.js';

const selectedPhotos = new Set();

function renderStats(container, stats) {
  container.innerHTML = `
    <div class="admin-stats-grid row g-3">
      <div class="stat-card card col-12 col-sm-6 col-lg-4">
        <p>Чакащи потребители</p>
        <strong>${stats.pendingUsers}</strong>
      </div>
      <div class="stat-card card col-12 col-sm-6 col-lg-4">
        <p>Одобрени потребители</p>
        <strong>${stats.approvedUsers}</strong>
      </div>
      <div class="stat-card card col-12 col-sm-6 col-lg-4">
        <p>Чакащи снимки</p>
        <strong>${stats.pendingPhotos}</strong>
      </div>
      <div class="stat-card card col-12 col-sm-6 col-lg-4">
        <p>Одобрени снимки</p>
        <strong>${stats.approvedPhotos}</strong>
      </div>
      <div class="stat-card card col-12 col-sm-6 col-lg-4">
        <p>Общо потребители</p>
        <strong>${stats.totalUsers}</strong>
      </div>
    </div>
  `;
}

function renderUsers(container, users) {
  if (!users.length) {
    container.innerHTML = '<p class="muted"><i class="bi bi-check-circle me-2"></i>Няма чакащи или в преглед профили.</p>';
    return;
  }

  container.innerHTML = users
    .map((user) => {
      return `
        <div class="admin-list-card" data-user-id="${user.id}">
          <div>
            <p class="eyebrow">${user.approval_status}</p>
            <h3>${user.username || 'Потребител'}</h3>
            <p>${user.city || '—'}${user.birth_date ? ` · ${new Date(user.birth_date).getFullYear()}` : ''}</p>
            <p class="muted">Регистриран: ${user.created_at ? new Date(user.created_at).toLocaleString('bg-BG') : '—'}</p>
            ${user.rejection_reason ? `<p class="text-danger">Причина: ${user.rejection_reason}</p>` : ''}
          </div>
          <div class="admin-actions">
            <button data-action="user-review" data-id="${user.id}" class="btn btn-outline-secondary btn-sm">В преглед</button>
            <button data-action="user-approve" data-id="${user.id}" class="btn-primary btn btn-sm"><i class="bi bi-check-lg me-1"></i>Одобри</button>
            <button data-action="user-reject" data-id="${user.id}" class="btn-danger btn btn-sm"><i class="bi bi-x-lg me-1"></i>Отхвърли</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderPhotos(container, photos) {
  selectedPhotos.clear();
  if (!photos.length) {
    container.innerHTML = '<p class="muted"><i class="bi bi-images me-2"></i>Няма чакащи снимки.</p>';
    return;
  }

  container.innerHTML = `
    <div class="photo-actions">
      <button data-action="photos-approve-selected" class="btn-primary btn"><i class="bi bi-check2-square me-1"></i>Одобри избраните</button>
      <button data-action="photos-reject-selected" class="btn-danger btn"><i class="bi bi-x-square me-1"></i>Отхвърли избраните</button>
    </div>
    <div class="photo-grid">
      ${photos
        .map(
          (photo) => `
            <div class="photo-card" data-photo-id="${photo.id}">
              <label class="checkbox form-check">
                <input class="form-check-input" type="checkbox" data-photo-checkbox value="${photo.id}" />
                <span>Избери</span>
              </label>
              <img src="${photo.photo_url}" alt="Снимка" />
              <p class="muted">Статус: ${photo.approval_status}</p>
              <p class="muted">Качена: ${photo.uploaded_at ? new Date(photo.uploaded_at).toLocaleString('bg-BG') : '—'}</p>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderAuditLog(container, entries) {
  if (!entries.length) {
    container.innerHTML = '<p class="muted">Няма записани админ действия.</p>';
    return;
  }
  container.innerHTML = entries
    .map(
      (item) => `
        <div class="audit-row">
          <p><strong>${item.action}</strong> · ${new Date(item.created_at).toLocaleString('bg-BG')}</p>
          <p class="muted">User: ${item.target_user_id || '—'} · Photo: ${item.target_photo_id || '—'}</p>
        </div>
      `
    )
    .join('');
}

function renderProfileHistory(container, entries) {
  if (!entries.length) {
    container.innerHTML = '<p class="muted">Няма история на профилни промени.</p>';
    return;
  }
  container.innerHTML = entries
    .map((item) => {
      const oldName = item.old_data?.username || '—';
      const newName = item.new_data?.username || '—';
      return `
        <div class="history-row">
          <p><strong>${item.user_id}</strong> · ${new Date(item.changed_at).toLocaleString('bg-BG')}</p>
          <p class="muted">${oldName} → ${newName}</p>
        </div>
      `;
    })
    .join('');
}

function renderNotifications(container, entries) {
  if (!entries.length) {
    container.innerHTML = '<p class="muted">Няма нови известия.</p>';
    return;
  }
  container.innerHTML = entries
    .map(
      (item) => `
        <div class="notification-row">
          <p><strong>${item.type}</strong> · ${new Date(item.created_at).toLocaleString('bg-BG')}</p>
          <p class="muted">User: ${item.target_user_id || '—'} · Photo: ${item.target_photo_id || '—'} · Статус: ${item.status}</p>
        </div>
      `
    )
    .join('');
}

async function loadAdminData(container) {
  const statsBox = container.querySelector('[data-admin-stats]');
  const usersBox = container.querySelector('[data-users-list]');
  const photosBox = container.querySelector('[data-photos-list]');
  const auditBox = container.querySelector('[data-audit-log]');
  const historyBox = container.querySelector('[data-profile-history]');
  const notificationsBox = container.querySelector('[data-admin-notifications]');

  try {
    const [stats, users, photos, audit, history, notifications] = await Promise.all([
      fetchAdminStats(),
      fetchPendingProfiles(),
      fetchPendingPhotos(),
      fetchAuditLog(),
      fetchProfileHistory(),
      fetchNotifications()
    ]);

    renderStats(statsBox, stats);
    renderUsers(usersBox, users);
    renderPhotos(photosBox, photos);
    renderAuditLog(auditBox, audit);
    renderProfileHistory(historyBox, history);
    renderNotifications(notificationsBox, notifications);
  } catch (error) {
    console.error('Failed to load admin data:', error);
    toast.error('Грешка при зареждане на данните.', { title: 'Грешка при зареждане' });
  }
}

function attachUserActions(container) {
  container.addEventListener('click', async (e) => {
    const actionTrigger = e.target.closest('[data-action][data-id]');
    if (!actionTrigger) return;

    const action = actionTrigger.dataset.action;
    const userId = actionTrigger.dataset.id;
    if (!action || !userId) return;

    try {
      if (action === 'user-review') {
        await updateProfileStatus(userId, 'in_review');
        toast.info('Профилът е преместен в преглед.', { title: 'В преглед' });
      }
      if (action === 'user-approve') {
        await updateProfileStatus(userId, 'approved');
        toast.success('Профилът е одобрен успешно!', { title: 'Одобрен профил' });
      }
      if (action === 'user-reject') {
        const reason = prompt('Причина за отхвърляне:') || '';
        await updateProfileStatus(userId, 'rejected', reason);
        toast.warning('Профилът е отхвърлен.', { title: 'Отхвърлен профил' });
      }
      await loadAdminData(container);
    } catch (error) {
      console.error('Admin action error:', error);
      toast.error(error.message || 'Възникна грешка при обработката.', { title: 'Грешка' });
    }
  });
}

function attachPhotoActions(container) {
  container.addEventListener('change', (e) => {
    if (e.target.matches('[data-photo-checkbox]')) {
      const id = e.target.value;
      if (e.target.checked) selectedPhotos.add(id);
      else selectedPhotos.delete(id);
    }
  });

  container.addEventListener('click', async (e) => {
    const actionTrigger = e.target.closest('[data-action]');
    if (!actionTrigger) return;

    const action = actionTrigger.dataset.action;
    if (!action) return;

    try {
      if (action === 'photos-approve-selected') {
        const count = selectedPhotos.size;
        if (count === 0) {
          toast.warning('Моля, изберете поне една снимка.', { title: 'Няма избрани снимки' });
          return;
        }
        await approvePhotosBatch(Array.from(selectedPhotos));
        toast.success(`${count} ${count === 1 ? 'снимка е одобрена' : 'снимки са одобрени'} успешно!`, { title: 'Одобрени снимки' });
        await loadAdminData(container);
      }
      if (action === 'photos-reject-selected') {
        const count = selectedPhotos.size;
        if (count === 0) {
          toast.warning('Моля, изберете поне една снимка.', { title: 'Няма избрани снимки' });
          return;
        }
        const reason = prompt('Причина за отхвърляне:') || '';
        await rejectPhotosBatch(Array.from(selectedPhotos), reason);
        toast.warning(`${count} ${count === 1 ? 'снимка е отхвърлена' : 'снимки са отхвърлени'}.`, { title: 'Отхвърлени снимки' });
        await loadAdminData(container);
      }
    } catch (error) {
      console.error('Photo action error:', error);
      toast.error(error.message || 'Възникна грешка при обработката на снимките.', { title: 'Грешка' });
    }
  });
}

async function initializeAdminPanel(container) {
  const status = container.querySelector('[data-admin-status]');
  const content = container.querySelector('[data-admin-content]');
  const adminEmail = container.querySelector('[data-admin-email]');

  const currentUser = getAuthUser();

  if (!currentUser) {
    router.navigate('/login');
    return;
  }

  const isAdmin = await userHasRole('admin');
  if (!isAdmin) {
    router.navigate('/users');
    return;
  }

  adminEmail.textContent = currentUser.email || 'unknown';
  status.textContent = 'Admin access verified.';
  status.className = 'admin-status admin-status--success';
  content.hidden = false;

  await loadAdminData(container);
  attachUserActions(container);
  attachPhotoActions(container);
}

export function renderAdminPage() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = adminTemplate;
  const page = wrapper.firstElementChild;

  initializeAdminPanel(page);
  return page;
}
