'use client';
import {useEffect,useState} from 'react';
import {Beer,Users,MapPin,MessageCircle,PartyPopper,Plus,LogIn,LogOut,Shuffle,CalendarDays,Check,ArrowLeft,Send} from 'lucide-react';
import {supabase,configured} from '../lib/supabase';
type Group={id:string,name:string,join_code:string};
type Venue={id:string,name:string,area:string,beer_price:number|null,open_note:string};
type Invite={id:string,host_id:string,venue_id:string|null,venue_name:string,event_at:string,message:string,group_id:string};
const demoVenues:Venue[]=[{id:'demo1',name:'Bar Central',area:'Norrmalm',beer_price:59,open_note:'Kontrollera öppettider'},{id:'demo2',name:'Söderhörnan',area:'Södermalm',beer_price:49,open_note:'Kontrollera öppettider'},{id:'demo3',name:'Brygghuset',area:'Kungsholmen',beer_price:65,open_note:'Kontrollera öppettider'}];
export default function Home(){
 const [user,setUser]=useState<any>(null),[groups,setGroups]=useState<Group[]>([]),[group,setGroup]=useState<Group|null>(null),[venues,setVenues]=useState<Venue[]>(demoVenues),[invites,setInvites]=useState<Invite[]>([]),[messages,setMessages]=useState<any[]>([]),[view,setView]=useState('home'),[groupName,setGroupName]=useState(''),[joinCode,setJoinCode]=useState(''),[venue,setVenue]=useState('Bar Central'),[when,setWhen]=useState(''),[message,setMessage]=useState('Det ryktas om kalla öl och ännu kallare skämt. Häng med!'),[chat,setChat]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState<Invite|null>(null),[rsvps,setRsvps]=useState<any[]>([]),[confetti,setConfetti]=useState(false);
 const demo=!configured;
 useEffect(()=>{if(!supabase)return;supabase.auth.getUser().then(({data})=>setUser(data.user));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!supabase||!user)return;loadGroups();loadVenues();const params=new URLSearchParams(location.search);const code=params.get('join');if(code)setJoinCode(code)},[user]);

useEffect(() => {
  const client = supabase;
  if (!client || !group) return;

  loadGroup();

  const channel = client
    .channel('group-' + group.id)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: 'group_id=eq.' + group.id
    }, () => loadGroup())
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'invitations',
      filter: 'group_id=eq.' + group.id
    }, () => loadGroup())
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}, [group]);
 async function loadGroups(){const {data}=await supabase!.from('group_members').select('groups(id,name,join_code)').eq('user_id',user.id);setGroups((data??[]).flatMap((x:any)=>x.groups?[x.groups]:[]))}
 async function loadVenues(){const {data}=await supabase!.from('venues').select('*').order('name');if(data?.length)setVenues(data)}
 async function loadGroup(){if(!group)return;const [m,i]=await Promise.all([supabase!.from('messages').select('*,profiles(display_name)').eq('group_id',group.id).order('created_at'),supabase!.from('invitations').select('*').eq('group_id',group.id).order('event_at',{ascending:false})]);setMessages(m.data??[]);setInvites(i.data??[])}
 async function login(){if(!supabase){setNotice('Demoläge: konfigurera Supabase för Google-inloggning.');return}await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}})}
 async function createGroup(){if(!user||!groupName.trim())return;const {data,error}=await supabase!.from('groups').insert({name:groupName.trim(),owner_id:user.id}).select().single();if(error||!data){setNotice(error?.message||'Kunde inte skapa grupp');return}await supabase!.from('group_members').insert({group_id:data.id,user_id:user.id});setGroupName('');await loadGroups();setGroup(data);setView('group')}
 async function joinGroup(){if(!user||!joinCode.trim())return;const {data,error}=await supabase!.rpc('join_group_by_code',{code:joinCode.trim()});if(error){setNotice(error.message);return}await loadGroups();setNotice('Du är med i gruppen!');setJoinCode('');if(data){const {data:g}=await supabase!.from('groups').select('*').eq('id',data).single();if(g){setGroup(g);setView('group')}}}
 async function sendChat(){if(!chat.trim()||!group||!user)return;const {error}=await supabase!.from('messages').insert({group_id:group.id,user_id:user.id,body:chat.trim()});if(error)setNotice(error.message);else{setChat('');loadGroup()}}
 async function sendInvite(){if(!group||!user||!when)return;const {error}=await supabase!.from('invitations').insert({group_id:group.id,host_id:user.id,venue_name:venue,event_at:new Date(when).toISOString(),message});if(error){setNotice(error.message);return}setView('group');setNotice('Inbjudan skapad! E-postutskick kräver serverfunktion och mejltjänst.');loadGroup()}
 async function openInvite(i:Invite){setSelected(i);setView('invite');setConfetti(true);setTimeout(()=>setConfetti(false),3000);if(supabase){const {data}=await supabase.from('rsvps').select('*').eq('invitation_id',i.id);setRsvps(data??[])}}
 async function respond(answer:'yes'|'no'){if(!selected||!user)return;const {error}=await supabase!.from('rsvps').upsert({invitation_id:selected.id,user_id:user.id,response:answer},{onConflict:'invitation_id,user_id'});if(error)setNotice(error.message);else openInvite(selected)}
 const mine=rsvps.find(x=>x.user_id===user?.id)?.response;
 return <main><header><div className="brand" onClick={()=>setView('home')}>AW<span>-dags</span> 🍻</div><div className="topright"><span className="beta">PRIVAT BETA</span>{user?<button className="quiet" onClick={()=>supabase?.auth.signOut()}><LogOut size={16}/> Logga ut</button>:<button className="quiet" onClick={login}><LogIn size={16}/> Logga in med Google</button>}</div></header>
 <div className="shell">{notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} ×</div>}{demo&&<div className="notice">Förhandsvisning: koppla Supabase enligt README för att aktivera konton och lagring.</div>}
 {view==='home'&&<><section className="hero"><div className="eyebrow">FÄRRE KANSKE. FLER AW.</div><h1>Det är alltid <em>AW-dags.</em></h1><p>Hitta en billig öl. Samla gänget. Skicka världens bästa AW-inbjudan.</p><button className="primary" onClick={()=>user?setView('create'):login()}><PartyPopper size={19}/> Jag vill bjuda in till AW</button></section><div className="sectiontitle"><h2>Dina grupper</h2><button onClick={()=>setView('groups')}><Plus size={16}/> Ny grupp / gå med</button></div><div className="cards">{groups.map(g=><article className="card clickable" key={g.id} onClick={()=>{setGroup(g);setView('group')}}><Users/><h3>{g.name}</h3><p>Öppna gruppen →</p></article>)}{!groups.length&&<article className="card"><Users/><h3>Här börjar festen</h3><p>Skapa en grupp eller bli inbjuden till en.</p><button onClick={()=>setView('groups')}>Kom igång</button></article>}</div><div className="sectiontitle"><h2>Ölradarn 🍺</h2><span className="muted">Stockholm · Priser behöver verifieras</span></div><div className="cards">{venues.map(v=><article className="card" key={v.id}><div className="venueicon">🍺</div><h3>{v.name}</h3><p><MapPin size={14}/> {v.area}</p><strong>{v.beer_price===null?'Pris saknas':`${v.beer_price} kr*`}</strong><small>{v.open_note}</small></article>)}</div><p className="footnote">*Exempelpriser i förhandsvisningen, inte verifierade aktuella barpriser. Livepriser och öppettider tillkommer.</p></>}
 {view==='groups'&&<><button className="back" onClick={()=>setView('home')}><ArrowLeft size={16}/> Tillbaka</button><h1>Samla gänget.</h1><div className="twocol"><div className="panel"><h2>Skapa grupp</h2><p>En privat plats för alla era AW:s.</p><input placeholder="T.ex. Fredagsölen" value={groupName} onChange={e=>setGroupName(e.target.value)}/><button className="primary" disabled={!user} onClick={createGroup}>Skapa grupp</button></div><div className="panel"><h2>Har du en inbjudningskod?</h2><p>Klistra in koden du fått av en vän.</p><input placeholder="Inbjudningskod" value={joinCode} onChange={e=>setJoinCode(e.target.value)}/><button disabled={!user} onClick={joinGroup}>Gå med</button></div></div></>}
 {view==='group'&&group&&<><button className="back" onClick={()=>setView('home')}><ArrowLeft size={16}/> Alla grupper</button><div className="sectiontitle"><div><div className="eyebrow">DIN AW-GRUPP</div><h1>{group.name}</h1></div><button className="primary" onClick={()=>setView('create')}><Plus size={17}/> Bjud in till AW</button></div><div className="panel"><h3>Bjud in till gruppen</h3><p>Dela länken med någon du vill ha med.</p><div className="inline"><code>{typeof window!=='undefined'?location.origin+'/?join='+group.join_code:group.join_code}</code><button onClick={()=>navigator.clipboard.writeText(location.origin+'/?join='+group.join_code)}>Kopiera</button></div></div><div className="twocol"><div className="panel"><h2>Kommande AW:s 🎉</h2>{invites.length?invites.map(i=><div className="event clickable" key={i.id} onClick={()=>openInvite(i)}><b>{i.venue_name}</b><small>{new Date(i.event_at).toLocaleString('sv-SE',{dateStyle:'medium',timeStyle:'short'})}</small><span>Öppna inbjudan →</span></div>):<p>Ingen AW planerad ännu. Du vet vad du ska göra.</p>}</div><div className="panel"><h2><MessageCircle size={20}/> Gruppchatten</h2><div className="chat">{messages.map(m=><div className="bubble" key={m.id}><small>{m.profiles?.display_name||'Medlem'}</small><div>{m.body}</div></div>)}{!messages.length&&<p>Här är det misstänkt tyst…</p>}</div><div className="inline"><input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Skriv något…"/><button onClick={sendChat}><Send size={17}/></button></div></div></div></>}
 {view==='create'&&<><button className="back" onClick={()=>setView(group?'group':'home')}><ArrowLeft size={16}/> Tillbaka</button><div className="panel form"><div className="eyebrow">NU HÄNDER DET</div><h1>Jag vill bjuda in till AW! 🎉</h1>{!group?<><p>Välj först en grupp.</p>{groups.map(g=><button key={g.id} onClick={()=>setGroup(g)}>{g.name}</button>)}<button onClick={()=>setView('groups')}>Skapa grupp</button></>:<><label>Vilken grupp?</label><strong>{group.name}</strong><label>Var?</label><select value={venue} onChange={e=>setVenue(e.target.value)}>{venues.map(v=><option key={v.id}>{v.name}</option>)}</select><label>När?</label><input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/><label>Din inbjudningstext</label><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4}/><button className="primary" onClick={sendInvite} disabled={!when}><PartyPopper size={18}/> Skapa AW-inbjudan!</button></>}</div></>}
 {view==='invite'&&selected&&<><button className="back" onClick={()=>setView('group')}><ArrowLeft size={16}/> Till gruppen</button><div className="invitation">{confetti&&<div className="confetti" aria-hidden="true">🎉 🎊 ✨ 🍻 🎉 ✨ 🎊 🎉</div>}<div className="bigemoji">🎊 🍻 🎉</div><div className="eyebrow">DU ÄR BJUDEN!</div><h1>VI HAR EN AW!</h1><h2>{selected.host_id===user?.id?'Du bjuder in': 'Någon i gänget bjuder in'} till AW!</h2><p>{selected.message}</p><div className="eventinfo"><div><MapPin size={18}/> {selected.venue_name}</div><div><CalendarDays size={18}/> {new Date(selected.event_at).toLocaleString('sv-SE',{dateStyle:'full',timeStyle:'short'})}</div></div><h3>Kan du komma?</h3><div className="answer"><button className={mine==='yes'?'activeyes':''} onClick={()=>respond('yes')}><Check size={18}/> JA! 🍻</button><button className={mine==='no'?'activeno':''} onClick={()=>respond('no')}>Nej 😢</button></div><p className="muted">{rsvps.filter(r=>r.response==='yes').length} kommer · {rsvps.filter(r=>r.response==='no').length} kan inte</p></div></>}
 </div><footer>AW-dags © 2026 · Byggd för fredagar, men funkar alla dagar.</footer></main>
}
