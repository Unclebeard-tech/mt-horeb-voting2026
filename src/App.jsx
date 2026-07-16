import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc, updateDoc } from 'firebase/firestore'
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
  const [candidates, setCandidates] = useState(STATIC_CANDIDATES)
  const [newCand, setNewCand] = useState({ name:"", position:"", photo:"" })
  const [editId, setEditId] = useState(null)
  const timerRef = useRef(null)

  const positions = [...new Set(candidates.map(c => c.position))]

  useEffect(()=>{
    (async()=>{
      const snap = await getDocs(collection(db,'horeb_config_candidates'))
      if(!snap.empty) setCandidates(snap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    })()
  },[])

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { handleLogout(); }, 5*60*1000)
  }
  useEffect(()=>{ if(loggedIn){ resetTimer(); window.addEventListener('mousemove', resetTimer); window.addEventListener('keydown', resetTimer); return ()=>{ clearTimeout(timerRef.current); window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keydown', resetTimer)} } },[loggedIn])

  const handleLogin = async (e) => {
    e.preventDefault()
    const id = studentId.trim().padStart(3,'0')
    setLoading(true)
    const sSnap = await getDoc(doc(db,'horeb_students',id))
    if(!sSnap.exists()){ setMessage("Invalid Horeb ID - Use 001-300"); setLoading(false); return }
    const vSnap = await getDoc(doc(db,'horeb_votes',id))
    if(vSnap.exists()){ setMessage("Already voted"); setLoading(false); return }
    setStudentId(id); setLoggedIn(true); setLoading(false)
  }

  const handleSubmitAll = async () => {
    if(Object.keys(selections).length!== positions.length){ alert("Vote for all positions"); return }
    setLoading(true)
    await setDoc(doc(db,'horeb_votes',studentId), { studentId, votes: selections, votedAt: new Date().toISOString() })
    setVoted(true); setTimeout(()=>handleLogout(), 3000); setLoading(false)
  }

  const loadResults = async () => {
    if(adminPass!== ADMIN_PASSWORD){ alert("Unauthorized"); return }
    setLoading(true)
    const votesSnap = await getDocs(collection(db,'horeb_votes'))
    setVotesData(votesSnap.docs.map(d=>d.data()))
    const candSnap = await getDocs(collection(db,'horeb_config_candidates'))
    if(!candSnap.empty) setCandidates(candSnap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    else {
      for(let c of STATIC_CANDIDATES){ await addDoc(collection(db,'horeb_config_candidates'), c) }
      const newSnap = await getDocs(collection(db,'horeb_config_candidates'))
      setCandidates(newSnap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    }
    setShowAdmin(true); setLoading(false)
  }

  const handleAddCandidate = async () => {
    if(!newCand.name ||!newCand.position ||!newCand.photo){ alert("Fill all fields"); return }
    setLoading(true)
    if(editId){ await updateDoc(doc(db,'horeb_config_candidates',editId), newCand); setEditId(null) }
    else { const id = `${newCand.position.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`; await addDoc(collection(db,'horeb_config_candidates'), { id,...newCand }) }
    const snap = await getDocs(collection(db,'horeb_config_candidates'))
    setCandidates(snap.docs.map(d=>({firebaseId:d.id,...d.data()})))
    setNewCand({ name:"", position:"", photo:"" }); setLoading(false)
  }
  const handleEdit = (c) => { setNewCand({ name:c.name, position:c.position, photo:c.photo }); setEditId(c.firebaseId); window.scrollTo(0,0) }
  const handleDelete = async (fid) => { if(!confirm("Delete candidate?")) return; await deleteDoc(doc(db,'horeb_config_candidates',fid)); setCandidates(candidates.filter(c=>c.firebaseId!==fid)) }
  const resetAllVotes = async () => {
    if(!confirm("RESET ALL HOREB VOTES?")) return
    setLoading(true)
    const snap = await getDocs(collection(db,'horeb_votes'))
    for(let d of snap.docs){ await deleteDoc(d.ref) }
    setVotesData([]); alert("All Horeb votes reset"); setLoading(false)
  }
  const handleLogout = () => { setLoggedIn(false); setStudentId(""); setSelections({}); setVoted(false); setMessage(""); setShowAdmin(false); setAdminPass(""); if(timerRef.current) clearTimeout(timerRef.current) }
  const getCount = (pos, candId) => votesData.filter(v=>v.votes[pos]===candId).length

  if(showAdmin) return (
    <div style={{maxWidth:1200, margin:'20px auto', padding:20, fontFamily:'sans-serif', background:'#f8f9fa', minHeight:'100vh'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', padding:15, borderRadius:10}}>
        <h1 style={{margin:0}}>Mt Horeb - Admin</h1>
        <div><span style={{marginRight:15}}><b>{votesData.length}</b> voted</span><button onClick={handleLogout}>Exit</button></div>
      </div>
      <div style={{marginTop:15, background:'#fff', padding:15, borderRadius:10}}><button onClick={resetAllVotes} style={{background:'#dc3545', color:'#fff', padding:'12px', width:'100%', border:'none', borderRadius:8, fontWeight:'bold'}}>🗑 RESET HOREB VOTES</button></div>
      {positions.map(pos=>{
        const total = votesData.length
        const max = Math.max(...candidates.filter(c=>c.position===pos).map(c=>getCount(pos,c.id)),1)
        return (
        <div key={pos} style={{marginTop:20, background:'#fff', padding:20, borderRadius:12}}>
          <h2 style={{background:'#0d5c5c', color:'#fff', padding:10, borderRadius:8}}>{pos}</h2>
          {candidates.filter(c=>c.position===pos).map(c=>{
            const cnt = getCount(pos,c.id)
            const pct = total? ((cnt/total)*100).toFixed(1):0
            return (
              <div key={c.firebaseId||c.id} style={{display:'flex', alignItems:'center', gap:12, padding:12, border:'1px solid #eee', borderRadius:10, marginTop:10}}>
                <img src={c.photo} style={{width:60,height:60,borderRadius:50}} alt=""/>
                <div style={{flex:1}}><b>{c.name}</b> - {cnt} votes ({pct}%)<div style={{background:'#eee',height:18,borderRadius:10,marginTop:5}}><div style={{background:'#0d5c5c',width:`${(cnt/max)*100}%`,height:'100%',borderRadius:10}}></div></div></div>
              </div>
            )
          })}
        </div>
      )})}
    </div>
  )

  if(!loggedIn) return (
    <div style={{maxWidth:400, margin:'50px auto', padding:20, textAlign:'center', fontFamily:'sans-serif'}}>
      <h1>Mt Horeb Voting 2026/27</h1>
      <form onSubmit={handleLogin}>
        <input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Horeb ID (001-300)" style={{padding:12, width:'100%', fontSize:18, textAlign:'center'}}/>
        <button disabled={loading} style={{marginTop:10, padding:12, width:'100%', background:'#0d5c5c', color:'#fff'}}>{loading?'Verifying...':'Login'}</button>
      </form>
      {message && <p style={{color:'red'}}>{message}</p>}
      <div style={{marginTop:60, borderTop:'1px solid #eee', paddingTop:20}}>
        <details><summary>Admin Access</summary>
          <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password" style={{padding:10, width:'100%', marginTop:10}}/>
          <button onClick={loadResults} style={{marginTop:10, padding:10, width:'100%', background:'#0d5c5c', color:'#fff'}}>Access Dashboard</button>
        </details>
      </div>
    </div>
  )
  if(voted) return <div style={{textAlign:'center', marginTop:100}}><h1>✅ Vote Recorded!</h1><p>Thank you - Mt Horeb</p></div>

  return (
    <div style={{maxWidth:800, margin:'20px auto', padding:20, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between'}}><h2>Voter: {studentId} (Horeb)</h2><button onClick={handleLogout}>Logout</button></div>
      {positions.map(pos => (
        <div key={pos} style={{marginTop:30, background:'#fff', padding:20, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
          <h3 style={{background:'#0d5c5c', color:'#fff', padding:10, borderRadius:8, marginTop:0}}>{pos}</h3>
          <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:15}}>
            {candidates.filter(c=>c.position===pos).map(c=>(
              <label key={c.id} style={{display:'flex', alignItems:'center', gap:15, border: selections[pos]===c.id? '2px solid #0d5c5c' : '1px solid #ddd', padding:'12px 15px', borderRadius:10, cursor:'pointer', background: selections[pos]===c.id? '#f0ffff':'#fff'}}>
                <input type="radio" name={pos} value={c.id} checked={selections[pos]===c.id} onChange={()=>setSelections({...selections, [pos]:c.id})} style={{width:22, height:22, accentColor:'#0d5c5c'}} />
                <img src={c.photo} alt={c.name} style={{width:60, height:60, objectFit:'cover', borderRadius:50}}/>
                <span style={{fontWeight:'bold'}}>{c.name}</span>
                {selections[pos]===c.id && <span style={{marginLeft:'auto', color:'#0d5c5c', fontWeight:'bold'}}>✓ Selected</span>}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmitAll} style={{marginTop:40, padding:15, width:'100%', background:'#0d5c5c', color:'#fff', fontSize:18, fontWeight:'bold', border:'none', borderRadius:10}}>SUBMIT ALL VOTES</button>
    </div>
  )
}
