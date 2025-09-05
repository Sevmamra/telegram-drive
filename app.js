// app.js — small frontend that talks to backend
const API_BASE = 'http://localhost:3000/api'; // change to your backend URL when deployed
let ADMIN_TOKEN = ''; // for demo a prompt is okay

(async function init(){
  ADMIN_TOKEN = prompt('Enter ADMIN token (for demo):') || '';
  document.getElementById('refreshBtn').addEventListener('click', fetchFiles);
  document.getElementById('uploadBtn').addEventListener('click', uploadFile);
  fetchFiles();
})();

async function fetchFiles(){
  try {
    const r = await fetch(API_BASE + '/files');
    const j = await r.json();
    const container = document.getElementById('filesContainer');
    container.innerHTML = '';
    if (!j.files || j.files.length===0) { container.innerHTML = '<div class="muted">No files yet</div>'; return; }
    j.files.forEach(f=>{
      const div = document.createElement('div');
      div.className = 'file-item';
      div.innerHTML = `<div><strong>${escapeHtml(f.file_name)}</strong><div class="muted">${new Date(f.uploaded_at).toLocaleString()}</div></div>
        <div><a href="${API_BASE + '/download/' + encodeURIComponent(f.id)}" target="_blank"><button>Download</button></a></div>`;
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    document.getElementById('filesContainer').innerHTML = '<div class="muted">Error loading files</div>';
  }
}

async function uploadFile(){
  const fileEl = document.getElementById('fileInput');
  if (!fileEl.files || fileEl.files.length===0) { alert('Pick a file'); return; }
  const file = fileEl.files[0];
  const filename = document.getElementById('filename').value.trim() || file.name;
  const caption = document.getElementById('caption').value.trim();

  const form = new FormData();
  form.append('file', file, filename);
  form.append('filename', filename);
  form.append('caption', caption);

  const status = document.getElementById('status');
  status.textContent = 'Uploading...';
  try {
    const resp = await fetch(API_BASE + '/upload', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN },
      body: form
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(data));
    status.textContent = 'Uploaded ✓';
    setTimeout(()=>status.textContent='', 1500);
    fetchFiles();
    fileEl.value = ''; document.getElementById('filename').value=''; document.getElementById('caption').value='';
  } catch (err) {
    console.error(err);
    status.textContent = 'Upload failed';
    alert('Upload error: ' + (err.message || err));
  }
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
