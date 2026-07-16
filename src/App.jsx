import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { CANDIDATES as STATIC_CANDIDATES } from "./candidates.js"

const firebaseConfig = {
  apiKey: "AIzaSyAwb6ozidFs6_LFW0ktj8oBDAcAFJpe7Ag",
  authDomain: "kings-voting2026.firebaseapp.com",
  projectId: "kings-voting2026",
  storageBucket: "kings-voting2026.firebasestorage.app",
  messagingSenderId: "708043016849",
  appId: "1:708043016849:web:e658aa9b22286016c20d30"
};
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const ADMIN_PASSWORD = "horeb2026"

export default function App() {
  const [studentId, setStudentId] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [selections, setSelections] = useState({})
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPass, setAdminPass] = useState("")
  const [votesData, setVotesData] = useState([])
  const [candidates] = useState(STATIC_CANDIDATES)
  const timerRef = useRef(null)
  
  // Keep official order from Google Form
  const positionOrder = [
    "PRESIDENT",
    "VICE PRESIDENT",
    "LITURGY MINISTER",
    "VICE LITURGY MINISTER",
    "ACADEMIC AND VOCATIONAL MINISTER",
    "HEALTH MINISTER",
    "EVENT MINISTER",
    "MEDIA AND COMMUNICATION MINISTER",
    "CAFETERIA MINISTER",
    "ASSISTANT CAFETERIA MINISTER",
    "UNIFORM MINISTER",
    "TIME KEEPER",
    "SPORTS MINISTER",
    "ENVIRONMENT MINISTER"
  ]
  const positions = positionOrder.filter(p => candidates.some(c => c.position === p))

  const resetTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { handleLogout(); }, 5*60*1000) }
  useEffect(()=>{ if(loggedIn){ resetTimer(); window.addEventListener('mousemove', resetTimer); window.addEventListener('keydown', resetTimer); return ()=>{ clearTimeout(timerRef.current); window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keydown', resetTimer)} } },[loggedIn])

  const handleLogin = async (e) => {
    e.preventDefault()
    const id = studentId.trim().padStart(3,'0')
    setLoading(true); setMessage("")
    const sSnap = await getDoc(doc(db,'horeb_students',id))
    if(!sSnap.exists()){ setMessage("Invalid Horeb ID (001-300)"); setLoading(false); return }
    const vSnap = await getDoc(doc(db,'horeb_votes',id))
    if(vSnap.exists()){ setMessage("Already voted"); setLoading(false); return }
    setStudentId(id); setLoggedIn(true); setLoading(false)
  }
  const handleSubmitAll = async () => {
    if(Object.keys(selections).length!== positions.length){ alert(`Vote for all positions! You voted ${Object.keys(selections).length}/${positions.length}`); return }
    setLoading(true)
    await setDoc(doc(db,'horeb_votes',studentId), { studentId, votes: selections, votedAt: new Date().toISOString() })
    setVoted(true); setTimeout(()=>handleLogout(), 4000); setLoading(false)
  }
  const loadResults = async () => {
    if(adminPass!== ADMIN_PASSWORD){ alert("Unauthorized"); return }
    setLoading(true)
    const votesSnap = await getDocs(collection(db,'horeb_votes'))
    setVotesData(votesSnap.docs.map(d=>d.data()))
    setShowAdmin(true); setLoading(false)
  }
  const handleLogout = () => { setLoggedIn(false); setStudentId(""); setSelections({}); setVoted(false); setMessage(""); setShowAdmin(false); setAdminPass(""); if(timerRef.current) clearTimeout(timerRef.current) }
  const getCount = (pos, candId) => votesData.filter(v=>v.votes[pos]===candId).length
  const isSingleCandidate = (pos) => candidates.filter(c=>c.position===pos).length === 1

  if(showAdmin) return (
    <div style={{maxWidth:1200, margin:'20px auto', padding:20, fontFamily:'sans-serif', background:'#f8f9fa', minHeight:'100vh'}}>
      <div style={{display:'flex', justifyContent:'space-between', background:'#fff', padding:15, borderRadius:10}}><h1>Horeb Admin - {votesData.length} votes</h1><button onClick={handleLogout}>Exit</button></div>
      {positions.map(pos=><div key={pos} style={{marginTop:20, background:'#fff', padding:15, borderRadius:10}}><h3 style={{background:'#0d5c5c', color:'#fff', padding:10, borderRadius:8}}>{pos}</h3>{candidates.filter(c=>c.position===pos).map(c=><div key={c.id} style={{display:'flex', gap:10, padding:10, borderBottom:'1px solid #eee'}}><img src={c.photo} style={{width:60,height:60, objectFit:'cover', borderRadius:8, background:'#eee'}} alt=""/><b>{c.name}</b><span style={{marginLeft:'auto'}}>{getCount(pos,c.id)} votes</span></div>)}</div>)}
    </div>
  )
  if(!loggedIn) return (
    <div style={{maxWidth:400, margin:'50px auto', padding:20, textAlign:'center', fontFamily:'sans-serif'}}>
      <h1 style={{color:'#0d5c5c'}}>Mt Horeb Voting 2026</h1><p>Official Election - Mt Horeb Decides</p>
      <form onSubmit={handleLogin}><input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Voting Code" style={{padding:12, width:'100%', fontSize:18, textAlign:'center'}}/><button disabled={loading} style={{marginTop:10, padding:12, width:'100%', background:'#0d5c5c', color:'#fff', border:'none', borderRadius:8}}>{loading?'Verifying...':'Login to Vote'}</button></form>
      {message && <p style={{color:'red'}}>{message}</p>}
      <details style={{marginTop:60, borderTop:'1px solid #eee', paddingTop:15}}><summary>Admin</summary><input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password" style={{padding:10, width:'100%', marginTop:10}}/><button onClick={loadResults} style={{marginTop:10, width:'100%', padding:10, background:'#0d5c5c', color:'#fff'}}>Access</button></details>
    </div>
  )
  if(voted) return <div style={{textAlign:'center', marginTop:100}}><h1>✅ Vote Recorded!</h1><p>Thank you for voting - Mt Horeb Decides</p></div>

  return (
    <div style={{maxWidth:800, margin:'0 auto', padding:15, fontFamily:'sans-serif', background:'#f5f5f5', minHeight:'100vh'}}>
      <div style={{background:'#0d5c5c', color:'#fff', padding:15, borderRadius:12, display:'flex', justifyContent:'space-between'}}><h2 style={{margin:0}}>Voter: {studentId}</h2><button onClick={handleLogout} style={{background:'#fff', border:'none', padding:'6px 12px', borderRadius:6}}>Logout</button></div>
      {positions.map(pos => {
        const single = isSingleCandidate(pos)
        return (
        <div key={pos} style={{marginTop:20, background:'#fff', padding:18, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
          <h3 style={{background: single ? '#b8860b' : '#0d5c5c', color:'#fff', padding:'10px 12px', borderRadius:8, margin:0, fontSize:16}}>{pos} {single && '(Vote YES or NO)'}</h3>
          <div style={{display:'flex', flexDirection:'column', gap:14, marginTop:14}}>
            {candidates.filter(c=>c.position===pos).map(c=>(
              <div key={c.id}>
                <label style={{display:'flex', alignItems:'center', gap:16, border: selections[pos]===c.id? '3px solid #0d5c5c' : '2px solid #e0e0e0', padding:14, borderRadius:12, cursor:'pointer', background: selections[pos]===c.id? '#e8f5f5':'#fff'}}>
                  <input type="radio" name={pos} value={c.id} checked={selections[pos]===c.id} onChange={()=>setSelections({...selections, [pos]:c.id})} style={{width:24, height:24, accentColor:'#0d5c5c'}} />
                  {c.photo ? <img src={c.photo} alt={c.name} style={{width:110, height:110, objectFit:'cover', borderRadius:10, border:'2px solid #eee'}} /> : <div style={{width:110, height:110, background:'#e9ecef', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#666'}}>NO PHOTO YET</div>}
                  <div style={{flex:1}}><div style={{fontWeight:'bold', fontSize:17}}>{c.name}</div><div style={{fontSize:13, color:'#666'}}>{pos}</div></div>
                  {selections[pos]===c.id && <span style={{color:'#0d5c5c', fontWeight:'bold'}}>✓</span>}
                </label>
                {single && selections[pos]===c.id && (
                  <div style={{marginTop:8, display:'flex', gap:10, paddingLeft:50}}>
                    <label style={{display:'flex', alignItems:'center', gap:6, background:'#d4edda', padding:'8px 16px', borderRadius:20, cursor:'pointer'}}><input type="radio" name={`${pos}-yn`} value="yes" onChange={()=>setSelections({...selections, [pos]: c.id})} /> YES</label>
                    <label style={{display:'flex', alignItems:'center', gap:6, background:'#f8d7da', padding:'8px 16px', borderRadius:20, cursor:'pointer'}}><input type="radio" name={`${pos}-yn`} value="no" onChange={()=>{ const newSel = {...selections}; delete newSel[pos]; setSelections(newSel); alert('If NO, leave unselected - vote not counted for candidate') }} /> NO</label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )})}
      <div style={{marginTop:30, background:'#fff', padding:20, borderRadius:12, position:'sticky', bottom:10, boxShadow:'0 -2px 10px rgba(0,0,0,0.1)'}}>
        <div style={{textAlign:'center', marginBottom:10}}>Selected {Object.keys(selections).length} / {positions.length} positions</div>
        <button onClick={handleSubmitAll} disabled={loading} style={{padding:16, width:'100%', background: Object.keys(selections).length===positions.length ? '#0d5c5c' : '#aaa', color:'#fff', fontSize:18, fontWeight:'bold', border:'none', borderRadius:10}}>{loading?'Submitting...':'SUBMIT ALL VOTES'}</button>
      </div>
    </div>
  )
}
