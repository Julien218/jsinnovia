import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://rzvvwcwyaddzsaattwqt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_54MMKq61N-dZ3a-36G5Nqg_X2DAwXho';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STAGES = [
  ['prospect','Prospect'],['qualifie','Qualifié'],['devis','Devis'],['validation','Validation'],
  ['contrat','Contrat'],['signature','Signature'],['paiement','Paiement'],['gagne','Gagné'],['perdu','Perdu']
];
const STAGE_LABEL = Object.fromEntries(STAGES);
const state = { session:null, user:null, tenant:null, membership:null, tenants:[], settings:null, leads:[], quotes:[], contracts:[], payments:[], commissions:[], activities:[], tab:'dashboard' };
const app = document.querySelector('#app');

const euro = cents => new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format((Number(cents)||0)/100);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const date = v => v ? new Intl.DateTimeFormat('fr-BE',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)) : '—';
const toast = (msg) => { const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2800); };

function authView(message=''){
  app.innerHTML = `<div class="auth-page">
    <section class="auth-visual">
      <div class="brand"><div class="mark">PS</div><div><strong>PilotyaSign Pro</strong><small>by JS-Innov.IA</small></div></div>
      <div><h1>Le parcours commercial automatisé.</h1><p>Du premier contact au paiement : centralisez vos prospects, devis, contrats, signatures, paiements et commissions dans un cockpit unique.</p>
      <div class="journey"><span>Prospects</span><span>Devis</span><span>Contrats</span><span>Signatures</span><span>Paiements</span><span>Commissions</span></div></div>
      <small style="color:var(--muted)">PilotyaSign Pro · une solution JS-Innov.IA</small>
    </section>
    <section class="auth-form"><div class="auth-card">
      <h2>Connexion</h2><p>Accédez à votre espace PilotyaSign Pro.</p>
      ${message?`<div class="notice">${esc(message)}</div><br>`:''}
      <form id="loginForm" class="stack">
        <input class="input" type="email" name="email" placeholder="E-mail" required autocomplete="email">
        <input class="input" type="password" name="password" placeholder="Mot de passe" required minlength="6" autocomplete="current-password">
        <button class="btn primary" type="submit">Se connecter</button>
      </form>
      <div style="height:10px"></div>
      <button class="btn ghost" id="signupBtn" style="width:100%">Créer mon espace</button>
      <p class="settings-note" style="margin-top:16px">Les comptes sont isolés par organisation. JS-Innov.IA conserve l’accès Super Admin à la plateforme.</p>
    </div></section>
  </div>`;
  document.querySelector('#loginForm').onsubmit = login;
  document.querySelector('#signupBtn').onclick = signup;
}

async function login(e){
  e.preventDefault(); const f=new FormData(e.currentTarget);
  const {error}=await supabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
  if(error) return authView(error.message);
}
async function signup(){
  const email=prompt('Votre adresse e-mail :'); if(!email)return;
  const password=prompt('Choisissez un mot de passe (minimum 6 caractères) :'); if(!password)return;
  const {error}=await supabase.auth.signUp({email,password});
  if(error) return authView(error.message);
  authView('Compte créé. Si la confirmation e-mail est activée, validez votre adresse puis reconnectez-vous.');
}

async function bootstrap(){
  const {data:{session}}=await supabase.auth.getSession();
  state.session=session; state.user=session?.user||null;
  if(!session){authView();return;}
  await loadTenants();
  if(!state.tenant){workspaceSetupView();return;}
  await loadAll(); render();
}

async function loadTenants(){
  const {data:members,error}=await supabase.from('pilotya_memberships').select('tenant_id,role,pilotya_tenants(id,name,slug)').eq('user_id',state.user.id);
  if(error){console.error(error);state.tenants=[];return;}
  state.tenants=(members||[]).map(m=>({...m.pilotya_tenants,role:m.role})).filter(Boolean);
  const saved=localStorage.getItem('pilotya_tenant');
  state.tenant=state.tenants.find(t=>t.id===saved)||state.tenants[0]||null;
  state.membership=state.tenant?{role:state.tenant.role}:null;
}

function workspaceSetupView(){
  app.innerHTML=`<div class="auth-page"><section class="auth-visual"><div class="brand"><div class="mark">PS</div><div><strong>PilotyaSign Pro</strong><small>by JS-Innov.IA</small></div></div><div><h1>Créez votre cockpit commercial.</h1><p>Chaque organisation dispose de ses propres prospects, tarifs, devis, contrats et statistiques.</p></div><small style="color:var(--muted)">${esc(state.user?.email)}</small></section><section class="auth-form"><div class="auth-card"><h2>Nouvel espace</h2><p>Nom de votre entreprise ou activité.</p><form id="workspaceForm" class="stack"><input class="input" name="name" placeholder="Ex. Pixelium" required><input class="input" name="slug" placeholder="pixelium" required pattern="[A-Za-z0-9-]+"><button class="btn primary">Créer l’espace</button></form><button id="logout" class="btn ghost" style="width:100%;margin-top:10px">Déconnexion</button></div></section></div>`;
  document.querySelector('#workspaceForm').onsubmit=createWorkspace;
  document.querySelector('#logout').onclick=()=>supabase.auth.signOut();
}
async function createWorkspace(e){
  e.preventDefault(); const f=new FormData(e.currentTarget);
  const {data,error}=await supabase.rpc('pilotya_create_workspace',{p_name:f.get('name'),p_slug:f.get('slug')});
  if(error){toast(error.message);return;} localStorage.setItem('pilotya_tenant',data); await bootstrap();
}

async function loadAll(){
  if(!state.tenant)return; const t=state.tenant.id;
  const [settings,leads,quotes,contracts,payments,commissions,activities]=await Promise.all([
    supabase.from('pilotya_settings').select('*').eq('tenant_id',t).maybeSingle(),
    supabase.from('pilotya_leads').select('*').eq('tenant_id',t).order('created_at',{ascending:false}),
    supabase.from('pilotya_quotes').select('*').eq('tenant_id',t).order('created_at',{ascending:false}),
    supabase.from('pilotya_contracts').select('*').eq('tenant_id',t).order('created_at',{ascending:false}),
    supabase.from('pilotya_payments').select('*').eq('tenant_id',t).order('created_at',{ascending:false}),
    supabase.from('pilotya_commissions').select('*').eq('tenant_id',t).order('created_at',{ascending:false}),
    supabase.from('pilotya_activities').select('*').eq('tenant_id',t).order('created_at',{ascending:false}).limit(20)
  ]);
  state.settings=settings.data; state.leads=leads.data||[]; state.quotes=quotes.data||[]; state.contracts=contracts.data||[]; state.payments=payments.data||[]; state.commissions=commissions.data||[]; state.activities=activities.data||[];
}

function nav(){ const items=[['dashboard','◫','Vue d’ensemble'],['pipeline','⌁','Pipeline'],['leads','◎','Prospects'],['quotes','▤','Devis'],['contracts','✎','Contrats'],['payments','€','Paiements'],['commissions','%','Commissions'],['settings','⚙','Paramètres']]; return items.map(([id,ico,label])=>`<button data-tab="${id}" class="${state.tab===id?'active':''}"><b>${ico}</b>${label}</button>`).join(''); }
function shell(content){
  return `<div class="shell"><aside class="sidebar"><div class="brand"><div class="mark">PS</div><div><strong>PilotyaSign Pro</strong><small>by JS-Innov.IA</small></div></div><nav class="nav">${nav()}</nav><div class="sidebar-foot"><div class="userbox"><strong>${esc(state.tenant?.name)}</strong><small>${esc(state.user?.email)}</small><small>${state.membership?.role==='owner'?'Administrateur':esc(state.membership?.role)}</small></div></div></aside><main class="main"><header class="topbar"><div class="workspace">${esc(state.tenant?.name)}<span>Parcours commercial centralisé</span></div><div style="display:flex;gap:8px"><button class="btn" id="newLeadTop">+ Prospect</button><button class="btn ghost" id="logoutBtn">Déconnexion</button></div></header><div class="content">${content}</div></main></div>`;
}
function bindShell(){ document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();}); document.querySelector('#logoutBtn').onclick=()=>supabase.auth.signOut(); const n=document.querySelector('#newLeadTop');if(n)n.onclick=openLeadModal; }

function dashboard(){
  const active=state.leads.filter(l=>!['gagne','perdu'].includes(l.status)); const won=state.leads.filter(l=>l.status==='gagne'); const wonValue=won.reduce((s,l)=>s+(Number(l.estimated_value_cents)||0),0); const paid=state.payments.filter(p=>p.status==='paye').reduce((s,p)=>s+Number(p.amount_cents||0),0);
  const max=Math.max(1,...STAGES.map(([s])=>state.leads.filter(l=>l.status===s).length));
  return `<div class="hero"><div><h1>Vue d’ensemble</h1><p>Suivez votre activité commerciale en temps réel.</p></div><button class="btn primary" id="newLeadHero">+ Nouveau prospect</button></div>
  <section class="stats"><div class="stat"><span class="label">Prospects actifs</span><strong>${active.length}</strong><small>dans le parcours</small></div><div class="stat"><span class="label">Devis</span><strong>${state.quotes.length}</strong><small>${state.quotes.filter(q=>q.status==='accepte').length} accepté(s)</small></div><div class="stat"><span class="label">Valeur gagnée</span><strong>${euro(wonValue)}</strong><small class="kpi-positive">opportunités gagnées</small></div><div class="stat"><span class="label">Paiements encaissés</span><strong>${euro(paid)}</strong><small>enregistrés</small></div></section>
  <div class="grid2"><section class="card"><h2>Pipeline commercial</h2><div class="pipeline">${STAGES.filter(x=>x[0]!=='perdu').map(([s,l])=>{const c=state.leads.filter(x=>x.status===s).length;return `<div class="stage"><span>${l}</span><div class="bar"><i style="width:${Math.max(c?8:0,c/max*100)}%"></i></div><b>${c}</b></div>`}).join('')}</div></section><section class="card"><h2>Activité récente</h2><div class="activity">${state.activities.length?state.activities.slice(0,8).map(a=>`<div class="activity-item"><strong>${esc(a.event_type)}</strong><small>${date(a.created_at)}</small></div>`).join(''):'<div class="empty">Aucune activité pour le moment.</div>'}</div></section></div>`;
}
function leadsView(){return `<div class="hero"><div><h1>Prospects</h1><p>Centralisez chaque opportunité commerciale.</p></div><button class="btn primary" id="newLeadHero">+ Nouveau prospect</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Référence</th><th>Contact</th><th>Entreprise</th><th>Étape</th><th>Valeur</th><th>Créé</th><th></th></tr></thead><tbody>${state.leads.length?state.leads.map(l=>`<tr><td><b>${esc(l.reference)}</b></td><td>${esc(l.contact_name)}<br><small style="color:var(--muted)">${esc(l.email||l.phone||'')}</small></td><td>${esc(l.company_name||'—')}</td><td><select class="select stageSelect" data-id="${l.id}" style="padding:7px 8px">${STAGES.map(([v,n])=>`<option value="${v}" ${l.status===v?'selected':''}>${n}</option>`).join('')}</select></td><td>${euro(l.estimated_value_cents)}</td><td>${date(l.created_at)}</td><td><button class="btn quoteBtn" data-id="${l.id}">Créer devis</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">Aucun prospect. Ajoutez votre première opportunité.</div></td></tr>'}</tbody></table></div>`}
function pipelineView(){ const groups=[['prospect','Nouveaux'],['qualifie','Qualifiés'],['devis','Devis'],['validation','Validation']]; return `<div class="hero"><div><h1>Pipeline</h1><p>Visualisez les opportunités avant contractualisation.</p></div></div><div class="kanban">${groups.map(([s,l])=>`<div class="kanban-col"><h3>${l} · ${state.leads.filter(x=>x.status===s).length}</h3>${state.leads.filter(x=>x.status===s).map(x=>`<div class="lead-card"><strong>${esc(x.company_name||x.contact_name)}</strong><small>${esc(x.contact_name)}</small><div class="amount">${euro(x.estimated_value_cents)}</div></div>`).join('')||'<div class="empty">Vide</div>'}</div>`).join('')}</div>`; }
function quotesView(){return `<div class="hero"><div><h1>Devis</h1><p>Les conditions restent figées au moment de la création du devis.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Référence</th><th>Objet</th><th>Montant HTVA</th><th>TVA</th><th>Statut</th><th>Validité</th><th></th></tr></thead><tbody>${state.quotes.length?state.quotes.map(q=>`<tr><td><b>${esc(q.reference)}</b></td><td>${esc(q.title)}</td><td>${euro(q.amount_cents)}</td><td>${esc(q.tax_rate)}%</td><td><span class="badge ${q.status==='accepte'?'ok':q.status==='refuse'?'danger':'warn'}">${esc(q.status)}</span></td><td>${q.valid_until?new Intl.DateTimeFormat('fr-BE').format(new Date(q.valid_until)):'—'}</td><td>${q.status!=='accepte'?`<button class="btn acceptQuote" data-id="${q.id}" data-lead="${q.lead_id}">Accepter</button>`:'✓'}</td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">Aucun devis créé.</div></td></tr>'}</tbody></table></div>`}
function contractsView(){return `<div class="hero"><div><h1>Contrats</h1><p>Suivi contractuel avant signature électronique.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Référence</th><th>Statut</th><th>Créé</th><th>Signé</th><th></th></tr></thead><tbody>${state.contracts.length?state.contracts.map(c=>`<tr><td><b>${esc(c.reference)}</b></td><td><span class="badge ${c.status==='signe'?'ok':'warn'}">${esc(c.status)}</span></td><td>${date(c.created_at)}</td><td>${date(c.signed_at)}</td><td>${c.status!=='signe'?`<button class="btn signContract" data-id="${c.id}" data-lead="${c.lead_id}">Marquer signé</button>`:'✓'}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">Les contrats apparaîtront après acceptation d’un devis.</div></td></tr>'}</tbody></table></div>`}
function paymentsView(){return `<div class="hero"><div><h1>Paiements</h1><p>Suivez les montants attendus et encaissés.</p></div><button class="btn primary" id="newPayment">+ Enregistrer un paiement</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Montant</th><th>Statut</th><th>Prestataire</th><th>Référence</th><th>Date</th></tr></thead><tbody>${state.payments.length?state.payments.map(p=>`<tr><td><b>${euro(p.amount_cents)}</b></td><td><span class="badge ${p.status==='paye'?'ok':'warn'}">${esc(p.status)}</span></td><td>${esc(p.provider||'Manuel')}</td><td>${esc(p.provider_reference||'—')}</td><td>${date(p.paid_at||p.created_at)}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">Aucun paiement enregistré.</div></td></tr>'}</tbody></table></div>`}
function commissionsView(){return `<div class="hero"><div><h1>Commissions</h1><p>Les commissions restent séparées des tarifs client et réservées aux rôles autorisés.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Base</th><th>Taux</th><th>Commission</th><th>Statut</th><th>Créé</th></tr></thead><tbody>${state.commissions.length?state.commissions.map(c=>`<tr><td>${euro(c.base_amount_cents)}</td><td>${c.rate??'—'}%</td><td><b>${c.amount_cents==null?'—':euro(c.amount_cents)}</b></td><td><span class="badge ${c.status==='payee'?'ok':'warn'}">${esc(c.status)}</span></td><td>${date(c.created_at)}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">Aucune commission calculée pour le moment.</div></td></tr>'}</tbody></table></div>`}
function settingsView(){ const s=state.settings||{}; return `<div class="hero"><div><h1>Paramètres</h1><p>Réglages propres à ${esc(state.tenant.name)}.</p></div></div><div class="settings-grid"><section class="card"><h2>Paramètres commerciaux</h2><form id="settingsForm" class="stack"><div class="field"><label>Nom affiché</label><input class="input" name="brand_name" value="${esc(s.brand_name||state.tenant.name)}"></div><div class="form-grid"><div class="field"><label>TVA (%)</label><input class="input" type="number" step="0.01" min="0" max="100" name="tax_rate" value="${esc(s.tax_rate??21)}"></div><div class="field"><label>Validité devis (jours)</label><input class="input" type="number" min="1" max="365" name="quote_validity_days" value="${esc(s.quote_validity_days??30)}"></div><div class="field"><label>Délai d'envoi devis (minutes)</label><input class="input" type="number" min="0" max="10080" name="quote_delay_minutes" value="${esc(s.quote_delay_minutes??35)}"></div><div class="field"><label>Commission par défaut (%)</label><input class="input" type="number" step="0.01" min="0" max="100" name="default_commission_rate" value="${esc(s.default_commission_rate??'')}"></div></div><button class="btn primary">Enregistrer</button></form></section><section class="card"><h2>Architecture des rôles</h2><p class="settings-note"><b>Super Admin JS-Innov.IA</b><br>Administration globale de la plateforme et des paramètres sensibles.</p><p class="settings-note"><b>Admin client</b><br>Gère ses tarifs, prospects, devis et opérations dans son propre espace.</p><p class="settings-note"><b>Commercial</b><br>Accès opérationnel limité à son périmètre commercial.</p><div class="notice">Les données sont isolées par organisation avec des politiques RLS côté base de données.</div></section></div>`; }

function render(){ let content; switch(state.tab){case'pipeline':content=pipelineView();break;case'leads':content=leadsView();break;case'quotes':content=quotesView();break;case'contracts':content=contractsView();break;case'payments':content=paymentsView();break;case'commissions':content=commissionsView();break;case'settings':content=settingsView();break;default:content=dashboard();} app.innerHTML=shell(content); bindShell(); bindActions(); }
function bindActions(){
  document.querySelector('#newLeadHero')?.addEventListener('click',openLeadModal);
  document.querySelectorAll('.stageSelect').forEach(x=>x.onchange=()=>updateLeadStage(x.dataset.id,x.value));
  document.querySelectorAll('.quoteBtn').forEach(x=>x.onclick=()=>openQuoteModal(x.dataset.id));
  document.querySelectorAll('.acceptQuote').forEach(x=>x.onclick=()=>acceptQuote(x.dataset.id,x.dataset.lead));
  document.querySelectorAll('.signContract').forEach(x=>x.onclick=()=>signContract(x.dataset.id,x.dataset.lead));
  document.querySelector('#newPayment')?.addEventListener('click',openPaymentModal);
  document.querySelector('#settingsForm')?.addEventListener('submit',saveSettings);
}
function modal(html){ const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal">${html}</div>`;wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});document.body.appendChild(wrap);return wrap; }
function openLeadModal(){ const m=modal(`<div class="modal-head"><h3>Nouveau prospect</h3><button class="btn ghost close">✕</button></div><form id="leadForm"><div class="form-grid"><div class="field"><label>Contact *</label><input class="input" name="contact_name" required></div><div class="field"><label>Entreprise</label><input class="input" name="company_name"></div><div class="field"><label>E-mail</label><input class="input" type="email" name="email"></div><div class="field"><label>Téléphone</label><input class="input" name="phone"></div><div class="field"><label>Source</label><input class="input" name="source" value="manuel"></div><div class="field"><label>Valeur estimée HTVA (€)</label><input class="input" type="number" step="0.01" min="0" name="value"></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes" rows="4"></textarea></div></div><div class="modal-actions"><button type="button" class="btn close">Annuler</button><button class="btn primary">Créer le prospect</button></div></form>`); m.querySelectorAll('.close').forEach(b=>b.onclick=()=>m.remove()); m.querySelector('#leadForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload={tenant_id:state.tenant.id,contact_name:f.get('contact_name'),company_name:f.get('company_name')||null,email:f.get('email')||null,phone:f.get('phone')||null,source:f.get('source')||'manual',notes:f.get('notes')||null,estimated_value_cents:Math.round(Number(f.get('value')||0)*100)};const {data,error}=await supabase.from('pilotya_leads').insert(payload).select().single();if(error)return toast(error.message);await logActivity(data.id,'Prospect créé',{reference:data.reference});m.remove();await refresh('Prospect créé');}; }
async function updateLeadStage(id,status){ const {error}=await supabase.from('pilotya_leads').update({status}).eq('id',id);if(error)return toast(error.message);await logActivity(id,'Étape modifiée',{status});await refresh('Étape mise à jour'); }
function openQuoteModal(leadId){ const lead=state.leads.find(l=>l.id===leadId);const s=state.settings||{};const m=modal(`<div class="modal-head"><h3>Créer un devis</h3><button class="btn ghost close">✕</button></div><form id="quoteForm" class="stack"><div class="notice">Prospect : ${esc(lead?.company_name||lead?.contact_name)}</div><div class="field"><label>Objet *</label><input class="input" name="title" value="Proposition commerciale" required></div><div class="form-grid"><div class="field"><label>Montant HTVA (€) *</label><input class="input" type="number" step="0.01" min="0" name="amount" value="${((lead?.estimated_value_cents||0)/100).toFixed(2)}" required></div><div class="field"><label>TVA (%)</label><input class="input" type="number" step="0.01" name="tax_rate" value="${s.tax_rate??21}"></div></div><div class="modal-actions"><button type="button" class="btn close">Annuler</button><button class="btn primary">Créer le devis</button></div></form>`);m.querySelectorAll('.close').forEach(b=>b.onclick=()=>m.remove());m.querySelector('#quoteForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const validity=new Date();validity.setDate(validity.getDate()+Number(s.quote_validity_days||30));const delay=Number(s.quote_delay_minutes||35);const scheduled=new Date(Date.now()+delay*60000).toISOString();const {data,error}=await supabase.from('pilotya_quotes').insert({tenant_id:state.tenant.id,lead_id:leadId,title:f.get('title'),amount_cents:Math.round(Number(f.get('amount'))*100),tax_rate:Number(f.get('tax_rate')||21),status:'brouillon',scheduled_send_at:scheduled,valid_until:validity.toISOString().slice(0,10)}).select().single();if(error)return toast(error.message);await supabase.from('pilotya_leads').update({status:'devis'}).eq('id',leadId);await logActivity(leadId,'Devis créé',{reference:data.reference});m.remove();state.tab='quotes';await refresh('Devis créé');}; }
async function acceptQuote(id,leadId){ const {error}=await supabase.from('pilotya_quotes').update({status:'accepte'}).eq('id',id);if(error)return toast(error.message);const {error:ce}=await supabase.from('pilotya_contracts').insert({tenant_id:state.tenant.id,lead_id:leadId,quote_id:id,status:'brouillon'});if(ce)return toast(ce.message);await supabase.from('pilotya_leads').update({status:'contrat'}).eq('id',leadId);await logActivity(leadId,'Devis accepté',{});state.tab='contracts';await refresh('Contrat créé automatiquement'); }
async function signContract(id,leadId){ const {error}=await supabase.from('pilotya_contracts').update({status:'signe',signed_at:new Date().toISOString()}).eq('id',id);if(error)return toast(error.message);await supabase.from('pilotya_leads').update({status:'signature'}).eq('id',leadId);await logActivity(leadId,'Contrat signé',{});await refresh('Contrat marqué comme signé'); }
function openPaymentModal(){ const m=modal(`<div class="modal-head"><h3>Enregistrer un paiement</h3><button class="btn ghost close">✕</button></div><form id="paymentForm" class="stack"><div class="field"><label>Prospect</label><select class="select" name="lead_id"><option value="">Non lié</option>${state.leads.map(l=>`<option value="${l.id}">${esc(l.reference)} · ${esc(l.company_name||l.contact_name)}</option>`).join('')}</select></div><div class="form-grid"><div class="field"><label>Montant (€) *</label><input class="input" type="number" min="0" step="0.01" name="amount" required></div><div class="field"><label>Statut</label><select class="select" name="status"><option value="paye">Payé</option><option value="en_attente">En attente</option></select></div></div><div class="field"><label>Référence</label><input class="input" name="reference"></div><div class="modal-actions"><button type="button" class="btn close">Annuler</button><button class="btn primary">Enregistrer</button></div></form>`);m.querySelectorAll('.close').forEach(b=>b.onclick=()=>m.remove());m.querySelector('#paymentForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const leadId=f.get('lead_id')||null;const status=f.get('status');const {error}=await supabase.from('pilotya_payments').insert({tenant_id:state.tenant.id,lead_id:leadId,amount_cents:Math.round(Number(f.get('amount'))*100),status,provider:'Manuel',provider_reference:f.get('reference')||null,paid_at:status==='paye'?new Date().toISOString():null});if(error)return toast(error.message);if(leadId&&status==='paye')await supabase.from('pilotya_leads').update({status:'paiement'}).eq('id',leadId);if(leadId)await logActivity(leadId,'Paiement enregistré',{status});m.remove();await refresh('Paiement enregistré');}; }
async function saveSettings(e){e.preventDefault();const f=new FormData(e.currentTarget);const payload={brand_name:f.get('brand_name'),tax_rate:Number(f.get('tax_rate')),quote_validity_days:Number(f.get('quote_validity_days')),quote_delay_minutes:Number(f.get('quote_delay_minutes')),default_commission_rate:f.get('default_commission_rate')===''?null:Number(f.get('default_commission_rate'))};const {error}=await supabase.from('pilotya_settings').update(payload).eq('tenant_id',state.tenant.id);if(error)return toast(error.message);await refresh('Paramètres enregistrés');}
async function logActivity(leadId,event_type,payload){await supabase.from('pilotya_activities').insert({tenant_id:state.tenant.id,lead_id:leadId,actor_user_id:state.user.id,event_type,payload});}
async function refresh(message){await loadAll();render();if(message)toast(message);}

supabase.auth.onAuthStateChange(async (_event,session)=>{state.session=session;state.user=session?.user||null;if(!session){authView();return;}await loadTenants();if(!state.tenant){workspaceSetupView();return;}await loadAll();render();});
bootstrap();
