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
  fetchNotifications,
  fetchAllUsers,
  deleteUserAndData
} from '../../services/adminService.js';

const selectedPhotos = new Set();

function renderStats(container, stats) {
  container.innerHTML = `
    <div class="row g-4 mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="card-title text-muted mb-0">Чакащи Профили</h6>
              <div class="bg-warning bg-opacity-10 text-warning rounded p-2">
                <i class="bi bi-hourglass-split"></i>
              </div>
            </div>
            <h3 class="mb-0 text-white">${stats.pendingUsers}</h3>
          </div>
        </div>
      </div>
      
      <div class="col-sm-6 col-lg-3">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="card-title text-muted mb-0">Чакащи Снимки</h6>
              <div class="bg-info bg-opacity-10 text-info rounded p-2">
                <i class="bi bi-images"></i>
              </div>
            </div>
            <h3 class="mb-0 text-white">${stats.pendingPhotos}</h3>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-lg-3">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="card-title text-muted mb-0">Одобрени Профили</h6>
              <div class="bg-success bg-opacity-10 text-success rounded p-2">
                <i class="bi bi-check-circle"></i>
              </div>
            </div>
            <h3 class="mb-0 text-white">${stats.approvedUsers}</h3>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-lg-3">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="card-title text-muted mb-0">Регистрирани</h6>
              <div class="bg-primary bg-opacity-10 text-primary rounded p-2">
                <i class="bi bi-people"></i>
              </div>
            </div>
            <h3 class="mb-0 text-white">${stats.totalUsers}</h3>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderUsers(container, users) {
  if (!users.length) {
    container.innerHTML = '<div class="alert alert-dark border-secondary bg-transparent m-3 text-muted text-center"><i class="bi bi-check2-circle text-success fs-4 d-block mb-2"></i>Няма чакащи или в преглед профили.</div>';
    return;
  }

  container.innerHTML = users
    .map((user) => {
      let badgeClass = user.approval_status === 'in_review' ? 'bg-info' : 'bg-warning text-dark';
      let icon = user.approval_status === 'in_review' ? 'bi-search' : 'bi-hourglass';
      
      const avatarImg = user.avatar_url ? user.avatar_url : 'https://placehold.co/100x100/182436/8eb7f1?text=U';

      return `
        <div class="list-group-item bg-transparent border-bottom border-secondary border-opacity-25 py-3" data-user-id="${user.id}">
          <div class="d-flex align-items-start position-relative">
             <img src="${avatarImg}" alt="Avatar" class="rounded-circle me-3 border border-secondary" style="width: 56px; height: 56px; object-fit: cover;">
             <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <h6 class="mb-0 text-white">${user.username || 'Без име'}</h6>
                  <span class="badge ${badgeClass} text-uppercase"><i class="bi ${icon} me-1"></i>${user.approval_status}</span>
                </div>
                <p class="mb-1 text-muted small"><i class="bi bi-geo-alt me-1"></i>${user.city || 'Неизвестен град'} ${user.birth_date ? ` • ${new Date(user.birth_date).getFullYear()} г.` : ''}</p>
                <p class="mb-2 text-white-50" style="font-size: 0.75rem;"><i class="bi bi-person-add me-1"></i>${user.created_at ? new Date(user.created_at).toLocaleString('bg-BG') : '—'}</p>
                
                ${user.rejection_reason ? `<div class="alert alert-danger p-2 mb-2 small border-danger bg-opacity-10 text-danger"><i class="bi bi-exclamation-triangle me-1"></i>${user.rejection_reason}</div>` : ''}

                <div class="mt-2 d-flex flex-wrap gap-2">
                  <button data-action="user-approve" data-id="${user.id}" class="btn btn-success btn-sm px-3"><i class="bi bi-check-lg me-1"></i>Одобри</button>
                  ${user.approval_status === 'pending' ? `<button data-action="user-review" data-id="${user.id}" class="btn btn-outline-info btn-sm"><i class="bi bi-search me-1"></i>В преглед</button>` : ''}
                  <button data-action="user-reject" data-id="${user.id}" class="btn btn-outline-danger btn-sm"><i class="bi bi-x-lg me-1"></i>Отхвърли</button>
                </div>
             </div>
          </div>
        </div>
      `;
    })
    .join('');
}

  function renderAllUsers(container, users) {
    if (!users.length) {
      container.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Няма регистрирани потребители.</td></tr>';
      return;
    }

    container.innerHTML = users
      .map((user) => {
        
        let statusBadge = '';
        switch(user.approval_status) {
            case 'approved': statusBadge = '<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-2 py-1"><i class="bi bi-check-circle me-1"></i>Одобрен</span>'; break;
            case 'pending': statusBadge = '<span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 px-2 py-1"><i class="bi bi-hourglass-split me-1"></i>Чакащ</span>'; break;
            case 'in_review': statusBadge = '<span class="badge bg-info bg-opacity-25 text-info border border-info border-opacity-50 px-2 py-1"><i class="bi bi-search me-1"></i>В преглед</span>'; break;
            case 'rejected': statusBadge = '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50 px-2 py-1"><i class="bi bi-x-circle me-1"></i>Отхвърлен</span>'; break;
            default: statusBadge = `<span class="badge bg-secondary">${user.approval_status}</span>`;
        }

        const avatarImg = user.avatar_url ? user.avatar_url : 'https://placehold.co/100x100/182436/8eb7f1?text=U';
        const formattedDate = user.created_at ? new Date(user.created_at).toLocaleDateString('bg-BG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        
        return `
          <tr data-user-id="${user.id}">
            <td class="ps-3">
              <div class="d-flex align-items-center">
                <img src="${avatarImg}" alt="Avatar" class="rounded-circle me-3 border border-secondary" style="width: 48px; height: 48px; object-fit: cover;">
                <div>
                  <h6 class="mb-0 text-white">${user.username || 'Неизвестен'}</h6>
                  <span class="text-muted small font-monospace">${user.id.substring(0, 13)}...</span>
                </div>
              </div>
            </td>
            <td>
              <p class="mb-0 text-white-50"><i class="bi bi-geo-alt me-1"></i>${user.city || '—'}</p>
              <p class="mb-0 text-muted small"><i class="bi bi-calendar3 me-1"></i>${formattedDate}</p>
            </td>
            <td class="text-center">
              ${statusBadge}
            </td>
            <td class="pe-3 text-end">
              <button data-action="user-delete-full" data-id="${user.id}" class="btn btn-outline-danger btn-sm" title="Изтрий напълно">
                <i class="bi bi-trash3"></i> <span class="d-none d-md-inline ms-1">Изтрий</span>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

function renderPhotos(container, photos) {
  selectedPhotos.clear();
  if (!photos.length) {
    container.innerHTML = '<div class="alert alert-dark border-secondary bg-transparent m-3 text-muted text-center"><i class="bi bi-images text-success fs-4 d-block mb-2"></i>Няма чакащи за одобрение снимки.</div>';
    return;
  }

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4 p-3 bg-dark rounded border border-secondary shadow-sm">
      <div class="form-check text-white">
        <input class="form-check-input" type="checkbox" id="selectAllPhotos" />
        <label class="form-check-label user-select-none" for="selectAllPhotos">
          Избери всички
        </label>
      </div>
      <div class="btn-group shadow-sm">
        <button data-action="photos-approve-selected" class="btn btn-success btn-sm px-3"><i class="bi bi-check2-square me-2"></i>Одобри</button>
        <button data-action="photos-reject-selected" class="btn btn-outline-danger btn-sm px-3"><i class="bi bi-x-square me-2"></i>Отхвърли</button>
      </div>
    </div>
    
    <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-4 px-2">
      ${photos
        .map(
          (photo) => `
            <div class="col position-relative photo-card-wrapper">
              <label class="card bg-dark border-secondary h-100 text-white cursor-pointer overflow-hidden shadow-sm" for="photo-${photo.id}" style="cursor: pointer;">
                <div class="position-absolute top-0 start-0 p-2 z-1">
                  <div class="form-check">
                    <input class="form-check-input border-secondary shadow photo-checkbox" id="photo-${photo.id}" type="checkbox" value="${photo.id}" data-photo-checkbox />
                  </div>
                </div>
                
                <div class="ratio ratio-1x1 bg-black">
                  <img src="${photo.photo_url}" alt="Снимка" loading="lazy" class="object-fit-cover w-100 h-100 opacity-75 transition-opacity" style="transition: opacity 0.2s;" onmouseover="this.classList.remove('opacity-75')" onmouseout="if(!document.getElementById('photo-${photo.id}').checked) this.classList.add('opacity-75');" id="img-${photo.id}" />
                </div>
                
                <div class="card-footer py-2 px-3 border-top border-secondary bg-dark" style="font-size: 0.75rem;">
                  <div class="text-truncate text-white-50 mb-1" title="${photo.user_id}"><i class="bi bi-person me-1"></i>${photo.user_id.substring(0,8)}...</div>
                  <div class="text-muted"><i class="bi bi-clock me-1"></i>${photo.uploaded_at ? new Date(photo.uploaded_at).toLocaleDateString('bg-BG') : '—'}</div>
                </div>
              </label>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  // Добавяне на логика за маркиране
  setTimeout(() => {
    const mainCheckbox = container.querySelector('#selectAllPhotos');
    const photoCheckboxes = container.querySelectorAll('.photo-checkbox');

    if (mainCheckbox) {
      mainCheckbox.addEventListener('change', (e) => {
        photoCheckboxes.forEach(cb => {
          cb.checked = e.target.checked;
          const img = container.querySelector('#img-' + cb.value);
          if (e.target.checked) img?.classList.remove('opacity-75');
          else img?.classList.add('opacity-75');
          
          if(e.target.checked) selectedPhotos.add(cb.value);
          else selectedPhotos.delete(cb.value);
        });
      });
    }

    photoCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const img = container.querySelector('#img-' + e.target.value);
        if (e.target.checked) img?.classList.remove('opacity-75');
        else img?.classList.add('opacity-75');

        if (e.target.checked) {
            selectedPhotos.add(e.target.value);
        } else {
            selectedPhotos.delete(e.target.value);
            if(mainCheckbox) mainCheckbox.checked = false;
        }
      });
    });
  }, 50);
}

function renderAuditLog(container, entries) {
  if (!entries.length) {
    container.innerHTML = '<div class="list-group-item bg-transparent text-muted py-4 text-center border-bottom border-secondary border-opacity-25">Няма записани админ действия.</div>';
    return;
  }
  container.innerHTML = entries
    .map(
      (item) => `
        <div class="list-group-item bg-transparent text-white border-bottom border-secondary border-opacity-25 py-3">
          <div class="d-flex w-100 justify-content-between mb-1">
            <strong class="text-success"><i class="bi bi-check-circle-fill me-1"></i>${item.action.replace(/_/g, ' ')}</strong>
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${new Date(item.created_at).toLocaleString('bg-BG', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit' })}</small>
          </div>
          <p class="mb-1 small font-monospace text-secondary">User: ${item.target_user_id || '—'}</p>
          <p class="mb-0 small font-monospace text-secondary">Photo: ${item.target_photo_id || '—'}</p>
        </div>
      `
    )
    .join('');
}

function renderProfileHistory(container, entries) {
  if (!entries.length) {
    container.innerHTML = '<div class="list-group-item bg-transparent text-muted py-4 text-center border-bottom border-secondary border-opacity-25">Няма история на профилни промени.</div>';
    return;
  }
  container.innerHTML = entries
    .map((item) => {
      const oldName = item.old_data?.username || '—';
      const newName = item.new_data?.username || '—';
      return `
        <div class="list-group-item bg-transparent text-white border-bottom border-secondary border-opacity-25 py-3">
          <div class="d-flex w-100 justify-content-between mb-2">
            <span class="text-info fw-bold"><i class="bi bi-person-fill-gear me-1"></i>Модификация</span>
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${new Date(item.changed_at).toLocaleString('bg-BG', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit' })}</small>
          </div>
          <p class="mb-1 small text-white-50"><span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary text-decoration-line-through me-2">${oldName}</span> <i class="bi bi-arrow-right text-muted mx-1"></i> <span class="badge bg-info bg-opacity-25 text-info border border-info ms-2">${newName}</span></p>
          <p class="mb-0 small text-muted font-monospace mt-2 text-truncate" style="max-width: 100%;" title="${item.user_id}">User: ${item.user_id}</p>
        </div>
      `;
    })
    .join('');
}

function renderNotifications(container, entries) {
  if (!entries.length) {
    container.innerHTML = '<div class="list-group-item bg-transparent text-muted py-4 text-center border-bottom border-secondary border-opacity-25">Няма нови известия.</div>';
    return;
  }
  container.innerHTML = entries
    .map(
      (item) => `
        <div class="list-group-item bg-transparent text-white border-bottom border-secondary border-opacity-25 py-3">
          <div class="d-flex w-100 justify-content-between mb-1">
            <strong class="text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i>${item.type.replace(/_/g, ' ')}</strong>
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${new Date(item.created_at).toLocaleString('bg-BG', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit' })}</small>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-2">
             <div style="font-size: 0.75rem;" class="text-muted font-monospace text-truncate w-75">
                <div class="text-truncate" title="${item.target_user_id || ''}">U: ${item.target_user_id || '—'}</div>
                <div class="text-truncate" title="${item.target_photo_id || ''}">P: ${item.target_photo_id || '—'}</div>
             </div>
             <span class="badge ${item.status === 'error' ? 'bg-danger' : 'bg-primary'} bg-opacity-25 text-${item.status === 'error' ? 'danger' : 'primary'} border border-${item.status === 'error' ? 'danger' : 'primary'} border-opacity-50 px-2 py-1">${item.status}</span>
          </div>
        </div>
      `
    )
    .join('');
}

async function loadAdminData(container) {
  const statsBox = container.querySelector('[data-admin-stats]');
  const usersBox = container.querySelector('[data-users-list]');
  const allUsersBox = container.querySelector('[data-all-users-list]');
  const photosBox = container.querySelector('[data-photos-list]');
  const auditBox = container.querySelector('[data-audit-log]');
  const historyBox = container.querySelector('[data-profile-history]');
  const notificationsBox = container.querySelector('[data-admin-notifications]');

  try {
    const [stats, users, allUsers, photos, audit, history, notifications] = await Promise.all([
      fetchAdminStats(),
      fetchPendingProfiles(),
      fetchAllUsers(),
      fetchPendingPhotos(),
      fetchAuditLog(),
      fetchProfileHistory(),
      fetchNotifications()
    ]);

    renderStats(statsBox, stats);
    renderUsers(usersBox, users);
    if (allUsersBox) renderAllUsers(allUsersBox, allUsers);
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

    if (!['user-review', 'user-approve', 'user-reject', 'user-delete-full'].includes(action)) return;

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
      if (action === 'user-delete-full') {
        if (!confirm('СИГУРНИ ЛИ СТЕ? Това ще изтрие потребителя и всички негови данни (снимки, задачи, профил). Това действие е необратимо!')) {
          return;
        }
        const btn = actionTrigger;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Изтриване...';
        btn.disabled = true;
        try {
          await deleteUserAndData(userId);
          toast.success('Потребителят беше изтрит успешно!', { title: 'Успешно' });
        } catch (err) {
          btn.innerHTML = originalText;
          btn.disabled = false;
          console.error('Delete User UI Component Error:', err);
          alert('Внимание! Изтриването не успя: ' + (err.message || 'Неизвестна грешка'));
          throw err;
        }
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
    if (!['photos-approve-selected', 'photos-reject-selected'].includes(action)) return;

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
