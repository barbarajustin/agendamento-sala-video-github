import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const $ = id => document.getElementById(id);
const HORARIOS = {
  manha:['07:00 - 07:45','07:45 - 08:30','08:30 - 09:15','09:15 - 10:00','10:20 - 11:10','11:10 - 12:00'],
  tarde:['13:15 - 14:00','14:00 - 14:45','14:45 - 15:30','15:45 - 16:30','16:30 - 17:15'],
  noite:['19:00 - 19:50','19:50 - 20:40','21:00 - 21:50','21:50 - 22:40']
};
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

if (firebaseConfig.apiKey.startsWith('COLE')) {
  $('login').hidden = false;
  $('loginMsg').textContent = 'Configure o Firebase: cole os dados do seu projeto em js/firebase-config.js.';
  $('btnGoogle').disabled = true;
  throw new Error('firebaseConfig não preenchido');
}

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp), db = getFirestore(fbApp);
let user = null, role = 'user', lista = [], editId = null, unsub = null, view = new Date();
view.setDate(1);

const isAdmin = () => role === 'admin';
const canEdit = r => isAdmin() || r.ownerUid === user.uid;
function msg(t, ok){ const m=$('msg'); m.textContent=t||''; m.className='msg '+(t?(ok?'ok':'err'):''); }
const erroFb = e => e.code === 'permission-denied' ? 'Sem permissão para esta ação.' : 'Erro: ' + (e.message || e.code);

/* ---------- Login ---------- */
$('btnGoogle').onclick = async () => {
  $('loginMsg').textContent = '';
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { if (e.code !== 'auth/popup-closed-by-user') $('loginMsg').textContent = erroFb(e); }
};
$('btnSair').onclick = () => signOut(auth);

onAuthStateChanged(auth, async u => {
  if (unsub) { unsub(); unsub = null; }
  if (!u) { user = null; lista = []; $('app').hidden = true; $('login').hidden = false; return; }
  try {
    user = u;
    const ref = doc(db, 'users', u.uid), snap = await getDoc(ref);
    if (snap.exists()) role = snap.data().role === 'admin' ? 'admin' : 'user';
    else { role = 'user'; await setDoc(ref, { role: 'user', email: u.email || '', nome: u.displayName || '' }); }
    $('nome').textContent = u.displayName || u.email;
    $('papel').textContent = isAdmin() ? 'Administrador' : 'Usuário';
    $('papel').className = 'badge' + (isAdmin() ? ' admin' : '');
    $('foto').hidden = !u.photoURL; if (u.photoURL) $('foto').src = u.photoURL;
    $('login').hidden = true; $('app').hidden = false;
    reset();
    unsub = onSnapshot(collection(db, 'agendamentos'),
      s => { lista = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); },
      e => msg(erroFb(e)));
  } catch (e) { $('loginMsg').textContent = erroFb(e); $('login').hidden = false; signOut(auth); }
});

/* ---------- Formulário ---------- */
function populate(turno, sel){
  const l = HORARIOS[turno] || [];
  $('horario').innerHTML = l.map(h => `<option>${h}</option>`).join('');
  if (sel && l.includes(sel)) $('horario').value = sel;
}
$('turno').onchange = () => populate($('turno').value);

function reset(){
  editId = null;
  ['disciplina','turma','data'].forEach(i => $(i).value = '');
  $('professor').value = user ? (user.displayName || '') : '';
  $('turno').value = 'manha'; populate('manha');
  $('editFlag').hidden = true; $('btnCancelar').hidden = true;
  $('btnSalvar').textContent = 'Agendar Sala';
}

async function salvar(){
  const r = { professor:$('professor').value.trim(), disciplina:$('disciplina').value.trim(), turma:$('turma').value.trim(),
    data:$('data').value, turno:$('turno').value, horario:$('horario').value };
  if (Object.values(r).some(v => !v)) return msg('Preencha todos os campos.');
  const [y,m,d] = r.data.split('-').map(Number), dow = new Date(y,m-1,d).getDay();
  if (dow === 0 || dow === 6) return msg('Sábado e domingo não podem ser agendados.');
  const c = lista.find(x => x.data === r.data && x.horario === r.horario && x.id !== editId);
  if (c) return msg(`Horário ocupado: ${c.professor} (${c.turma}) já reservou a sala neste horário.`);
  try {
    if (editId) {
      const atual = lista.find(x => x.id === editId);
      if (!atual || !canEdit(atual)) return msg('Você só pode editar os seus agendamentos.');
      await updateDoc(doc(db, 'agendamentos', editId), { ...r, ownerUid: atual.ownerUid });
      msg('Agendamento atualizado.', true);
    } else {
      await addDoc(collection(db, 'agendamentos'), { ...r, ownerUid: user.uid });
      msg('Sala agendada com sucesso.', true);
    }
    view = new Date(y, m-1, 1); reset(); render();
    if (matchMedia('(max-width:900px)').matches) document.querySelector('.cal-col').scrollIntoView({ behavior:'smooth', block:'start' });
  } catch (e) { msg(erroFb(e)); }
}

function editar(id){
  const r = lista.find(x => x.id === id); if (!r || !canEdit(r)) return;
  editId = id;
  $('professor').value = r.professor; $('disciplina').value = r.disciplina; $('turma').value = r.turma; $('data').value = r.data;
  $('turno').value = r.turno; populate(r.turno, r.horario);
  $('editFlag').hidden = false; $('btnCancelar').hidden = false;
  $('btnSalvar').textContent = 'Salvar alterações'; msg(''); $('professor').focus();
}

function excluir(id){
  if (!isAdmin()) return;
  const r = lista.find(x => x.id === id); if (!r) return;
  $('confirmTxt').textContent = `${r.professor}, ${r.data.split('-').reverse().join('/')}, ${r.horario}.`;
  $('confirmBox').hidden = false; $('confirmSim').focus();
  $('confirmSim').onclick = async () => {
    $('confirmBox').hidden = true;
    try { await deleteDoc(doc(db, 'agendamentos', id)); if (editId === id) reset(); msg('Agendamento excluído.', true); }
    catch (e) { msg(erroFb(e)); }
  };
}
$('confirmNao').onclick = () => $('confirmBox').hidden = true;
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('confirmBox').hidden = true; });

$('btnSalvar').onclick = salvar;
$('btnCancelar').onclick = () => { reset(); msg(''); };
$('f').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') salvar(); });
$('data').onchange = function(){
  const p = this.value.split('-').map(Number), w = p.length === 3 ? new Date(p[0],p[1]-1,p[2]).getDay() : 1;
  msg(w === 0 || w === 6 ? 'Sábado e domingo não podem ser agendados.' : '');
};

/* ---------- Planilha ---------- */
function render(){
  const y = view.getFullYear(), m = view.getMonth();
  $('monthLabel').textContent = view.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  const last = new Date(y, m+1, 0), wd = (new Date(y,m,1).getDay() + 6) % 7, hoje = iso(new Date());
  let html = '';
  for (let w = new Date(y, m, 1 - wd); w <= last; w.setDate(w.getDate() + 7)) {
    html += '<tr>';
    for (let i = 0; i < 7; i++) {
      const d = new Date(w.getFullYear(), w.getMonth(), w.getDate() + i), k = iso(d), fds = i >= 5;
      const cls = [d.getMonth() !== m ? 'other-month' : '', k === hoje ? 'today' : '', fds ? 'weekend' : ''].join(' ');
      const evs = lista.filter(r => r.data === k).sort((a,b) => a.horario.localeCompare(b.horario));
      html += `<td class="${cls}"${fds ? ' title="Sábado e domingo não podem ser agendados"' : ` data-d="${k}"`}><span class="daynum">${d.getDate()}</span>` +
        evs.map(r => {
          const ed = canEdit(r);
          return `<div class="agenda-item turno-${esc(r.turno)}${ed ? ' can-edit' : ''}"${ed ? ` data-edit="${r.id}" title="Clique para editar"` : ''}>` +
            `<b>${esc(r.horario)}</b>${esc(r.professor)}<br>${esc(r.disciplina)} · ${esc(r.turma)}` +
            `<div class="actions">${ed ? `<button type="button" data-edit="${r.id}" aria-label="Editar">✏️</button>` : ''}` +
            `${isAdmin() ? `<button type="button" data-del="${r.id}" aria-label="Excluir">🗑️</button>` : ''}</div></div>`;
        }).join('') + '</td>';
    }
    html += '</tr>';
  }
  $('calBody').innerHTML = html;
}
$('prevMonth').onclick = () => { view.setMonth(view.getMonth() - 1); render(); };
$('nextMonth').onclick = () => { view.setMonth(view.getMonth() + 1); render(); };
$('calBody').addEventListener('click', e => {
  const del = e.target.closest('[data-del]'); if (del) return excluir(del.dataset.del);
  const ed = e.target.closest('[data-edit]'); if (ed) return editar(ed.dataset.edit);
  const td = e.target.closest('td');
  if (td && td.classList.contains('weekend')) return msg('Sábado e domingo não podem ser agendados.');
  if (td && td.dataset.d) { $('data').value = td.dataset.d; $('professor').focus(); }
});

/* ---------- Tema ---------- */
const root = document.documentElement;
function setTheme(t){ root.setAttribute('data-theme', t); $('themeToggle').textContent = t === 'dark' ? '☀️ Tema claro' : '🌙 Tema escuro'; }
setTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
$('themeToggle').onclick = () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
populate('manha');
