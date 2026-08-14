alert("El archivo app.js sí se está ejecutando!");
/***********************
 * Navegación por Pestañas
 ***********************/
let currentView = 'private'; // Puede ser 'private' o 'public'
const tabPrivate = document.getElementById('tabPrivate');
const tabPublic = document.getElementById('tabPublic');

tabPrivate.addEventListener('click', () => {
  if(currentView === 'private') return;
  currentView = 'private';
  tabPrivate.classList.add('active');
  tabPublic.classList.remove('active');
  startRealtime();
});

tabPublic.addEventListener('click', () => {
  if(currentView === 'public') return;
  currentView = 'public';
  tabPublic.classList.add('active');
  tabPrivate.classList.remove('active');
  startRealtime();
});

/***********************
 * Sincronización Realtime Principal
 ***********************/
function startRealtime() {
  if (!currentUser) return;

  // Limpiar el tablero antes de cargar la nueva vista para evitar destellos
  boardEl.innerHTML = '';
  skeletonEl.style.display = 'flex';
  boardEl.style.display = 'none';
  emptyMsg.style.display = 'none';

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
  }

  // Construir la consulta dependiendo de la pestaña activa
  let query = db.collection('cards');
  if (currentView === 'private') {
    query = query.where('userId', '==', currentUser.uid).where('visibility', '==', 'private');
  } else {
    query = query.where('visibility', '==', 'public');
  }

  unsubscribeSnapshot = query.onSnapshot(snapshot => {
    skeletonEl.style.display = 'none'; 
    boardEl.style.display = 'flex';

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
  // Añade la tarjeta a la vista actual
  await db.collection('cards').add({ 
    userId: currentUser.uid, 
    visibility: currentView, // 'private' o 'public'
    title: '', text: '', extra: '', isCodeMode: false, isLocked: false, isPinned: false, color: 'default', position: Date.now(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
  });
});

clearAllBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  if (!confirm(`¿Eliminar todo el contenido de la pestaña ${currentView === 'private' ? 'PRIVADA' : 'PÚBLICA'}? (Las bloqueadas 🔒 se conservarán)`)) return;
  
  let query = db.collection('cards');
  if (currentView === 'private') {
    query = query.where('userId', '==', currentUser.uid).where('visibility', '==', 'private');
  } else {
    query = query.where('visibility', '==', 'public');
  }

  const snapshot = await query.get();
  const batch = db.batch();
  snapshot.forEach(doc => { if (!doc.data().isLocked) batch.delete(doc.ref); });
  await batch.commit();
});
