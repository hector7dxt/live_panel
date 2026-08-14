/***********************
 * Lógica de Autenticación
 ***********************/
let currentUser = null;
let unsubscribeSnapshot = null;

const loginOverlay = document.getElementById('loginOverlay');
const appContainer = document.getElementById('appContainer');
const userNameDisplay = document.getElementById('userNameDisplay');

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loginOverlay.style.display = 'none';
    appContainer.style.display = 'block';
    const cleanName = user.email.split('@')[0];
    userNameDisplay.textContent = `(${cleanName})`;
    startRealtime();
  } else {
    currentUser = null;
    loginOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const userVal = document.getElementById('loginUser').value.trim();
  const passVal = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');

  if (!userVal || !passVal) {
    errorEl.textContent = 'Por favor ingresa usuario y contraseña.';
    return;
  }

  const email = `${userVal}@panelvivo.com`;
  document.getElementById('loginBtn').textContent = 'Conectando...';
  
  try {
    await auth.signInWithEmailAndPassword(email, passVal);
    errorEl.textContent = '';
  } catch (error) {
    console.error(error);
    errorEl.textContent = 'Credenciales incorrectas o usuario inexistente.';
  } finally {
    document.getElementById('loginBtn').textContent = 'Ingresar al Panel';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut();
});

/***********************
 * Preferencias UI
 ***********************/
const themeToggleBtn = document.getElementById('themeToggleBtn');
let isDark = localStorage.getItem('theme') === 'dark';
if (isDark) { document.documentElement.setAttribute('data-theme', 'dark'); themeToggleBtn.textContent = '☀️'; }

themeToggleBtn.addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
});

const autoDeleteBtn = document.getElementById('autoDeleteBtn');
let isAutoDelete = localStorage.getItem('autoDelete') === 'true';
autoDeleteBtn.textContent = isAutoDelete ? '⏳ Limpieza: ON' : '⏳ Limpieza: OFF';
autoDeleteBtn.style.color = isAutoDelete ? 'var(--success)' : 'inherit';

autoDeleteBtn.addEventListener('click', () => {
  isAutoDelete = !isAutoDelete;
  localStorage.setItem('autoDelete', isAutoDelete);
  autoDeleteBtn.textContent = isAutoDelete ? '⏳ Limpieza: ON' : '⏳ Limpieza: OFF';
  autoDeleteBtn.style.color = isAutoDelete ? 'var(--success)' : 'inherit';
});

/***********************
 * Modal QR
 ***********************/
const qrBtn = document.getElementById('qrBtn');
const qrModal = document.getElementById('qrModal');
const qrImage = document.getElementById('qrImage');
const closeModal = document.querySelector('.close-modal');

qrBtn.addEventListener('click', () => {
  const currentUrl = encodeURIComponent(window.location.href);
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentUrl}`;
  qrModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => qrModal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === qrModal) qrModal.style.display = 'none'; });

/***********************
 * Utilidades Core
 ***********************/
const boardEl = document.getElementById('board');
const skeletonEl = document.getElementById('skeletonLoader');
const addCardBtn = document.getElementById('addCardBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const emptyMsg = document.getElementById('emptyMsg');
const colorsArray = ['default', 'red', 'blue', 'green', 'yellow'];

function debounce(fn, wait = 1500) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function linkify(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" contenteditable="false" style="color: var(--accent); text-decoration: underline;">$1</a>');
}

/***********************
 * Creador de Tarjetas
 ***********************/
function createCardNode(cardDoc, indexForNumbering) {
  const data = cardDoc.data();
  const id = cardDoc.id;

  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = !data.isLocked; 
  el.dataset.id = id;
  el.dataset.uploading = "false";
  
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
      <div class="muted updated-at">--</div>
      <div class="status-badge"></div>
    </div>
  `;

  const titleEl = el.querySelector('.card-title');
  const mainEl = el.querySelector('.card-content');
  const extraEl = el.querySelector('.card-extra');
  const updatedAtEl = el.querySelector('.updated-at');
  const statusBadge = el.querySelector('.status-badge');
  const fileLinkContainer = el.querySelector('.file-link-container');
  const btnUpload = el.querySelector('.btn-upload');

  const setStatus = (state) => {
     if (state === 'saving') { statusBadge.textContent = '⏳ Guardando...'; statusBadge.style.color = 'var(--warning)'; } 
     else if (state === 'saved') { statusBadge.textContent = '✅ Guardado'; statusBadge.style.color = 'var(--success)'; setTimeout(() => { if(statusBadge.textContent === '✅ Guardado') statusBadge.textContent = ''; }, 2000); }
  };

  titleEl.textContent = data.title || '';
  mainEl.innerHTML = linkify(data.text);
  extraEl.innerHTML = linkify(data.extra);
  
  if (data.updatedAt) {
    const dt = new Date(data.updatedAt.seconds * 1000);
    updatedAtEl.textContent = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
  }

  if (data.fileUrl) {
    if(btnUpload) btnUpload.style.display = 'none';
    fileLinkContainer.innerHTML = `<a href="${data.fileUrl}" download="${data.fileName || 'archivo'}" class="btn-download">⬇️ Descargar ${data.fileName || ''}</a>`;
  }

  /***** Listeners Tarjeta *****/
  el.querySelector('.btn-pin').addEventListener('click', async (ev) => {
    ev.stopPropagation();
    const isPinned = el.classList.contains('is-pinned');
    await db.collection('cards').doc(id).update({ isPinned: !isPinned });
  });

  el.querySelector('.btn-color').addEventListener('click', async (ev) => {
    ev.stopPropagation();
    const currentColor = el.dataset.color || 'default';
    let nextIndex = (colorsArray.indexOf(currentColor) + 1) % colorsArray.length;
    await db.collection('cards').doc(id).update({ color: colorsArray[nextIndex] });
  });

  el.querySelector('.btn-code').addEventListener('click', async (ev) => {
    ev.stopPropagation();
    const isCodeMode = el.classList.contains('code-mode');
    await db.collection('cards').doc(id).update({ isCodeMode: !isCodeMode });
  });

  el.querySelector('.btn-lock').addEventListener('click', async (ev) => {
    ev.stopPropagation();
    const isLocked = el.classList.contains('locked');
    await db.collection('cards').doc(id).update({ isLocked: !isLocked });
  });

  el.querySelector('.btn-copy').addEventListener('click', (ev) => {
    ev.stopPropagation();
    const content = `${titleEl.innerText}\n\n${mainEl.innerText}\n\n${extraEl.innerText}`;
    navigator.clipboard.writeText(content.trim());
    const btn = ev.target; btn.textContent = '✅'; setTimeout(() => btn.textContent = '📋', 1500);
  });

  el.querySelector('.btn-delete').addEventListener('click', async (ev) => {
    ev.stopPropagation();
    if (!confirm('¿Eliminar tarjeta?')) return;
    await db.collection('cards').doc(id).delete();
  });

  const saveTitle = debounce(async (val) => { await db.collection('cards').doc(id).update({title: val, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); setStatus('saved'); });
  const saveMain = debounce(async (val) => { await db.collection('cards').doc(id).update({text: val, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); setStatus('saved'); });
  const saveExtra = debounce(async (val) => { await db.collection('cards').doc(id).update({extra: val, updatedAt: firebase.firestore.FieldValue.serverTimestamp()}); setStatus('saved'); });

  titleEl.addEventListener('input', (e) => { setStatus('saving'); saveTitle(e.target.innerText.trim()); });
  mainEl.addEventListener('input', (e) => { setStatus('saving'); saveMain(e.target.innerText); });
  extraEl.addEventListener('input', (e) => { setStatus('saving'); saveExtra(e.target.innerText); });

  [titleEl, mainEl, extraEl].forEach(node => node.addEventListener('mousedown', (e) => e.stopPropagation()));

  /***** Subida API *****/
  const fileInput = el.querySelector('.file-input');
  const progressContainer = el.querySelector('.progress-container');
  const progressFill = el.querySelector('.progress-fill');
  const progressText = el.querySelector('.progress-text');

  if(btnUpload) btnUpload.addEventListener('click', (ev) => { ev.stopPropagation(); fileInput.click(); });

  fileInput.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert("Límite de 50MB excedido."); return; }

    el.dataset.uploading = "true";
    btnUpload.style.display = 'none';
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.innerText = 'Iniciando...';

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percent + '%';
        progressText.innerText = `Subiendo... ${percent}%`;
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        const directUrl = res.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        progressText.innerText = "✅ Subido"; progressFill.style.background = "var(--success)";
        await db.collection('cards').doc(id).update({ fileUrl: directUrl, fileName: file.name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        setTimeout(() => { progressContainer.style.display = 'none'; el.dataset.uploading = "false"; }, 1500);
      } else {
        el.dataset.uploading = "false"; progressContainer.style.display = 'none'; btnUpload.style.display = 'block';
      }
    });

    xhr.open('POST', 'https://tmpfiles.org/api/v1/upload');
    const formData = new FormData(); formData.append('file', file);
    xhr.send(formData);
  });

  /***** Drag & Drop Lógica *****/
  el.addEventListener('dragstart', (e) => {
    if(data.isLocked) { e.preventDefault(); return; }
    window.draggingNode = el;
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => el.style.display = 'none', 0);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    el.style.display = ''; 
    window.draggingNode = null;
    if(window.dragPlaceholder && window.dragPlaceholder.parentNode) window.dragPlaceholder.parentNode.removeChild(window.dragPlaceholder);
  });

  return el;
}

/***********************
 * Ghosting y Reordenamiento
 ***********************/
window.dragPlaceholder = document.createElement('div');
window.dragPlaceholder.className = 'drop-placeholder';
window.draggingNode = null;

boardEl.addEventListener('dragover', e => {
  e.preventDefault();
  if (!window.draggingNode) return;
  const afterEl = getDragAfterElement(boardEl, e.clientX);
  if (afterEl == null) boardEl.appendChild(window.dragPlaceholder);
  else boardEl.insertBefore(window.dragPlaceholder, afterEl);
});

boardEl.addEventListener('drop', async (e) => {
  e.preventDefault();
  if (!window.draggingNode) return;
  const id = window.draggingNode.dataset.id;
  
  if (window.dragPlaceholder.parentNode) boardEl.insertBefore(window.draggingNode, window.dragPlaceholder);

  const nodes = Array.from(boardEl.querySelectorAll('.card:not(.drop-placeholder)'));
  const idx = nodes.indexOf(window.draggingNode);
  let newPos;
  
  if (idx === 0) {
    const next = await getCardData(nodes[1]); newPos = next ? next.position - 1000 : Date.now();
  } else if (idx === nodes.length - 1) {
    const prev = await getCardData(nodes[idx - 1]); newPos = prev ? prev.position + 1000 : Date.now();
  } else {
    const prev = await getCardData(nodes[idx - 1]); const next = await getCardData(nodes[idx + 1]); newPos = ((prev.position || 0) + (next.position || 0)) / 2;
  }

  if (newPos) await db.collection('cards').doc(id).update({ position: newPos, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
});

function getDragAfterElement(container, x) {
  const draggableElements = [...container.querySelectorAll('.card:not(.dragging):not(.drop-placeholder)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

async function getCardData(node) {
  if (!node) return null;
  const doc = await db.collection('cards').doc(node.dataset.id).get();
  return doc.exists ? doc.data() : null;
}

/***********************
 * Sincronización Realtime Principal
 ***********************/
function startRealtime() {
  if (!currentUser) return;

  unsubscribeSnapshot = db.collection('cards')
    .where('userId', '==', currentUser.uid)
    .onSnapshot(snapshot => {
    
    skeletonEl.style.display = 'none'; boardEl.style.display = 'flex';

    let docs = snapshot.docs.sort((a, b) => (a.data().position || 0) - (b.data().position || 0));
    
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
        if (footerTime && data.updatedAt) { const dt = new Date(data.updatedAt.seconds * 1000); footerTime.innerText = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`; }

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
  });
}

/***********************
 * Acciones Globales
 ***********************/
addCardBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  await db.collection('cards').add({ 
    userId: currentUser.uid, 
    title: '', text: '', extra: '', isCodeMode: false, isLocked: false, isPinned: false, color: 'default', position: Date.now(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
  });
});

clearAllBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  if (!confirm('¿Eliminar todas tus tarjetas? (Las bloqueadas 🔒 se conservarán)')) return;
  
  const snapshot = await db.collection('cards').where('userId', '==', currentUser.uid).get();
  const batch = db.batch();
  snapshot.forEach(doc => { if (!doc.data().isLocked) batch.delete(doc.ref); });
  await batch.commit();
});
