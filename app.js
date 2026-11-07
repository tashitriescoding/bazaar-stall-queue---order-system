const BRAND={name:'Brew Bazaar',tag:'Matcha and hojicha, made to order',links:[['Instagram','https://instagram.com/'],['Facebook','https://facebook.com/'],['TikTok','https://tiktok.com/']]};
const PIN='1234'; // change before opening day
// Payment details shown when a customer picks GCash or Maya. Edit these, then upload your QR images
// (qr-gcash.png and qr-maya.png) next to index.html.
const PAY={
  GCash:{num:'09XX XXX XXXX',name:'Account Name',qr:'qr-gcash.png'},
  Maya:{num:'09XX XXX XXXX',name:'Account Name',qr:'qr-maya.png'}};
const EMAIL_ENABLED=true; // set false to hide the email option until email sending is set up
const MENU=[
{id:'m1',n:'Matcha Latte (Full Cream Milk)',p:195,c:'Matcha',img:'',d:1,g:'Matcha, full cream milk, blue agave'},
{id:'m2',n:'Matcha Latte (Oat Milk)',p:225,c:'Matcha',img:'',d:1,g:'Matcha, oat milk, blue agave'},
{id:'m3',n:'Seasalt Matcha',p:230,c:'Matcha',img:'',d:1,g:'Matcha, seasalt cream, vanilla'},
{id:'m4',n:'Strawberry Matcha',p:230,c:'Matcha',img:'',d:1,g:'Matcha, strawberry syrup, seasalt cream, vanilla'},
{id:'h1',n:'Hojicha Latte (Full Cream Milk)',p:160,c:'Hojicha',img:'',d:1,g:'Hojicha, Milklab milk, vanilla'},
{id:'h2',n:'Hojicha Latte (Oat Milk)',p:190,c:'Hojicha',img:'',d:1,g:'Hojicha, oat milk, vanilla'}];
// image slots: set img:'url' on a MENU item to fill its picture
const slot=u=>u?`<img src="${esc(u)}" alt="">`:'';
const SIZES=[['Regular',0]],SUGAR=['100%','50%','25%','0%'],ICE=['Regular ice','Less ice','No ice'];
const STEPS=[['new','Received'],['preparing','Preparing'],['ready','Ready'],['done','Picked up']];
const S={orders:[],sold:[],cat:'Matcha',cart:[],pay:'Cash',admin:false,q:'',fav:false,av:false};
const I={
 back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
 trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
 filter:'<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
 home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
 heart:'<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a5 5 0 0 1 8-3.5A5 5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
 bag:'<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M8 8h8M8 12h8"/></svg>',
 cart:'<svg viewBox="0 0 24 24"><path d="M3 4h2l2.5 11h10L20 7H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>'};
let dbc=null,mode='local';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const peso=n=>'₱'+n.toLocaleString();
const LS={r(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}},w(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const route=()=>location.hash.slice(1)||'menu';
const mine=()=>S.orders.find(o=>o.id===LS.r('bz_mine',null));
const FAV=()=>LS.r('bz_fav',[]);

/* ---------- data layer: Firebase (shared) -> Claude db -> this device only ---------- */
let QUEUE=[],OWN=null,FULL=[],fbUnsubs=[],curDay=null;
// Customers only ever see: the public queue (order numbers + status) and their own order.
// Staff (logged in with email) see every order.
function rebuild(){
  S.orders=S.admin&&mode==='firebase'?FULL:[...QUEUE.filter(q=>!OWN||q.id!==OWN.id),...(OWN?[OWN]:[])];
  refresh();
}
function listen(){
  const F=window.FB;fbUnsubs.forEach(u=>u());fbUnsubs=[];
  const err=e=>{console.error(e);S.fbErr=e.code||'error';refresh()};
  curDay=dk(Date.now());
  fbUnsubs.push(F.onSnapshot(F.query(F.collection(F.db,'queue'),F.where('day','==',curDay)),s=>{S.fbErr='';QUEUE=s.docs.map(d=>({...d.data(),id:d.id}));rebuild()},err));
  fbUnsubs.push(F.onSnapshot(F.doc(F.db,'settings','menu'),s=>{S.sold=s.exists()?(s.data().sold||[]):[];if(route()==='menu')render()},err));
  const id=LS.r('bz_mine',null);
  if(S.admin){fbUnsubs.push(F.onSnapshot(F.collection(F.db,'orders'),s=>{FULL=s.docs.map(d=>({...d.data(),id:d.id}));rebuild()},err))}
  else{FULL=[];if(id)fbUnsubs.push(F.onSnapshot(F.doc(F.db,'orders',id),s=>{OWN=s.exists()?{...s.data(),id:s.id}:null;rebuild()},err))}
  rebuild();
}
async function startFirebase(){
  mode='firebase';const F=window.FB;
  F.onAuthStateChanged(F.auth,u=>{
    if(!u){F.signInAnonymously(F.auth).catch(e=>{console.error(e);S.fbErr=e.code||'auth-error';render()});return}
    S.admin=!u.isAnonymous; // password login = staff (the database rules decide what staff may really do)
    listen();render();
  });
  setInterval(()=>{if(S.uid!==null&&dk(Date.now())!==curDay&&window.FB.auth.currentUser)listen()},60000);
  S.uid='';
}
async function initData(){
  const ok=await Promise.race([window.FBReady||Promise.resolve(false),new Promise(r=>setTimeout(()=>r(false),8000))]);
  if(ok&&window.FB)return startFirebase();
  try{if(window.claude)dbc=await Promise.race([claude.use('db'),new Promise(r=>setTimeout(()=>r(null),4000))])}catch(e){}
  if(dbc){mode='shared';
    dbc.collection('orders').onSnapshot(s=>{S.orders=s.docs.map(d=>({...d.data(),id:d.id}));refresh()},()=>{});
    dbc.doc('settings/menu').onSnapshot(s=>{S.sold=s.exists?(s.data().sold||[]):[];if(route()==='menu')render()},()=>{});
  }else{
    const load=()=>{S.orders=LS.r('bz_orders',[]);S.sold=LS.r('bz_sold',[]);refresh()};
    load();setInterval(load,3000);addEventListener('storage',load);
  }
}
async function saveOrder(o){
  if(mode==='firebase'){
    const F=window.FB,day=dk(o.t),cref=F.doc(F.db,'counters',day);
    o.day=day;o.uid=F.auth.currentUser.uid;
    // numbered inside a transaction so two customers can never get the same number
    await F.runTransaction(F.db,async tx=>{
      const c=await tx.get(cref);o.n=(c.exists()?c.data().n:0)+1;
      tx.set(cref,{n:o.n});
      tx.set(F.doc(F.db,'orders',o.id),o);
      tx.set(F.doc(F.db,'queue',o.id),{id:o.id,n:o.n,status:'new',t:o.t,day,uid:o.uid});
    });
  }else if(dbc)await dbc.doc('orders/'+o.id).set(o);
  else{S.orders.push(o);LS.w('bz_orders',S.orders)}
}
async function patchOrder(id,p){
  if(mode==='firebase'){
    try{const F=window.FB,b=F.writeBatch(F.db);b.update(F.doc(F.db,'orders',id),p);if(p.status)b.update(F.doc(F.db,'queue',id),{status:p.status});await b.commit()}
    catch(e){console.error(e);alert('Could not save that change ('+(e.code||'error')+').')}
  }else if(dbc)await dbc.doc('orders/'+id).update(p);
  else{const o=S.orders.find(x=>x.id===id);Object.assign(o,p);LS.w('bz_orders',S.orders);refresh()}
}
async function setSold(list){
  S.sold=list;
  try{
    if(mode==='firebase'){const F=window.FB;await F.setDoc(F.doc(F.db,'settings','menu'),{sold:list})}
    else if(dbc)await dbc.doc('settings/menu').set({sold:list});else LS.w('bz_sold',list);
  }catch(e){console.error(e);alert('Could not save sold-out list ('+(e.code||'error')+').')}
  render();
}
async function staffLogin(){
  try{await window.FB.signInWithEmailAndPassword(window.FB.auth,$('#se').value.trim(),$('#sp').value);unlock()}
  catch(e){alert('Login failed. Check the staff email and password.')}
}
function staffLogout(){S.admin=false;FULL=[];window.FB.signOut(window.FB.auth)}
let lastStatus=null;
let AC=null,lastN=null;const T0=document.title;
function setTitle(){const m=mine();document.title=!m||m.status==='done'||m.status==='void'?T0:m.status==='ready'?'🔔 #'+pad(m.n)+' READY':'#'+pad(m.n)+' · '+label(m.status)}
function unlock(){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();AC.resume&&AC.resume()}catch(e){}}
function beep(n=3){try{unlock();for(let i=0;i<n;i++){const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.frequency.value=i%2?880:1175;g.gain.value=.25;const t=AC.currentTime+i*.28;o.start(t);o.stop(t+.2)}}catch(e){}}
function ping(m){
  beep();try{navigator.vibrate&&navigator.vibrate([300,150,300,150,300])}catch(e){}
  try{if(window.Notification&&Notification.permission==='granted')new Notification(BRAND.name,{body:'Order #'+pad(m.n)+' is ready! Please pick it up.'})}catch(e){}
  const t=document.createElement('div');t.id='toast';
  t.innerHTML='<b>🔔 Order #'+pad(m.n)+' is ready!</b><div>Please head to the counter.</div><button class="chip" onclick="this.parentNode.remove()">Got it</button>';
  document.body.appendChild(t);setTitle();
}
function refresh(){
  const m=mine();
  if(m&&!window.__resc){window.__resc=1;if(!location.hash&&(m.status!=='done'||!m.rating))location.hash='order'}
  if(m&&lastStatus&&lastStatus!==m.status&&m.status==='ready')ping(m);
  lastStatus=m?m.status:null;
  setTitle();
  if(S.admin&&lastN!==null&&S.orders.length>lastN)beep(2);
  lastN=S.orders.length;
  updServing();
  const typing=['TEXTAREA','INPUT'].includes((document.activeElement||{}).tagName);
  if(route()!=='menu'&&route()!=='cart'&&!typing&&!(route()==='admin'&&!S.admin))render();
}

/* ---------- views ---------- */
function hdr(t,right){return `<div class="sh"><button class="ib" onclick="location.hash='menu'">${I.back}</button><h2>${t}</h2>${right||'<span class="ph"></span>'}</div>`}
function footer(){return `<div class="links">${BRAND.links.map(l=>`<a href="${l[1]}" target="_blank" rel="noopener">${l[0]}</a>`).join('')}</div><div class="sub c" style="padding-bottom:12px">Follow us for promos and bazaar schedules</div>`}
function cartTotal(){return S.cart.reduce((a,i)=>a+i.p*i.q,0)}
function cartCount(){return S.cart.reduce((a,i)=>a+i.q,0)}

function fav(id){
  const f=FAV(),x=f.indexOf(id);x<0?f.push(id):f.splice(x,1);LS.w('bz_fav',f);
  render();if($('#sheet').classList.contains('on')&&window.cur)drawSheet();
}
function card(i){
  const so=S.sold.includes(i.id),f=FAV().includes(i.id);
  return `<div class="pc ${so?'sold':''}" onclick="openItem('${i.id}')"><div class="plate">${slot(i.img)}${so?'<span class="so">Sold out</span>':''}</div><b>${i.n}</b><div class="sub">${esc(i.g||'')}</div><div class="pf"><span class="pr">${peso(i.p)}.00</span><button class="hrt ${f?'on':''}" onclick="event.stopPropagation();fav('${i.id}')">${f?'♥':'♡'}</button></div></div>`;
}
function gridHTML(){
  const q=S.q.trim().toLowerCase(),all=q||S.fav,F=FAV();
  let L=MENU.filter(i=>all?(!q||(i.n+' '+i.g).toLowerCase().includes(q)):i.c===S.cat);
  if(S.fav)L=L.filter(i=>F.includes(i.id));
  if(S.av)L=L.filter(i=>!S.sold.includes(i.id));
  return L.map(card).join('')||`<div class="card c sub" style="grid-column:1/-1;margin:0">${S.fav?'No favorites yet. Tap ♡ on a drink.':'Nothing found'}</div>`;
}
function grid(){const g=$('#grid');if(g)g.innerHTML=gridHTML()}
function nav(){
  const m=mine(),act=m&&m.status!=='done'&&m.status!=='void',n=cartCount();
  return `<nav class="nav"><button class="${S.fav?'':'on'}" onclick="S.fav=false;S.q='';render();scrollTo(0,0)">${I.home}</button><button class="fv ${S.fav?'on':''}" onclick="S.fav=!S.fav;render()">${I.heart}</button><button onclick="location.hash='order'">${I.bag}${act?'<u></u>':''}</button><button onclick="location.hash='cart'">${I.cart}${n?`<u>${n}</u>`:''}</button></nav>`;
}
function servingHTML(){
  const day=new Date().toDateString(),mm=mine(),T=S.orders.filter(o=>new Date(o.t).toDateString()===day);
  const by=s=>T.filter(o=>o.status===s).sort((a,b)=>a.n-b.n);
  const prep=by('preparing'),rdy=by('ready'),wait=by('new').length;
  const nums=(L,c)=>L.length?L.slice(0,8).map(o=>`<span class="n ${c} ${mm&&mm.id===o.id?'me':''}">#${pad(o.n)}</span>`).join('')+(L.length>8?`<span class="n">+${L.length-8}</span>`:''):'<span class="none">None</span>';
  return `<div class="srv" id="serving"><div class="sh2"><b><i class="dot"></i>Now serving</b><span>${wait?wait+' waiting':'No wait'}</span></div><div class="cols"><div class="col"><div class="lbl">Preparing</div><div class="nums">${nums(prep,'')}</div></div><div class="col"><div class="lbl">Ready for pickup</div><div class="nums">${nums(rdy,'rdy')}</div></div></div></div>`;
}
function updServing(){const e=$('#serving');if(e&&route()==='menu')e.outerHTML=servingHTML()}
function vMenu(){
  const cats=[...new Set(MENU.map(i=>i.c))],m=mine(),act=m&&m.status!=='done'&&m.status!=='void';
  return `<div class="mh"><div><div class="sub">${BRAND.tag}</div><h1>${BRAND.name}</h1></div><div class="av"></div></div>
  <div class="srch"><label class="sb">${I.search}<input id="q" placeholder="Search drinks" value="${esc(S.q)}" oninput="S.q=this.value;grid()"></label><button class="ib ${S.av?'on':''}" title="Hide sold out" onclick="S.av=!S.av;render()">${I.filter}</button></div>
  <div class="cats">${cats.map(c=>`<button class="cat ${c===S.cat&&!S.q&&!S.fav?'on':''}" onclick="S.cat='${c}';S.q='';S.fav=false;render()"><i></i>${c}</button>`).join('')}</div>`+
  (act?`<div class="card" onclick="location.hash='order'" style="cursor:pointer;margin-top:0"><div class="row"><span>Your order <b>#${pad(m.n)}</b> · ${label(m.status)}</span><b>View →</b></div></div>`:'')+
  servingHTML()+`<div class="grid" id="grid">${gridHTML()}</div>`+footer()+
  (mode==='local'?'<div class="note">Demo mode: orders stay on this device</div>':'')+(S.fbErr?'<div class="note">Connection problem ('+esc(S.fbErr)+'). Please tell the staff.</div>':'')+nav();
}
const ADDONS=[];
function openItem(id){const it=MENU.find(i=>i.id===id);window.cur={it,size:0,sugar:1,ice:0,q:1,add:[],note:''};drawSheet();$('#sheet').classList.add('on')}
function sv(){const n=$('#nt');if(n)cur.note=n.value}
function sel(k,i){sv();cur[k]=i;drawSheet()}
function tg(i){sv();const a=cur.add,x=a.indexOf(i);x<0?a.push(i):a.splice(x,1);drawSheet()}
function cp(){const {it,size,add}=cur;return it.p+(it.d?SIZES[size][1]+add.reduce((a,i)=>a+ADDONS[i][1],0):0)}
function pick(arr,k,c){return `<div class="chips">${arr.map((a,i)=>{const [l,p]=Array.isArray(a)?a:[a,0];return `<button class="chip ${i===c?'on':''}" onclick="sel('${k}',${i})">${l}${p?` <span style="opacity:.8">+₱${p}.00</span>`:''}</button>`}).join('')}</div>`}
function drawSheet(){
  const {it,q,add,note}=cur,f=FAV().includes(it.id),lab=(t,h)=>`<div class="g"><b>${t}</b> <span class="sub">${h}</span></div>`;
  $('#sheet').innerHTML=`<div><div class="hero"><button class="ib back" onclick="closeSheet()">${I.back}</button><button class="ib hr" style="${f?'color:var(--acc)':''}" onclick="sv();fav('${it.id}')">${f?'♥':'♡'}</button><div class="bp">${slot(it.img)}</div></div>
  <div class="panel"><div class="row" style="padding-top:0"><span class="tag">${it.c}</span><span class="qp"><button onclick="sv();cur.q=Math.max(1,cur.q-1);drawSheet()">−</button><b>${String(q).padStart(2,'0')}</b><button onclick="sv();cur.q++;drawSheet()">+</button></span></div>
  <h2 class="iname">${it.n}</h2><div class="sub">${esc(it.g||'')}</div>
  ${it.d?lab('Sugar','Pick one')+pick(SUGAR,'sugar',cur.sugar)+lab('Ice','Pick one')+pick(ICE,'ice',cur.ice)+(ADDONS.length?lab('Add-ons','Optional'):'')+ADDONS.map((a,i)=>`<div class="ad"><div>${a[0]}<br><span class="pr">+₱${a[1]}.00</span></div><button class="chip" onclick="tg(${i})">${add.includes(i)?'✓ Added':'+ Add'}</button></div>`).join(''):''}
  ${lab('Notes','Optional')}<textarea id="nt" rows="2" placeholder="e.g. No ice, sauce on the side">${esc(note)}</textarea></div>
  <div class="foot"><div><div class="sub">Total price</div><div class="price">${peso(cp()*q)}.00</div></div><button class="btn" onclick="sv();addCart()">Add to order →</button></div></div>`;
}
function closeSheet(){$('#sheet').classList.remove('on')}
function addCart(){
  const {it,size,sugar,ice,q,add,note}=cur,parts=it.d?[SUGAR[sugar]+' sugar',ICE[ice],...add.map(i=>'+ '+ADDONS[i][0])]:[];
  if(note.trim())parts.push('“'+note.trim()+'”');
  const opt=parts.join(' · '),p=cp(),key=it.id+opt,ex=S.cart.find(x=>x.k===key);
  if(ex)ex.q+=q;else S.cart.push({k:key,n:it.n,opt,p,q,img:it.img});
  closeSheet();render();
}
function vCart(){
  const t=cartTotal(),n=cartCount();
  const tr=`<button class="ib" onclick="if(S.cart.length&&confirm('Clear your cart?')){S.cart=[];render()}">${I.trash}</button>`;
  return hdr('',tr)+`<h2 class="ttl">My<br><span>Cart List</span></h2>`+
  (S.cart.length?S.cart.map((i,x)=>`<div class="ci"><div class="plate sm">${slot(i.img)}</div><div class="cn"><b>${i.n}</b><div class="sub">${esc(i.opt)}</div><div class="pr">${peso(i.p)}.00 <span class="sub">x${i.q}</span></div></div><div class="vs"><button onclick="qty(${x},1)">+</button><button onclick="qty(${x},-1)">−</button></div></div>`).join('')+
  `<div class="c" style="margin:6px 0 4px"><button class="chip" onclick="keepName();location.hash='menu'">+ Add more items</button></div>
  <div class="card"><b>Name for your order</b><input id="nm" placeholder="Nickname" maxlength="24" value="${esc(LS.r('bz_name',''))}" style="margin:6px 0 12px"><b>Table / spot</b> <span class="sub">Optional</span><input id="tb" placeholder="e.g. Table 12" maxlength="16" value="${esc(S.tb||'')}" style="margin:6px 0 12px">${EMAIL_ENABLED?`<b>Email</b> <span class="sub">Optional</span><input id="em" type="email" inputmode="email" placeholder="you@example.com" maxlength="80" value="${esc(LS.r('bz_email',''))}" style="margin:6px 0 6px"><div class="sub" style="margin-bottom:12px">Add your email and we’ll message you when your order is ready. No email? No problem: keep this site open and check your browser tab. It shows your order number and status, and changes when your order is being served.</div>`:''}
   <b>Payment</b><div class="chips">${['Cash','GCash','Maya'].map(p=>`<button class="chip ${S.pay===p?'on':''}" onclick="S.pay='${p}';keepName();render()">${p}</button>`).join('')}</div>
   ${S.pay==='Cash'?'<div class="sub">Pay at the counter when your number is called.</div>':payHTML(S.pay,t)}</div>
  <div class="card"><div class="row"><span class="sub">Items</span><b>${n}</b></div><div class="row"><span class="sub">Subtotal</span><b>${peso(t)}.00</b></div><div class="row"><span class="sub">Payment</span><b>${S.pay}</b></div><div class="dash"></div><div class="row"><b>Total</b><span class="tot">${peso(t)}.00</span></div></div>
  <div class="bar"><button class="btn lime" onclick="place()">Place order · ${peso(t)} &nbsp;→</button></div>`
  :`<div class="card c">Your cart is empty.<br><br><button class="btn" onclick="location.hash='menu'">Browse menu</button></div>`);
}
function qty(x,d){S.cart[x].q+=d;if(S.cart[x].q<1)S.cart.splice(x,1);render()}
function payHTML(method,amount){
  const p=PAY[method];if(!p)return '';
  return `<div class="pay"><div class="sub">Pay exactly <b>${peso(amount)}</b> with ${method}</div><img class="qr" src="${esc(p.qr)}" alt="${method} QR code" onerror="this.style.display='none'"><div class="row"><div><div class="sub">${method} number</div><b class="pn">${esc(p.num)}</b><div class="sub">${esc(p.name)}</div></div><button class="chip" onclick="copyNum('${method}',this)">Copy number</button></div><div class="sub">Scan the QR or copy the number, pay in your ${method} app, then show the confirmation at the counter. Staff will mark your order as paid.</div></div>`;
}
function copyNum(m,b){try{navigator.clipboard.writeText(PAY[m].num.replace(/\s/g,''));b.textContent='Copied'}catch(e){b.textContent='Copy failed'}}
function keepName(){const e=$('#nm');if(e)LS.w('bz_name',e.value);const t=$('#tb');if(t)S.tb=t.value;const em=$('#em');if(em)LS.w('bz_email',em.value)}
const mkCode=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ',r=n=>Array.from({length:n},()=>A[Math.random()*A.length|0]).join('');return r(3)+'-'+r(6)};
async function place(){
  unlock();try{window.Notification&&Notification.permission==='default'&&Notification.requestPermission()}catch(e){}
  const name=($('#nm').value||'').trim()||'Guest';LS.w('bz_name',name);
  const em=EMAIL_ENABLED&&$('#em')?$('#em').value.trim():'';
  if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){alert('That email doesn’t look right. Fix it or leave it blank.');return}
  LS.w('bz_email',em);
  const day=new Date().toDateString(),today=S.orders.filter(o=>new Date(o.t).toDateString()===day);
  const n=today.reduce((a,o)=>Math.max(a,o.n),0)+1;
  const o={id:'o'+Date.now(),n,name,items:S.cart.map(i=>({n:i.n,opt:i.opt,q:i.q,p:i.p})),total:cartTotal(),pay:S.pay,paid:false,status:'new',code:mkCode(),table:($('#tb').value||'').trim(),email:em,t:Date.now()};
  try{await saveOrder(o)}catch(e){console.error(e);alert('Could not place the order. Please tell the staff.');return}
  LS.w('bz_mine',o.id);S.cart=[];if(mode==='firebase'){OWN=o;listen()}location.hash='order';
}
const pad=n=>String(n).padStart(3,'0');
const label=s=>(STEPS.find(x=>x[0]===s)||['','Cancelled'])[1];
function vOrder(){
  const m=mine();
  if(!m)return hdr('Order status')+`<div class="card c">No active order found on this phone.<br><br><button class="btn" onclick="location.hash='menu'">Start an order</button></div>`;
  if(m.status==='void')return hdr('Order status')+`<div class="card c"><b>Your order was cancelled.</b><br><br><button class="btn" onclick="LS.w('bz_mine',null);location.hash='menu'">Back to menu</button></div>`;
  const live=S.orders.filter(o=>o.status==='new'||o.status==='preparing').sort((a,b)=>a.n-b.n);
  const serving=(live.find(o=>o.status==='preparing')||live[0]),ahead=live.filter(o=>o.n<m.n).length;
  const idx=STEPS.findIndex(s=>s[0]===m.status);
  return hdr('Order status')+`<div class="card"><i class="sph a"></i><i class="sph b"></i><h2 class="c" style="margin:4px 0 10px">${m.status==='ready'?'Come and get it!':m.status==='done'?'All done.':m.paid?'Paid. We’re on it.':'Order in. We’re on it.'}</h2><div class="sub c">Order number</div><div class="big">#${pad(m.n)}</div><div class="code">${esc(m.code||'')}</div>${m.table?`<div class="c sub">We’ll bring it to ${esc(m.table)}</div>`:''}
   <div class="steps">${STEPS.map((s,i)=>`<div class="st ${i<=idx?'on':''}"><i>${i<idx?'✓':i+1}</i>${s[1]}</div>`).join('')}</div>
   <div class="c" style="margin-top:12px">${m.status==='ready'?'<b>Your drink is ready! Head to the counter.</b>':m.status==='done'?'Enjoy your order!':m.status==='preparing'?'We’re making your order now.':ahead?`${ahead} order${ahead>1?'s':''} ahead of you`:'You’re next!'}</div>
   ${serving&&m.status!=='done'?`<div class="sub c" style="margin-top:6px">Now serving #${pad(serving.n)}</div>`:''}</div>
  ${m.pay!=='Cash'&&!m.paid&&m.status!=='done'?`<div class="card"><b>Pay with ${m.pay}</b>${payHTML(m.pay,m.total)}</div>`:''}
  <div class="card"><b>Order for ${esc(m.name)}</b>${m.items.map(i=>`<div class="row"><span>${i.q}× ${esc(i.n)}<div class="sub">${esc(i.opt)}</div></span><span>${peso(i.p*i.q)}</span></div>`).join('')}
   <div class="dash"></div><div class="row"><b>Total · ${m.pay}</b><b>${peso(m.total)}</b></div></div>`+
  (m.status==='done'?review(m):`<div class="card"><button class="btn alt" onclick="location.hash='menu'">Browse the menu while you wait</button><div class="sub c" style="margin-top:8px">${m.email?'We’ll email '+esc(m.email)+' when your order is ready. You can also keep this page open and you’ll hear a ping here.':'No email on this order, so keep this site open and check the browser tab. It shows your order number and status, and you’ll hear a ping when it’s ready.'}</div></div>`)+footer();
}
function review(m){
  if(m.rating)return `<div class="card c"><b>Thanks for the ${m.rating}★ review!</b><br><br><button class="btn" onclick="LS.w('bz_mine',null);location.hash='menu'">Order again</button></div>`;
  return `<div class="card c"><b>How was your order?</b><div class="stars">${[1,2,3,4,5].map(i=>`<button class="${(window.rt||0)>=i?'on':''}" onclick="rt=${i};render()">★</button>`).join('')}</div>
  <textarea id="cm" rows="2" placeholder="Anything to share? (optional)"></textarea><button class="btn" style="margin-top:10px" onclick="sendReview('${m.id}')">Submit review</button></div>`;
}
async function sendReview(id){if(!window.rt)return alert('Tap a star first');await patchOrder(id,{rating:rt,comment:($('#cm').value||'').trim()});window.rt=0}

/* ---------- admin ---------- */
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago'};
const dk=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const nice=d=>new Date(d+'T00:00').toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
function board(active){
  const cols=[['new','🆕 New orders'],['preparing','🥤 Preparing'],['ready','🔔 Ready for pickup']];
  const act={new:['Start preparing','preparing'],preparing:['Mark READY · pings customer','ready'],ready:['Picked up ✓','done']},back={preparing:'new',ready:'preparing'};
  return cols.map(([st,t])=>{const L=active.filter(o=>o.status===st);
    return `<div class="sec"><h2>${t} (${L.length})</h2></div>`+(L.map(o=>`<div class="card"><div class="row"><b style="font-size:20px">#${pad(o.n)} ${esc(o.name)}</b><span class="sub">${o.table?esc(o.table)+' · ':''}${ago(o.t)}</span></div>${o.email?`<div class="sub">Email: ${esc(o.email)}</div>`:''}
    ${o.items.map(i=>`<div><b>${i.q}×</b> ${esc(i.n)}<div class="sub">${esc(i.opt)}</div></div>`).join('')}
    <div class="row"><span>${peso(o.total)} · ${o.pay}</span><button class="chip" onclick="patchOrder('${o.id}',{paid:${!o.paid}})">${o.paid?'✓ Paid':'Mark paid'}</button></div>
    <button class="btn" onclick="patchOrder('${o.id}',{status:'${act[st][1]}'})">${act[st][0]}</button>
    <div class="row">${back[st]?`<button class="chip" onclick="patchOrder('${o.id}',{status:'${back[st]}'})">← Back</button>`:'<span></span>'}<button class="chip" onclick="if(confirm('Void this order?'))patchOrder('${o.id}',{status:'void'})">Void</button></div></div>`).join('')||'<div class="card c sub">None</div>')}).join('');
}
function vAdmin(){
  if(!S.admin&&mode==='firebase')return hdr('Staff')+`<div class="card"><b>Staff login</b><input id="se" type="email" autocomplete="username" placeholder="Staff email" style="margin:8px 0"><input id="sp" type="password" autocomplete="current-password" placeholder="Password" style="margin:0 0 8px" onkeydown="if(event.key==='Enter')staffLogin()"><button class="btn" onclick="staffLogin()">Log in</button></div>`;
  if(!S.admin)return hdr('Staff')+`<div class="card"><b>Staff PIN</b><input id="pin" type="password" inputmode="numeric" style="margin:8px 0"><button class="btn" onclick="if($('#pin').value===PIN){S.admin=true;unlock();render()}else alert('Wrong PIN')">Enter</button></div>`;
  const O=[...S.orders].sort((a,b)=>b.t-a.t),active=O.filter(o=>o.status!=='done'&&o.status!=='void').reverse();
  const day=S.day||dk(Date.now()),isToday=day===dk(Date.now()),D=O.filter(o=>dk(o.t)===day);
  const paid=D.filter(o=>o.status!=='void'),rev=paid.reduce((a,o)=>a+o.total,0),rv=D.filter(o=>o.rating);
  const avg=rv.length?(rv.reduce((a,o)=>a+o.rating,0)/rv.length).toFixed(1):'–';
  const cnt={};paid.forEach(o=>o.items.forEach(i=>cnt[i.n]=(cnt[i.n]||0)+i.q));
  const topI=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]+' ('+x[1]+')').join(', ')||'–';
  const hrs={};paid.forEach(o=>{const h=new Date(o.t).getHours();hrs[h]=(hrs[h]||0)+1});
  const peak=Object.entries(hrs).sort((a,b)=>b[1]-a[1])[0];
  const by=p=>paid.filter(o=>o.pay===p).length;
  return hdr('Staff',mode==='firebase'?'<button class="chip" onclick="staffLogout()">Log out</button>':'')+`<div class="card"><div class="row" style="padding-top:0"><b>${isToday?'Today so far':'Sales for '+nice(day)}</b><span><input type="date" id="dy" value="${day}" onchange="S.day=this.value;this.blur();render()" style="width:auto;padding:6px 8px">${isToday?'':` <button class="chip" onclick="S.day='';render()">Today</button>`}</span></div><div class="sub" style="margin-bottom:6px">Totals start fresh each new date. Pick another date to look at past days.</div><div class="row"><span>Revenue</span><b>${peso(rev)}</b></div><div class="row"><span>Orders · avg</span><b>${paid.length} · ${peso(paid.length?Math.round(rev/paid.length):0)}</b></div>
   <div class="row"><span>Cash / GCash / Maya</span><b>${by('Cash')} / ${by('GCash')} / ${by('Maya')}</b></div><div class="row"><span>Rating</span><b>${avg}★ (${rv.length})</b></div>
   <div class="row"><span>Peak hour</span><b>${peak?peak[0]+':00 ('+peak[1]+' orders)':'–'}</b></div><div class="sub">Top: ${esc(topI)}</div></div>
  ${board(active)}<div class="sec"><h2>Sold-out toggles</h2></div><div class="card"><div class="chips">${MENU.map(i=>`<button class="chip ${S.sold.includes(i.id)?'on':''}" onclick="setSold(S.sold.includes('${i.id}')?S.sold.filter(x=>x!=='${i.id}'):[...S.sold,'${i.id}'])">${i.n}</button>`).join('')}</div><div class="sub">Highlighted = sold out</div></div>
  <div class="sec"><h2>Reviews</h2></div>`+(rv.map(o=>`<div class="card"><b>${o.rating}★ · ${esc(o.name)}</b> <span class="sub">#${pad(o.n)}</span><div>${esc(o.comment||'')}</div></div>`).join('')||'<div class="card c sub">No reviews yet</div>');
}

function render(){
  const r=route(),a=$('#app');setTitle();
  a.innerHTML=r==='cart'?vCart():r==='order'?vOrder():r==='admin'?vAdmin():vMenu();
  const mm=mine();
  if(r==='order'&&mm&&mm.status!=='done'&&mm.status!=='void')a.insertAdjacentHTML('beforeend',`<div class="stat ${mm.status==='ready'?'rdy':''}">${mm.status==='ready'?'🔔 YOUR ORDER IS READY':'🥤 WE’RE PREPARING YOUR ORDER'}</div>`);
}
addEventListener('hashchange',()=>{render();scrollTo(0,0)});
(async()=>{
  render();await initData();
  // Rescan: opening the plain link with an active order jumps straight to its queue status
  const m=mine();if(!location.hash&&m&&m.status!=='done')location.hash='order';
  else if(!location.hash&&m&&m.status==='done'&&!m.rating)location.hash='order';
  render();
})();
