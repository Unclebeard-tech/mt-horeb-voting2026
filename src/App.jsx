import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore'
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
  const [liveCandidates, setLiveCandidates] = useState(STATIC_CANDIDATES)
  const [newPosName, setNewPosName] = useState("")
  const [newCand, setNewCand] = useState({ name: "", position: "", photo: "" })
  const [uploading, setUploading] = useState(false)
  const timerRef = useRef(null)

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

  // Load dynamic candidates from Firestore if exists
  useEffect(()=>{
    const loadLive = async () => {
      try{
        const snap = await getDocs(collection(db,'horeb_candidates_live'))
        if(!snap.empty){
          setLiveCandidates(snap.docs.map(d=>d.data()))
        }
      }catch(e){ console.log("using static") }
    }
    loadLive()
  },[])

  const candidates = liveCandidates.length > 0 ? liveCandidates : STATIC_CANDIDATES
  const positions = [...new Set(candidates.map(c=>c.position))].sort((a,b)=>{
    const ia = positionOrder.indexOf(a); const ib = positionOrder.indexOf(b)
    if(ia===-1 && ib===-1) return a.localeCompare(b)
    if(ia===-1) return 1
    if(ib===-1) return -1
    return ia-ib
  })

  const resetTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { handleLogout(); }, 10*60*1000) }
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
    if(Object.keys(selections).length === 0){ alert("Select at least 1"); return; }
    const notVoted = positions.filter(p => !selections[p])
    if(notVoted.length > 0){
      if(!window.confirm(`Voted ${Object.keys(selections).length}/${positions.length}. Skipped: ${notVoted.join(", ")}.\nSubmit anyway?`)) return;
    }
    setLoading(true)
    await setDoc(doc(db,'horeb_votes',studentId), { studentId, votes: selections, votedAt: new Date().toISOString() })
    setVoted(true); setTimeout(()=>handleLogout(), 3000); setLoading(false)
  }

  const loadResults = async () => {
    if(adminPass!== ADMIN_PASSWORD){ alert("Wrong password"); return }
    setLoading(true)
    const votesSnap = await getDocs(collection(db,'horeb_votes'))
    setVotesData(votesSnap.docs.map(d=>d.data()))
    // also reload live candidates
    const candSnap = await getDocs(collection(db,'horeb_candidates_live'))
    if(!candSnap.empty) setLiveCandidates(candSnap.docs.map(d=>d.data()))
    else setLiveCandidates(STATIC_CANDIDATES)
    setShowAdmin(true); setLoading(false)
  }

  const handleLogout = () => { setLoggedIn(false); setStudentId(""); setSelections({}); setVoted(false); setMessage(""); setShowAdmin(false); setAdminPass(""); if(timerRef.current) clearTimeout(timerRef.current) }
  const getCount = (pos, candId) => votesData.filter(v=>v.votes && v.votes[pos]===candId).length

  // ADMIN ACTIONS
  const resetAllVotes = async () => {
    if(!window.confirm(`DELETE ALL ${votesData.length} VOTES? This cannot be undone!`)) return
    if(!window.confirm("Are you REALLY sure? Type OK?")) return
    setLoading(true)
    const snap = await getDocs(collection(db,'horeb_votes'))
    for(const d of snap.docs){ await deleteDoc(doc(db,'horeb_votes', d.id)) }
    setVotesData([])
    alert("All votes reset!")
    setLoading(false)
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if(!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setNewCand({...newCand, photo: ev.target.result})
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const addCandidate = async () => {
    if(!newCand.name || !newCand.position){ alert("Enter name and position"); return }
    setLoading(true)
    const id = `cand-${Date.now()}`
    const candData = { id, name: newCand.name.toUpperCase(), position: newCand.position.toUpperCase(), photo: newCand.photo || "" }
    await setDoc(doc(db,'horeb_candidates_live', id), candData)
    setLiveCandidates([...candidates, candData])
    setNewCand({ name: "", position: "", photo: "" })
    alert(`Added ${candData.name} to ${candData.position}`)
    setLoading(false)
  }

  const deleteCandidate = async (candId) => {
    if(!window.confirm("Delete this candidate?")) return
    setLoading(true)
    try{
      await deleteDoc(doc(db,'horeb_candidates_live', candId))
      setLiveCandidates(candidates.filter(c=>c.id!==candId))
    }catch{
      // if static, add all to live first
      const toSave = STATIC_CANDIDATES.filter(c=>c.id!==candId)
      for(const c of toSave){ await setDoc(doc(db,'horeb_candidates_live', c.id), c) }
      setLiveCandidates(toSave)
    }
    setLoading(false)
  }

  const addPosition = async () => {
    if(!newPosName){ alert("Enter position name"); return }
    const pos = newPosName.toUpperCase()
    if(positions.includes(pos)){ alert("Position already exists"); return }
    // positions are derived from candidates, so we just alert to add candidate
    alert(`Position "${pos}" created! Now add a candidate under this position.`)
    setNewCand({...newCand, position: pos})
    setNewPosName("")
  }

  const publishToLive = async () => {
    // Save static candidates to live collection
    setLoading(true)
    for(const c of STATIC_CANDIDATES){
      await setDoc(doc(db,'horeb_candidates_live', c.id), c)
    }
    alert("Static candidates published to live database - now you can edit them")
    setLoading(false)
  }

  if(showAdmin) {
    const totalVoters = votesData.length
    return (
      <div style={{maxWidth:1200, margin:'0 auto', padding:10, fontFamily:'sans-serif', background:'#f0f2f5', minHeight:'100vh'}}>
        <div style={{background:'#fff', padding:15, borderRadius:12, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10, boxShadow:'0 2px 8px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:20}}>
          <div><h2 style={{margin:0, color:'#0d5c5c'}}>HOREB ADMIN PORTAL</h2><small>{totalVoters} votes • {candidates.length} candidates • {positions.length} positions</small></div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button onClick={resetAllVotes} style={{padding:'8px 12px', background:'#dc3545', color:'#fff', border:'none', borderRadius:6, fontWeight:'bold'}}>🗑️ Reset Votes</button>
            <button onClick={()=>window.print()} style={{padding:'8px 12px', background:'#0d5c5c', color:'#fff', border:'none', borderRadius:6}}>Print</button>
            <button onClick={handleLogout} style={{padding:'8px 12px'}}>Exit</button>
          </div>
        </div>

        {/* ADD POSITION & CANDIDATE */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginTop:15}}>
          <div style={{background:'#fff', padding:15, borderRadius:12}}>
            <h3 style={{margin:'0 0 10px 0'}}>➕ Add New Position</h3>
            <div style={{display:'flex', gap:8}}><input value={newPosName} onChange={e=>setNewPosName(e.target.value)} placeholder="e.g. DEBATE MINISTER" style={{flex:1, padding:10, borderRadius:6, border:'1px solid #ccc'}} /><button onClick={addPosition} style={{padding:'10px 15px', background:'#0d5c5c', color:'#fff', border:'none', borderRadius:6}}>Add</button></div>
            <small style={{color:'#666'}}>Positions appear when you add a candidate under them</small>
            <div style={{marginTop:15}}>
              <h4>Current Positions ({positions.length})</h4>
              <div style={{display:'flex', flexWrap:'wrap', gap:5}}>{positions.map(p=><span key={p} style={{background:'#e8f5f5', padding:'4px 8px', borderRadius:20, fontSize:11, border:'1px solid #0d5c5c'}}>{p}</span>)}</div>
            </div>
          </div>

          <div style={{background:'#fff', padding:15, borderRadius:12}}>
            <h3 style={{margin:'0 0 10px 0'}}>➕ Add Candidate + Picture</h3>
            <input value={newCand.name} onChange={e=>setNewCand({...newCand, name:e.target.value})} placeholder="Full Name e.g. John Doe" style={{width:'100%', padding:10, marginBottom:8, borderRadius:6, border:'1px solid #ccc'}} />
            <input list="poslist" value={newCand.position} onChange={e=>setNewCand({...newCand, position:e.target.value})} placeholder="Select or type position" style={{width:'100%', padding:10, marginBottom:8, borderRadius:6, border:'1px solid #ccc'}} />
            <datalist id="poslist">{positions.map(p=><option key={p} value={p} />)}</datalist>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{marginBottom:8}} />
            {uploading && <small>Uploading...</small>}
            {newCand.photo && <img src={newCand.photo} style={{width:80, height:80, objectFit:'cover', borderRadius:8, display:'block', marginBottom:8}} alt="preview" />}
            <button onClick={addCandidate} disabled={loading} style={{width:'100%', padding:12, background:'#28a745', color:'#fff', border:'none', borderRadius:6, fontWeight:'bold'}}>{loading?'Adding...':'Add Candidate'}</button>
            {liveCandidates.length===STATIC_CANDIDATES.length && <button onClick={publishToLive} style={{width:'100%', marginTop:8, padding:8, background:'#ffc107', border:'none', borderRadius:6, fontSize:12}}>First time? Click to enable live editing (publish static to database)</button>}
          </div>
        </div>

        {/* RESULTS WITH BARS */}
        {positions.map(pos=>{
          const cands = candidates.filter(c=>c.position===pos)
          const totalVotesForPos = cands.reduce((sum,c)=>sum+getCount(pos,c.id),0)
          const maxVotes = Math.max(...cands.map(c=>getCount(pos,c.id)),1)
          return (
            <div key={pos} style={{marginTop:20, background:'#fff', padding:15, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h3 style={{background:'#0d5c5c', color:'#fff', padding:'6px 12px', borderRadius:6, margin:0, fontSize:14}}>{pos} ({cands.length})</h3><small>Total: {totalVotesForPos} votes</small></div>
              {cands.map(c=>{
                const count = getCount(pos,c.id)
                const percent = totalVotesForPos>0 ? Math.round((count/totalVotesForPos)*100) : 0
                const barWidth = maxVotes>0 ? (count/maxVotes)*100 : 0
                const isWinner = count===maxVotes && count>0
                return (
                  <div key={c.id} style={{marginTop:12, border: isWinner?'2px solid #28a745':'1px solid #eee', borderRadius:10, padding:10, background: isWinner?'#f0fff4':'#fff'}}>
                    <div style={{display:'flex', gap:10, alignItems:'center'}}>
                      {c.photo ? <img src={c.photo} style={{width:60,height:60,objectFit:'cover',borderRadius:8}} alt="" /> : <div style={{width:60,height:60,background:'#eee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>NO PIC</div>}
                      <div style={{flex:1}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}><b>{c.name}</b><span><b style={{fontSize:18, color: isWinner?'#28a745':'#0d5c5c'}}>{count}</b> <small>({percent}%)</small></span></div>
                        <div style={{width:'100%', height:18, background:'#e9ecef', borderRadius:20, overflow:'hidden', marginTop:6}}><div style={{width:`${barWidth}%`, height:'100%', background: isWinner?'linear-gradient(90deg,#28a745,#20c997)':'linear-gradient(90deg,#0d5c5c,#17a2b8)', borderRadius:20, transition:'width 0.8s', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:'6px', minWidth: count>0?'30px':'0'}}>{count>0 && <span style={{color:'#fff',fontSize:10,fontWeight:'bold'}}>{count}</span>}</div></div>
                      </div>
                      <button onClick={()=>deleteCandidate(c.id)} style={{background:'#dc3545', color:'#fff', border:'none', padding:'5px 8px', borderRadius:6, fontSize:11}}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        <div style={{marginTop:20, background:'#fff', padding:15, borderRadius:12, textAlign:'center'}}>
          <h3>Turnout: {totalVoters} / 300</h3>
          <div style={{width:'100%', height:25, background:'#e9ecef', borderRadius:20, overflow:'hidden'}}><div style={{width:`${Math.min((totalVoters/300)*100,100)}%`, height:'100%', background:'linear-gradient(90deg,#0d5c5c,#28a745)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>{Math.round((totalVoters/300)*100)}%</div></div>
        </div>
      </div>
    )
  }

  if(!loggedIn) return (
    <div style={{maxWidth:400, margin:'50px auto', padding:20, textAlign:'center', fontFamily:'sans-serif'}}>
      <h1 style={{color:'#0d5c5c'}}>Mt Horeb Voting 2026</h1><p>Mt Horeb Decides</p>
      <form onSubmit={handleLogin}><input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Voting Code" style={{padding:12, width:'100%', fontSize:18, textAlign:'center'}}/><button disabled={loading} style={{marginTop:10, padding:12, width:'100%', background:'#0d5c5c', color:'#fff', border:'none', borderRadius:8}}>{loading?'Verifying...':'Login'}</button></form>
      {message && <p style={{color:'red'}}>{message}</p>}
      <details style={{marginTop:40}}><summary>Admin Portal</summary><input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Admin Password" style={{padding:10, width:'100%', marginTop:10}}/><button onClick={loadResults} disabled={loading} style={{marginTop:10, width:'100%', padding:10, background:'#0d5c5c', color:'#fff'}}>{loading?'Loading...':'Open Admin Portal'}</button></details>
    </div>
  )
  if(voted) return <div style={{textAlign:'center', marginTop:100}}><h1>✅ Vote Recorded!</h1><p>Voted for {Object.keys(selections).length} position(s)</p></div>

  return (
    <div style={{maxWidth:800, margin:'0 auto', padding:15, fontFamily:'sans-serif', background:'#f5f5f5', minHeight:'100vh'}}>
      <div style={{background:'#0d5c5c', color:'#fff', padding:15, borderRadius:12, display:'flex', justifyContent:'space-between'}}><h2 style={{margin:0}}>Voter: {studentId}</h2><button onClick={handleLogout} style={{background:'#fff', border:'none', padding:'6px 12px', borderRadius:6}}>Logout</button></div>
      <div style={{background:'#d1ecf1', padding:10, borderRadius:8, marginTop:15, fontSize:13, textAlign:'center'}}>Skip allowed. Select at least 1.</div>
      {positions.map(pos => (
        <div key={pos} style={{marginTop:20, background:'#fff', padding:15, borderRadius:12, border: selections[pos] ? '2px solid #28a745' : '1px solid #eee'}}>
          <div style={{display:'flex', justifyContent:'space-between'}}><h3 style={{background:'#0d5c5c', color:'#fff', padding:'6px 10px', borderRadius:6, margin:0, fontSize:13}}>{pos}</h3>{selections[pos] ? <span style={{background:'#28a745', color:'#fff', padding:'3px 8px', borderRadius:20, fontSize:11}}>VOTED</span> : <span style={{background:'#eee', padding:'3px 8px', borderRadius:20, fontSize:11}}>SKIPPED</span>}</div>
          <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:12}}>
            {candidates.filter(c=>c.position===pos).map(c=>(
              <label key={c.id} style={{display:'flex', alignItems:'center', gap:12, border: selections[pos]===c.id? '3px solid #0d5c5c' : '2px solid #e0e0e0', padding:12, borderRadius:10, cursor:'pointer'}}>
                <input type="radio" name={pos} value={c.id} checked={selections[pos]===c.id} onChange={()=>setSelections({...selections, [pos]:c.id})} style={{width:22,height:22}} />
                {c.photo ? <img src={c.photo} style={{width:90,height:90,objectFit:'cover',borderRadius:8}} alt="" /> : <div style={{width:90,height:90,background:'#eee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>NO PIC</div>}
                <div style={{flex:1}}><b>{c.name}</b><div style={{fontSize:11, color:'#666'}}>{pos}</div></div>
              </label>
            ))}
            <button onClick={()=>{ const s={...selections}; delete s[pos]; setSelections(s) }} style={{fontSize:11, background:'none', border:'none', color:'#999', textAlign:'left'}}>Clear {pos}</button>
          </div>
        </div>
      ))}
      <div style={{marginTop:25, background:'#fff', padding:15, borderRadius:12, position:'sticky', bottom:10, boxShadow:'0 -2px 10px rgba(0,0,0,0.15)', border:'2px solid #0d5c5c'}}>
        <div style={{textAlign:'center', fontWeight:'bold', marginBottom:8}}>Selected {Object.keys(selections).length} / {positions.length}</div>
        <button onClick={handleSubmitAll} disabled={loading || Object.keys(selections).length===0} style={{padding:14, width:'100%', background: Object.keys(selections).length>0 ? '#0d5c5c' : '#aaa', color:'#fff', fontSize:16, fontWeight:'bold', border:'none', borderRadius:8}}>{loading?'Submitting...':`SUBMIT (${Object.keys(selections).length})`}</button>
      </div>
    </div>
  )
}
