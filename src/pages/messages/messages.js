import './messages.css';
import messagesTemplate from './messages.html?raw';
import { getAuthUser } from '../../services/authState.js';
import { supabase } from '../../services/supabaseClient.js';
import { fetchConversations, fetchMessagesWith, sendMessage, markAsRead, subscribeToMessages } from '../../services/messageService.js';
import { fetchProfilesByIds, formatLastSeen } from '../../services/profileService.js';
import { router } from '../../router/router.js';
import toast from '../../components/toast/toast.js';

export function renderMessagesPage() {
  const container = document.createElement('div');
  container.className = 'w-100 h-100';
  container.innerHTML = messagesTemplate;

  const currentUser = getAuthUser();
  if (!currentUser) {
    router.navigate('/login');
    return container;
  }

  // Basic DOM elements
  const layout = container.querySelector('.messages-layout');
  const conversationsList = container.querySelector('#conversationsList');
  const emptyState = container.querySelector('#emptyChatState');
  const chatHeader = container.querySelector('#chatHeader');
  const messagesFlow = container.querySelector('#messagesFlow');
  const chatInputArea = container.querySelector('#chatInputArea');
  const msgForm = container.querySelector('#sendMessageForm');
  const msgInput = container.querySelector('#messageInput');
  const backBtn = container.querySelector('#backToContactsBtn');
  const searchInput = container.querySelector('#contactSearch');

  let activeContactId = null;
  let activeContactProfile = null;
  let conversations = []; // State
  let messageSub = null;

  // URL param to open a specific chat if routed like /messages?userId=123
  const urlParams = new URLSearchParams(window.location.search);
  const initialContactId = urlParams.get('userId');

  // Initialization
  init();

  async function init() {
    try {
      await loadConversations();
      
      // Auto open if passed
      if (initialContactId) {
        if (!conversations.find(c => c.contact_id === initialContactId)) {
          // It's a new conversation, we need to artificially inject the contact
          const [profile] = await fetchProfilesByIds([initialContactId]);
          if (profile) {
            conversations.unshift({
              contact_id: initialContactId,
              profile,
              last_message_content: 'Започнете чат',
              last_message_at: new Date().toISOString(),
              unread_count: 0
            });
          }
        }
        openChat(initialContactId);
      }
      
      renderConversations();

      // Realtime subscription
      messageSub = subscribeToMessages((newMsg) => {
        handleRealtimeMessage(newMsg);
      });

    } catch (err) {
      console.error(err);
      toast.error('Грешка при зареждане на чатовете');
    }
  }

  // Load conversations and their profiles
  async function loadConversations() {
    const data = await fetchConversations();
    const contactIds = data.map(c => c.contact_id);
    
    // Fallback if no conversations
    if (!contactIds.length) {
      conversations = [];
      conversationsList.innerHTML = '<div class="p-4 text-center text-muted small">Нямате активни чатове.</div>';
      return;
    }

    const profiles = await fetchProfilesByIds(contactIds);
    const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

    conversations = data.map(c => ({
      ...c,
      profile: profileMap[c.contact_id] || { username: 'Неизвестен', id: c.contact_id }
    }));
  }

  // Render left sidebar
  function renderConversations(filterTxt = '') {
    if (!conversations.length) return; // empty state already handled
    
    const filtered = conversations.filter(c => 
      c.profile.username.toLowerCase().includes(filterTxt.toLowerCase())
    );

    if (!filtered.length) {
      conversationsList.innerHTML = '<div class="p-4 text-center text-muted small">Няма намерени.</div>';
      return;
    }

    conversationsList.innerHTML = filtered.map(c => {
      const p = c.profile;
      const avatar = p.avatar_url || 'https://placehold.co/100x100/182436/8eb7f1?text=U';
      const unreadBadge = c.unread_count > 0 ? `<span class="badge bg-danger rounded-pill">${c.unread_count}</span>` : '';
      const isActive = c.contact_id === activeContactId ? 'active' : '';
      
      const timeStr = c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('bg-BG', {hour: '2-digit', minute:'2-digit'}) : '';

      return `
        <div class="contact-item p-3 border-bottom border-secondary border-opacity-25 d-flex align-items-center ${isActive}" data-contact-id="${c.contact_id}">
          <img src="${avatar}" alt="user" class="rounded-circle object-fit-cover me-3" style="width: 48px; height: 48px;">
          <div class="flex-grow-1 overflow-hidden">
             <div class="d-flex justify-content-between align-items-center mb-1">
               <h6 class="mb-0 text-white text-truncate">${p.username}</h6>
               <small class="text-muted" style="font-size: 0.7rem;">${timeStr}</small>
             </div>
             <div class="d-flex justify-content-between align-items-center">
               <p class="mb-0 text-muted small text-truncate pe-2" style="max-width: 180px;">${c.last_message_content || ''}</p>
               ${unreadBadge}
             </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Handle clicking a contact
  conversationsList.addEventListener('click', (e) => {
    const item = e.target.closest('.contact-item');
    if (item) {
      const contactId = item.dataset.contactId;
      openChat(contactId);
    }
  });

  // Open Chat logic
  async function openChat(contactId) {
    if (activeContactId === contactId) return;
    
    activeContactId = contactId;
    const convoObj = conversations.find(c => c.contact_id === contactId);
    if (!convoObj) return;

    activeContactProfile = convoObj.profile;

    // Mobile slide-in
    layout.classList.add('chat-active');
    
    // Update headers
    emptyState.classList.add('d-none');
    chatHeader.classList.remove('d-none');
    messagesFlow.classList.remove('d-none');
    chatInputArea.classList.remove('d-none');

    const avatarObj = container.querySelector('#chatAvatar');
    avatarObj.src = activeContactProfile.avatar_url || 'https://placehold.co/100x100/182436/8eb7f1?text=U';
    container.querySelector('#chatUsername').textContent = activeContactProfile.username;
    container.querySelector('#chatStatus').textContent = activeContactProfile.is_online ? 'Онлайн' : formatLastSeen(activeContactProfile.last_seen_at);

    // Profile link
    container.querySelector('#chatProfileLink').onclick = () => router.navigate(`/profile/${contactId}`);

    // Update read status
    if (convoObj.unread_count > 0) {
      convoObj.unread_count = 0;
      renderConversations();
      await markAsRead(contactId);
    }

    // Highlighting
    renderConversations(searchInput.value);

    // Load Messages
    messagesFlow.innerHTML = '<div class="text-center w-100 p-4"><div class="spinner-border spinner-border-sm text-primary"></div></div>';
    
    try {
      const msgs = await fetchMessagesWith(contactId);
      renderMessagesFlow(msgs);
    } catch(err) {
      console.error(err);
      messagesFlow.innerHTML = '<div class="text-center text-danger w-100 p-4">Грешка при зареждане.</div>';
    }
  }

  function renderMessagesFlow(msgs) {
    if (!msgs.length) {
      messagesFlow.innerHTML = '<div class="text-center text-muted w-100 p-4 mt-5"><i class="bi bi-chat-square-text fs-1 mb-2 d-block"></i> Напиши първото съобщение!</div>';
      return;
    }

    let html = '';
    let lastDate = null;

    msgs.forEach(m => {
      const isMine = m.sender_id === currentUser.id;
      const d = new Date(m.created_at);
      const dateStr = d.toLocaleDateString('bg-BG');
      const timeStr = d.toLocaleTimeString('bg-BG', {hour: '2-digit', minute:'2-digit'});

      // Date separator
      if (dateStr !== lastDate) {
        html += `<div class="d-flex justify-content-center my-3"><span class="badge bg-secondary bg-opacity-25 text-muted">${dateStr}</span></div>`;
        lastDate = dateStr;
      }

      html += `
        <div class="d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}">
          <div class="message-bubble px-3 py-2 ${isMine ? 'message-sent shadow-sm' : 'message-received shadow-sm border border-secondary border-opacity-25'}">
            ${escapeHtml(m.content)}
            <div class="text-end mt-1" style="font-size: 0.65rem; opacity: 0.7;">
              ${timeStr} ${isMine ? (m.read_at ? '<i class="bi bi-check-all text-info ms-1"></i>' : '<i class="bi bi-check ms-1"></i>') : ''}
            </div>
          </div>
        </div>
      `;
    });

    messagesFlow.innerHTML = html;
    scrollToBottom();
  }

  // Handle incoming real-time msg
  function handleRealtimeMessage(newMsg) {
    const isMine = newMsg.sender_id === currentUser.id;
    const relatedContactId = isMine ? newMsg.receiver_id : newMsg.sender_id;

    // 1. Update conversations list
    let convo = conversations.find(c => c.contact_id === relatedContactId);
    
    // If it's a new conversation from someone else
    if (!convo && !isMine) {
      // Need fetching profile async, for now basic outline
      fetchProfilesByIds([relatedContactId]).then(([p]) => {
        if (p) {
          conversations.unshift({
            contact_id: relatedContactId,
            profile: p,
            last_message_content: newMsg.content,
            last_message_at: newMsg.created_at,
            unread_count: 1
          });
          renderConversations(searchInput.value);
        }
      });
    } else if (convo) {
      convo.last_message_content = newMsg.content;
      convo.last_message_at = newMsg.created_at;
      if (!isMine && activeContactId !== relatedContactId) {
        convo.unread_count = (convo.unread_count || 0) + 1;
      }
      
      // Move to top
      conversations = [convo, ...conversations.filter(c => c.contact_id !== relatedContactId)];
      renderConversations(searchInput.value);
    }

    // 2. Update active chat flow
    if (activeContactId === relatedContactId) {
      if (!isMine) {
        markAsRead(activeContactId); // tell backend
      }

      // Remove empty state if present
      const emptyIndicator = messagesFlow.querySelector('.bi-chat-square-text');
      if (emptyIndicator) messagesFlow.innerHTML = '';

      const d = new Date(newMsg.created_at);
      const timeStr = d.toLocaleTimeString('bg-BG', {hour: '2-digit', minute:'2-digit'});

      const msgHtml = `
        <div class="d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}">
          <div class="message-bubble px-3 py-2 ${isMine ? 'message-sent shadow-sm' : 'message-received shadow-sm border border-secondary border-opacity-25'}">
            ${escapeHtml(newMsg.content)}
            <div class="text-end mt-1" style="font-size: 0.65rem; opacity: 0.7;">
              ${timeStr} ${isMine ? '<i class="bi bi-check ms-1"></i>' : ''}
            </div>
          </div>
        </div>
      `;
      messagesFlow.insertAdjacentHTML('beforeend', msgHtml);
      scrollToBottom();
    } else if (!isMine) {
      // Toast notification for incoming msg when in another chat
      if(convo?.profile?.username) {
        toast.info(`Ново съобщение от ${convo.profile.username}`, { duration: 3000 });
      }
    }
  }

  // Send message
  msgForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeContactId) return;

    const text = msgInput.value.trim();
    if (!text) return;

    msgInput.value = '';
    msgInput.style.height = 'auto'; // reset textarea
    
    try {
      // Opt: optimistic UI update could go here
      await sendMessage(activeContactId, text);
      // Actual UI update happens via Realtime handleRealtimeMessage which triggers since we sent it
    } catch (err) {
      toast.error('Неуспешно изпращане', { title: 'Грешка' });
      msgInput.value = text; // restore
    }
  });

  // Textarea auto-resize
  msgInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });
  
  // Enter to send (Shift+Enter for newline)
  msgInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      msgForm.dispatchEvent(new Event('submit'));
    }
  });

  // Search filter
  searchInput.addEventListener('input', (e) => {
    renderConversations(e.target.value);
  });

  // Context: Mobile back to contacts list
  backBtn.addEventListener('click', () => {
    layout.classList.remove('chat-active');
  });

  function scrollToBottom() {
    messagesFlow.scrollTo({
      top: messagesFlow.scrollHeight,
      behavior: 'smooth'
    });
  }

  function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  // Cleanup on unmount
  container.addEventListener('DOMNodeRemoved', () => {
    if (messageSub) supabase.removeChannel(messageSub);
  });

  return container;
}
