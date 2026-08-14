/***********************
 * CONFIGURA AQUÍ tu Firebase
 ***********************/
const firebaseConfig = {
  apiKey: "AIzaSyBkpcGEZ31B59cS_2HmVPWwBFNGrTq8EdY",
  authDomain: "pruebacards-aa8b8.firebaseapp.com",
  projectId: "pruebacards-aa8b8",
  storageBucket: "pruebacards-aa8b8.appspot.com",
  messagingSenderId: "919397052566",
  appId: "1:919397052566:web:3e8722f2256bc365c6d2b7",
  measurementId: "G-YYRL2WEE67"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

/***********************
 * Referencias Globales
 ***********************/
const loginOverlay = document.getElementById('loginOverlay');
const appContainer = document.getElementById('appContainer');
const userNameDisplay = document.getElementById('userNameDisplay');
const loginBtn = document.getElementById('loginBtn');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const tabPrivate = document.getElementById('tabPrivate');
const tabPublic = document.getElementById('tabPublic');

const boardEl = document.getElementById('board');
const skeletonEl = document.getElementById('skeletonLoader');
const emptyMsg = document.getElementById('emptyMsg');
const addCardBtn = document.getElementById('addCardBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const searchInput = document.getElementById('searchInput');
const viewToggleBtn = document.getElementById('viewToggleBtn');

let currentView = 'private'; 
let currentUser = null;
let currentUsername = ''; // Guardará "hector"
let unsubscribeSnapshot = null;
const colorsArray = ['default', 'red', 'blue', 'green', 'yellow'];

// Utilidades
function debounce(fn, wait = 1500) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
function escapeHtml(str) { return (str||'').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function linkify(text) { const escaped = escapeHtml(text); return escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" contenteditable="false" style="color: var(--accent); text-decoration: underline;">$1</a>'); }

/***********************
 * Navegación y Filtros
 ***********************/
if (tabPrivate && tabPublic) {
  tabPrivate.addEventListener('click', () => {
    if(currentView === 'private') return;
    currentView = 'private'; tabPrivate.classList.add('active'); tabPublic.classList.remove('active');
    if(searchInput) searchInput.value = ''; // Limpiar búsqueda al cambiar
    startRealtime();
  });

  tabPublic.addEventListener('click', () => {
    if(currentView === 'public') return;
    currentView = 'public'; tabPublic.classList.add('active'); tabPrivate.classList.remove('active');
    if(searchInput) searchInput.value = '';
    startRealtime();
  });
}

// Búsqueda en tiempo real
function applySearchFilter() {
  if (!searchInput) return;
  const term = searchInput.value.toLowerCase();
  document.querySelectorAll('.card:not(.skeleton-card)').forEach(card => {
    if (!term) { card.style.display = ''; } 
    else { const text = card.innerText.toLowerCase(); card.style.display = text.includes(term) ? '' : 'none'; }
  });
}
if (searchInput) searchInput.addEventListener('input', applySearchFilter);

// Cambio de Vista (Cuadrícula/Lista)
let isListView = localStorage.getItem('listView') === 'true';
if (isListView && boardEl) boardEl.classList.add('list-view');
if (viewToggleBtn) {
  viewToggleBtn.addEventListener('click', () => {
    isListView = !isListView;
    boardEl.classList.toggle('list-view', isListView);
    localStorage.setItem('listView', isListView);
  });
}

/***********************
 * Autenticación Segura
 ***********************/
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    currentUsername = user.email.split('@')[0];
    if(loginOverlay) loginOverlay.style.display = 'none';
    if(appContainer) appContainer.style.display = 'block';
    if(userNameDisplay) userNameDisplay.textContent = `(@${currentUsername})`;
    startRealtime();
  } else {
    currentUser = null; currentUsername = '';
    if(loginOverlay) loginOverlay.style.display = 'flex';
    if(appContainer) appContainer.style.display = 'none';
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  }
});

async function handleLogin() {
  const userVal = loginUser.value.trim(); const passVal = loginPass.value;
  if (!userVal || !passVal) { loginError.textContent = 'Ingresa usuario y contraseña.'; return; }
  loginBtn.textContent = 'Conectando...';
  try {
    await auth.signInWithEmailAndPassword(`${userVal}@panelvivo.com`, passVal);
    loginError.textContent = '';
  } catch (error) { loginError.textContent = 'Credenciales incorrectas.'; } 
  finally { loginBtn.textContent = 'Ingresar al Panel'; }
}

if (loginBtn) loginBtn.addEventListener('click', handleLogin);
if (loginPass) loginPass.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleLogin(); });
if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut());

/***********************
 * Preferencias de Interfaz
 ***********************/
const themeToggleBtn = document.getElementById('themeToggleBtn');
let isDark = localStorage.getItem('theme') === 'dark';
if (isDark) { document.documentElement.setAttribute('data-theme', 'dark'); if(themeToggleBtn) themeToggleBtn.textContent = '☀️'; }

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    isDark = !isDark; document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
  });
}

const autoDeleteBtn = document.getElementById('autoDeleteBtn');
let isAutoDelete = localStorage.getItem('autoDelete') === 'true';
if (autoDeleteBtn) {
  autoDeleteBtn.textContent = isAutoDelete ? '⏳ Limpieza: ON' : '⏳ Limpieza: OFF';
  autoDeleteBtn.style.color = isAutoDelete ? 'var(--success)' : 'inherit';
  autoDeleteBtn.addEventListener('click', () => {
    isAutoDelete = !isAutoDelete; localStorage.setItem('autoDelete', isAutoDelete);
    autoDeleteBtn.textContent = isAutoDelete ? '⏳ Limpieza: ON' : '⏳ Limpieza: OFF';
    autoDeleteBtn.style.color = isAutoDelete ? 'var(--success)' : 'inherit';
    startRealtime(); // Re-renderizar para mostrar/ocultar contadores
  });
}

/***********************
 * Sincronización Realtime Principal
 ***********************/
function startRealtime() {
  if (!currentUser) return;
  boardEl.innerHTML = ''; skeletonEl.style.display = 'flex'; boardEl.style.display = 'none'; emptyMsg.style.display = 'none';
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  let query = db.collection('cards');
  if (currentView === 'private') { query = query.where('userId', '==', currentUser.uid).where('visibility', '==', 'private'); } 
  else { query = query.where('visibility', '==', 'public'); }

  unsubscribeSnapshot = query.onSnapshot(snapshot => {
    skeletonEl.style.display = 'none'; boardEl.style.display = 'flex';
    let docs = snapshot.docs.sort((a, b) => (a.data().position || 0) - (b.data().position || 0));
    
    // Proceso de Auto-Limpieza (Backstage)
    if (isAutoDelete) {
      const now = Date.now();
      docs.forEach(doc => {
         const dt = doc.data().updatedAt;
         if (dt && !doc.data().isLocked) {
           const timeDiff = now - (dt.seconds * 1000);
           if (timeDiff > 24 * 60 * 60 * 1000) db.collection('cards').doc(doc.id).delete();
         }
      });
    }

    if (docs.length === 0) { boardEl.innerHTML = ''; emptyMsg.style.display = 'block'; return; } 
    else emptyMsg.style.display = 'none';

    const pinnedDocs = []; const unpinnedDocs = [];
    docs.forEach(doc => { if (doc.data().isPinned) pinnedDocs.push(doc); else unpinnedDocs.push(doc); });
    const sortedDocs = [...pinnedDocs, ...unpinnedDocs];

    const existingMap = {};
    Array.from(boardEl.querySelectorAll('.card')).forEach(node => { existingMap[node.dataset.id] = node; });
    const fragment = document.createDocumentFragment();

    sortedDocs.forEach((doc, idx) => {
      const id = doc.id; const data = doc.data();

      if (existingMap[id]) {
        const node = existingMap[id];
        const numEl = node.querySelector('.card-number'); if (numEl) numEl.textContent = `#${idx + 1}`;
        const footerTime = node.querySelector('.updated-at');
        const expireBadge = node.querySelector('.expire-badge');
        
        // Calcular tiempo y expiración visual
        if (footerTime && data.updatedAt) { 
          const dt = new Date(data.updatedAt.seconds * 1000); 
          footerTime.innerText = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`; 
          
          if (isAutoDelete && !data.isLocked && expireBadge) {
             const hoursLeft = 24 - ((Date.now() - dt.getTime()) / (1000 * 60 * 60));
             if (hoursLeft > 0) { expireBadge.textContent = `⏳ ${Math.ceil(hoursLeft)}h`; expireBadge.style.display = 'block'; }
          } else if (expireBadge) { expireBadge.style.display = 'none'; }
        }

        // Actualizar Autor en tiempo real
        const authorBadge = node.querySelector('.author-badge');
        if (authorBadge) {
           if (currentView === 'public' && data.authorName) { authorBadge.textContent = `@${data.authorName}`; authorBadge.style.display = 'inline-block'; }
           else { authorBadge.style.display = 'none'; }
        }

        node.dataset.color = data.color || 'default';
        data.isCodeMode ? node.classList.add('code-mode') : node.classList.remove('code-mode');
        data.isPinned ? node.classList.add('is-pinned') : node.classList.remove('is-pinned');
        data.isLocked ? node.classList.add('locked') : node.classList.remove('locked');
        
        const lockBtn = node.querySelector('.btn-lock'); if (lockBtn) lockBtn.textContent = data.isLocked ? '🔒' : '🔓';
        node.draggable = !data.isLocked;
        
        const titleEl = node.querySelector('.card-title'); const mainEl = node.querySelector('.card-content'); const extraEl = node.querySelector('.card-extra');
        if (titleEl) titleEl.contentEditable = !data.isLocked;
        if (mainEl) mainEl.contentEditable = !data.isLocked;
        if (extraEl) extraEl.contentEditable = !data.isLocked;

        if (node.dataset.uploading !== "true") {
          const btnUpload = node.querySelector('.btn-upload'); const fileLinkContainer = node.querySelector('.file-link-container');
          if (data.fileUrl) {
            if (btnUpload) btnUpload.style.display = 'none';
            if (fileLinkContainer && !fileLinkContainer.innerHTML.includes(data.fileUrl)) fileLinkContainer.innerHTML = `<a href="${data.fileUrl}" download="${data.fileName || 'archivo'}" class="btn-download">⬇️ Descargar ${data.fileName || ''}</a>`;
          } else {
            if (btnUpload) btnUpload.style.display = 'block';
            if (fileLinkContainer) fileLinkContainer.innerHTML = '';
          }
        }

        if (document.activeElement !== titleEl && titleEl.innerText !== (data.title || '')) titleEl.textContent = data.title || '';
        if (document.activeElement !== mainEl && mainEl.innerText !== (data.text || '')) mainEl.innerHTML = linkify(data.text);
        if (document.activeElement !== extraEl && extraEl.innerText !== (data.extra || '')) extraEl.innerHTML = linkify(data.extra);

        fragment.appendChild(node);
      } else {
        fragment.appendChild(createCardNode(doc, idx + 1));
      }
    });

    if (window.draggingNode && window.dragPlaceholder.parentNode) boardEl.insertBefore(window.dragPlaceholder, window.dragPlaceholder.nextSibling);
    boardEl.innerHTML = ''; boardEl.appendChild(fragment);
    
    // Aplicar filtro de búsqueda al re-renderizar
    applySearchFilter();
  });
}

/***********************
 * Creador de Tarjetas
 ***********************/
function createCardNode(cardDoc, indexForNumbering) {
  const data = cardDoc.data();
  const id = cardDoc.id;

  const el = document.createElement('div');
  el.className = 'card'; el.draggable = !data.isLocked; el.dataset.id = id; el.dataset.uploading = "false";
  
  if (data.color && data.color !== 'default') el.dataset.color = data.color;
  if (data.isCodeMode) el.classList.add('code-mode');
  if (data.isPinned) el.classList.add('is-pinned');
  if (data.isLocked) el.classList.add('locked');

  el.innerHTML = `
    <div class="card-header">
      <div class="card-left">
        <div class="card-number">#${indexForNumbering}</div>
        <div class="pin-icon">📌</div>
        <div class="card-title" contenteditable="${!data.isLocked}" spellcheck="false" data-placeholder="Título..."></div>
      </div>
      <div class="card-actions">
        <button class="small-icon-btn btn-pin hide-on-lock" title="Fijar al principio">📌</button>
        <button class="small-icon-btn btn-color hide-on-lock" title="Cambiar Color">🎨</button>
        <button class="small-icon-btn btn-code hide-on-lock" title="Modo Código">&lt;/&gt;</button>
        <button class="small-icon-btn btn-share hide-on-lock" title="Compartir">📤</button>
        <button class="small-icon-btn btn-copy" title="Copiar Todo">📋</button>
        <button class="small-icon-btn btn-lock" title="Bloquear edición">${data.isLocked ? '🔒' : '🔓'}</button>
        <button class="small-icon-btn btn-delete hide-on-lock" title="Borrar">✖</button>
      </div>
    </div>
    <div class="card-content" contenteditable="${!data.isLocked}" spellcheck="false" data-placeholder="📝 Escribe algo o pega enlaces..."></div>
    <div class="card-extra" contenteditable="${!data.isLocked}" spellcheck="false" data-placeholder="Notas extra..."></div>
    <div class="card-attachment hide-on-lock">
      <input type="file" class="file-input" style="display:none;" />
      <button class="small-btn btn-upload" style="width: 100%;">📎 Subir archivo (Max 50MB)</button>
      <div class="progress-container">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="progress-text">0%</div>
      </div>
    </div>
    <div class="file-link-container" style="padding:0 4px;"></div>
    <div class="card-footer">
      <div style="display:flex; align-items:center;">
        <span class="muted updated-at">--</span>
        <span class="author-badge" style="display: ${currentView === 'public' && data.authorName ? 'inline-block' : 'none'};">@${data.authorName || ''}</span>
      </div>
      <div class="expire-badge" style="display:none;"></div>
      <div class="status-badge"></div>
    </div>
  `;

  const titleEl = el.querySelector('.card-title'); const mainEl = el.querySelector('.card-content'); const extraEl = el.querySelector('.card-extra');
  const updatedAtEl = el.querySelector('.updated-at'); const statusBadge = el.querySelector('.status-badge'); const expireBadge = el.querySelector('.expire-badge');
  const fileLinkContainer = el.querySelector('.file-link-container'); const btnUpload = el.querySelector('.btn-upload');

  const setStatus = (state) => {
     if (state === 'saving') { statusBadge.textContent = '⏳ Guardando...'; statusBadge.style.color = 'var(--warning)'; } 
     else if (state === 'saved') { statusBadge.textContent = '✅ Guardado'; statusBadge.style.color = 'var(--success)'; setTimeout(() => { if(statusBadge.textContent === '✅ Guardado') statusBadge.textContent = ''; }, 2000); }
  };

  titleEl.textContent = data.title || ''; mainEl.innerHTML = linkify(data.text); extraEl.innerHTML = linkify(data.extra);
  
  if (data.updatedAt) {
    const dt = new Date(data.updatedAt.seconds * 1000);
    updatedAtEl.textContent = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
    
    if (isAutoDelete && !data.isLocked) {
       const hoursLeft = 24 - ((Date.now() - dt.getTime()) / (1000 * 60 * 60));
       if (hoursLeft > 0) { expireBadge.textContent = `⏳ ${Math.ceil(hoursLeft)}h`; expireBadge.style.display = 'block'; }
    }
  }

  if (data.fileUrl) {
    if(btnUpload) btnUpload.style.display = 'none';
    fileLinkContainer.innerHTML = `<a href="${data.fileUrl}" download="${data.fileName || 'archivo'}" class="btn-download">⬇️ Descargar ${data.fileName || ''}</a>`;
  }

  /***** Listeners de la Tarjeta *****/
  el.querySelector('.btn-pin').addEventListener('click', async (ev) => { ev.stopPropagation(); await db.collection('cards').doc(id).update({ isPinned: !el.classList.contains('is-pinned') }); });
  el.querySelector('.btn-color').addEventListener('click', async (ev) => {
    ev.stopPropagation(); const currentColor = el.dataset.color || 'default'; let nextIndex = (colorsArray.indexOf(currentColor) + 1) % colorsArray.length;
    await db.collection('cards').doc(id).update({ color: colorsArray[nextIndex] });
  });
  el.querySelector('.btn-code').addEventListener('click', async (ev) => { ev.stopPropagation(); await db.collection('cards').doc(id).update({ isCodeMode: !el.classList.contains('code-mode') }); });
  el.querySelector('.btn-lock').addEventListener('click', async (ev) => { ev.stopPropagation(); await db.collection('cards').doc(id).update({ isLocked: !el.classList.contains('locked') }); });
  
  el.querySelector('.btn-copy').addEventListener('click', (ev) => {
    ev.stopPropagation(); navigator.clipboard.writeText(`${titleEl.innerText}\n\n${mainEl.innerText}\n\n${extraEl.innerText}`.trim());
    const btn = ev.target; btn.textContent = '✅'; setTimeout(() => btn.textContent = '📋', 1500);
  });

  // NUEVO: API Share Nativo
  el.querySelector('.btn-share').addEventListener('click', async (ev) => {
    ev.stopPropagation();
    const content = `${titleEl.innerText}\n\n${mainEl.innerText}\n\n${extraEl.innerText}`.trim();
    if (navigator.share) {
      try { await navigator.share({ title: titleEl.innerText || 'Panel Vivo', text: content }); } 
      catch (err) { console.log('Compartir cancelado'); }
    } else { alert('Tu navegador no soporta la función de compartir nativa.'); }
  });

  el.querySelector('.btn-delete').addEventListener('click', async (ev) => { ev.stopPropagation(); if (!confirm('¿Eliminar tarjeta?')) return; await db.collection('cards').doc(id).delete(); });

  // NUEVO: Al guardar, actualizamos también el 'authorName' para saber quién fue el último.
  const saveTitle = debounce(async (val) => { await db.collection('cards').doc(id).update({title: val, authorName: currentUsername, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); setStatus('saved'); });
  const saveMain = debounce(async (val) => { await db.collection('cards').doc(id).update({text: val, authorName: currentUsername, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); setStatus('saved'); });
  const saveExtra = debounce(async (val) => { await db.collection('cards').doc(id).update({extra: val, authorName: currentUsername, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); setStatus('saved'); });

  titleEl.addEventListener('input', (e) => { setStatus('saving'); saveTitle(e.target.innerText.trim()); });
  mainEl.addEventListener('input', (e) => { setStatus('saving'); saveMain(e.target.innerText); });
  extraEl.addEventListener('input', (e) => { setStatus('saving'); saveExtra(e.target.innerText); });
  [titleEl, mainEl, extraEl].forEach(node => {
    node.addEventListener('mousedown', (e) => e.stopPropagation());
    // Apaga el Drag & Drop al tocar el texto para permitir seleccionarlo
    node.addEventListener('mouseenter', () => el.draggable = false);
    // Enciende el Drag & Drop al salir del texto (si la tarjeta no está bloqueada)
    node.addEventListener('mouseleave', () => el.draggable = !el.classList.contains('locked'));
  });

  /***** Subida de Archivos *****/
  const fileInput = el.querySelector('.file-input'); const progressContainer = el.querySelector('.progress-container'); const progressFill = el.querySelector('.progress-fill'); const progressText = el.querySelector('.progress-text');
  if(btnUpload) btnUpload.addEventListener('click', (ev) => { ev.stopPropagation(); fileInput.click(); });

  fileInput.addEventListener('change', (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert("Límite de 50MB excedido."); return; }

    el.dataset.uploading = "true"; btnUpload.style.display = 'none'; progressContainer.style.display = 'block'; progressFill.style.width = '0%'; progressText.innerText = 'Iniciando...';
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) { const percent = Math.round((e.loaded / e.total) * 100); progressFill.style.width = percent + '%'; progressText.innerText = `Subiendo... ${percent}%`; }});
    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText); const directUrl = res.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        progressText.innerText = "✅ Subido"; progressFill.style.background = "var(--success)";
        await db.collection('cards').doc(id).update({ fileUrl: directUrl, fileName: file.name, authorName: currentUsername, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        setTimeout(() => { progressContainer.style.display = 'none'; el.dataset.uploading = "false"; }, 1500);
      } else { el.dataset.uploading = "false"; progressContainer.style.display = 'none'; btnUpload.style.display = 'block'; }
    });
    xhr.open('POST', 'https://tmpfiles.org/api/v1/upload');
    const formData = new FormData(); formData.append('file', file); xhr.send(formData);
  });

  el.addEventListener('dragstart', (e) => { if(data.isLocked) { e.preventDefault(); return; } window.draggingNode = el; el.classList.add('dragging'); e.dataTransfer.setData('text/plain', id); setTimeout(() => el.style.display = 'none', 0); });
  el.addEventListener('dragend', () => { el.classList.remove('dragging'); el.style.display = ''; window.draggingNode = null; if(window.dragPlaceholder && window.dragPlaceholder.parentNode) window.dragPlaceholder.parentNode.removeChild(window.dragPlaceholder); });

  return el;
}

/***********************
 * Ghosting Global
 ***********************/
window.dragPlaceholder = document.createElement('div');
window.dragPlaceholder.className = 'drop-placeholder';
window.draggingNode = null;

if (boardEl) {
  boardEl.addEventListener('dragover', e => {
    e.preventDefault(); if (!window.draggingNode) return;
    const afterEl = getDragAfterElement(boardEl, e.clientX, e.clientY); // Modificado para soportar listas
    if (afterEl == null) boardEl.appendChild(window.dragPlaceholder);
    else boardEl.insertBefore(window.dragPlaceholder, afterEl);
  });

  boardEl.addEventListener('drop', async (e) => {
    e.preventDefault(); if (!window.draggingNode) return;
    const id = window.draggingNode.dataset.id;
    if (window.dragPlaceholder.parentNode) boardEl.insertBefore(window.draggingNode, window.dragPlaceholder);

    const nodes = Array.from(boardEl.querySelectorAll('.card:not(.drop-placeholder)'));
    const idx = nodes.indexOf(window.draggingNode);
    let newPos;
    
    if (idx === 0) { const next = await getCardData(nodes[1]); newPos = next ? next.position - 1000 : Date.now(); } 
    else if (idx === nodes.length - 1) { const prev = await getCardData(nodes[idx - 1]); newPos = prev ? prev.position + 1000 : Date.now(); } 
    else { const prev = await getCardData(nodes[idx - 1]); const next = await getCardData(nodes[idx + 1]); newPos = ((prev.position || 0) + (next.position || 0)) / 2; }

    if (newPos) await db.collection('cards').doc(id).update({ position: newPos, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  });
}

function getDragAfterElement(container, x, y) {
  const draggableElements = [...container.querySelectorAll('.card:not(.dragging):not(.drop-placeholder)')];
  const isList = container.classList.contains('list-view');
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    // Si es lista evaluamos altura, si es cuadrícula evaluamos anchura
    const offset = isList ? (y - box.top - box.height / 2) : (x - box.left - box.width / 2);
    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

async function getCardData(node) {
  if (!node) return null; const doc = await db.collection('cards').doc(node.dataset.id).get();
  return doc.exists ? doc.data() : null;
}

/***********************
 * Acciones de Control
 ***********************/
if (addCardBtn) {
  addCardBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    await db.collection('cards').add({ 
      userId: currentUser.uid, 
      authorName: currentUsername, // Asigna al creador inicial
      visibility: currentView, 
      title: '', text: '', extra: '', isCodeMode: false, isLocked: false, isPinned: false, color: 'default', position: Date.now(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    });
  });
}

if (clearAllBtn) {
  clearAllBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    if (!confirm(`¿Eliminar todo el contenido de la pestaña ${currentView === 'private' ? 'PRIVADA' : 'PÚBLICA'}? (Las bloqueadas 🔒 se conservarán)`)) return;
    let query = db.collection('cards');
    if (currentView === 'private') { query = query.where('userId', '==', currentUser.uid).where('visibility', '==', 'private'); } 
    else { query = query.where('visibility', '==', 'public'); }

    const snapshot = await query.get();
    const batch = db.batch();
    snapshot.forEach(doc => { if (!doc.data().isLocked) batch.delete(doc.ref); });
    await batch.commit();
  });
}

// Ventana Modal QR (reubicado)
if (qrBtn) {
  qrBtn.addEventListener('click', () => {
    const currentUrl = encodeURIComponent(window.location.href);
    if(qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentUrl}`;
    if(qrModal) qrModal.style.display = 'flex';
  });
}