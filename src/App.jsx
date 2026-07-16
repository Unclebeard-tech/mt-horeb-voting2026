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
    if(Object.keys(selections).length === 0){ alert("Please select at least 1 candidate"); return; }
    const notVoted = positions.filter(p => !selections[p])
    if(notVoted.length > 0){
      const confirm = window.confirm(`You voted ${Object.keys(selections).length}/${positions.length} positions.\nSkipped: ${notVoted.join(", ")}\n\nSubmit anyway?`)
      if(!confirm) return;
    }
    setLoading(true)
    await setDoc(doc(db,'horeb_votes',studentId), { studentId, votes: selections, votedAt: new Date().toISOString(), partial: Object.keys(selections).length !== positions.length })
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
  const getCount = (pos, candId) => votesData.filter(v=>v.votes && v.votes[pos]===candId).length

  // ADMIN WITH GRAPHICAL BARS
  if(showAdmin) {
    const totalVoters = votesData.length
    return (
      <div style={{maxWidth:1100, margin:'0 auto', padding:15, fontFamily:'sans-serif', background:'#f0f2f5', minHeight:'100vh'}}>
        <div style={{background:'#fff', padding:20, borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:10}}>
          <div>
            <h1 style={{margin:0, color:'#0d5c5c'}}>MT. Horeb Results Dashboard</h1>
            <p style={{margin:'5px 0 0 0', color:'#666'}}>{totalVoters} total voters • {new Date().toLocaleString()}</p>
          </div>
          <div style={{display:'flex', gap:10}}>
            <button onClick={()=>window.print()} style={{padding:'10px 15px', background:'#0d5c5c', color:'#fff', border:'none', borderRadius:8}}>Print Results</button>
            <button onClick={handleLogout} style={{padding:'10px 15px'}}>Exit</button>
          </div>
        </div>

        {positions.map(pos=>{
          const cands = candidates.filter(c=>c.position===pos)
          const totalVotesForPos = cands.reduce((sum,c)=>sum+getCount(pos,c.id),0)
          const maxVotes = Math.max(...cands.map(c=>getCount(pos,c.id)),1)
          const leader = cands.reduce((prev,curr)=> getCount(pos,curr.id) > getCount(pos,prev.id) ? curr : prev, cands[0])

          return (
            <div key={pos} style={{marginTop:25, background:'#fff', padding:20, borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,0.08)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <h2 style={{background:'#0d5c5c', color:'#fff', padding:'8px 15px', borderRadius:8, margin:0, fontSize:16}}>{pos}</h2>
                <div style={{display:'flex', gap:15, fontSize:13, color:'#666'}}>
                  <span>Total: <b>{totalVotesForPos}</b> votes</span>
                  <span>Leading: <b style={{color:'#0d5c5c'}}>{leader?.name}</b></span>
                </div>
              </div>

              {cands.map(c=>{
                const count = getCount(pos,c.id)
                const percent = totalVotesForPos > 0 ? Math.round((count / totalVotesForPos)*100) : 0
                const barWidth = maxVotes > 0 ? (count / maxVotes)*100 : 0
                const isWinner = count === maxVotes && count > 0

                return (
                  <div key={c.id} style={{marginBottom:18, border: isWinner ? '2px solid #28a745' : '1px solid #e9ecef', borderRadius:12, padding:15, background: isWinner ? '#f0fff4' : '#fff', position:'relative'}}>
                    {isWinner && totalVotesForPos>0 && <span style={{position:'absolute', top:-10, right:15, background:'#28a745', color:'#fff', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:'bold'}}>LEADING</span>}
                    <div style={{display:'flex', gap:15, alignItems:'center'}}>
                      <img src={c.photo} alt="" style={{width:70, height:70, objectFit:'cover', borderRadius:10, background:'#eee', border:'2px solid #fff', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}} />
                      <div style={{flex:1}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div>
                            <div style={{fontWeight:'bold', fontSize:16}}>{c.name}</div>
                            <div style={{fontSize:12, color:'#666'}}>{pos}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:22, fontWeight:'bold', color: isWinner ? '#28a745' : '#0d5c5c'}}>{count}</div>
                            <div style={{fontSize:12, color:'#666'}}>{percent}%</div>
                          </div>
                        </div>
                        
                        {/* GRAPHICAL BAR */}
                        <div style={{marginTop:10}}>
                          <div style={{width:'100%', height:22, background:'#e9ecef', borderRadius:20, overflow:'hidden', position:'relative'}}>
                            <div style={{
                              width: `${barWidth}%`,
                              height:'100%',
                              background: isWinner ? 'linear-gradient(90deg, #28a745, #20c997)' : 'linear-gradient(90deg, #0d5c5c, #17a2b8)',
                              borderRadius:20,
                              transition:'width 1s ease-out',
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'flex-end',
                              paddingRight: count>0 ? '8px' : '0',
                              minWidth: count>0 ? '40px' : '0'
                            }}>
                              {count>0 && <span style={{color:'#fff', fontSize:11, fontWeight:'bold'}}>{count} votes</span>}
                            </div>
                          </div>
                          <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'#999', marginTop:4}}>
                            <span>0</span>
                            <span>{maxVotes} max</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Position summary bar chart */}
              {cands.length > 1 && totalVotesForPos > 0 && (
                <div style={{marginTop:15, padding:12, background:'#f8f9fa', borderRadius:8, display:'flex', gap:5, height:40, alignItems:'flex-end'}}>
                  {cands.map(c=>{
                    const count = getCount(pos,c.id)
                    const h = maxVotes>0 ? (count/maxVotes)*100 : 0
                    return (
                      <div key={c.id} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                        <div style={{fontSize:10, fontWeight:'bold'}}>{count}</div>
                        <div style={{width:'100%', height:`${h}%`, background: count===maxVotes ? '#28a745' : '#0d5c5c', borderRadius:'4px 4px 0 0', minHeight: count>0 ? '5px' : '2px', transition:'height 0.8s'}}></div>
                        <div style={{fontSize:8, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap', width:'100%', textAlign:'center'}}>{c.name.split(' ')[0]}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div style={{marginTop:30, background:'#fff', padding:20, borderRadius:12, textAlign:'center'}}>
          <h3>Overall Turnout</h3>
          <div style={{fontSize:48, fontWeight:'bold', color:'#0d5c5c'}}>{totalVoters}</div>
          <div style={{color:'#666'}}>students have voted</div>
          <div style={{marginTop:15, width:'100%', height:30, background:'#e9ecef', borderRadius:20, overflow:'hidden'}}>
            <div style={{width:`${Math.min((totalVoters/300)*100,100)}%`, height:'100%', background:'linear-gradient(90deg, #0d5c5c, #28a745)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'bold', fontSize:12}}>
              {Math.round((totalVoters/300)*100)}% turnout
            </div>
          </div>
        </div>
      </div>
    )
  }

  if(!loggedIn) return (
    <div style={{maxWidth:400, margin:'50px auto', padding:20, textAlign:'center', fontFamily:'sans-serif'}}>
      <h1 style={{color:'#0d5c5c'}}>Mt Horeb Voting 2026</h1><p>Official Election - Mt Horeb Decides</p>
      <p style={{fontSize:12, color:'#666', background:'#fff3cd', padding:10, borderRadius:8}}>You can skip positions. Solo candidates: selecting = YES vote.</p>
      <form onSubmit={handleLogin}><input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Voting Code" style={{padding:12, width:'100%', fontSize:18, textAlign:'center'}}/><button disabled={loading} style={{marginTop:10, padding:12, width:'100%', background:'#0d5c5c', color:'#fff', border:'none', borderRadius:8}}>{loading?'Verifying...':'Login to Vote'}</button></form>
      {message && <p style={{color:'red'}}>{message}</p>}
      <details style={{marginTop:60, borderTop:'1px solid #eee', paddingTop:15}}><summary>Admin Results</summary><input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password" style={{padding:10, width:'100%', marginTop:10}}/><button onClick={loadResults} style={{marginTop:10, width:'100%', padding:10, background:'#0d5c5c', color:'#fff'}}>View Results with Bars</button></details>
    </div>
  )
  if(voted) return <div style={{textAlign:'center', marginTop:100}}><h1>✅ Vote Recorded!</h1><p>Thank you - Mt Horeb Decides</p><p style={{color:'#666'}}>You voted for {Object.keys(selections).length} position(s)</p></div>

  return (
    <div style={{maxWidth:800, margin:'0 auto', padding:15, fontFamily:'sans-serif', background:'#f5f5f5', minHeight:'100vh'}}>
      <div style={{background:'#0d5c5c', color:'#fff', padding:15, borderRadius:12, display:'flex', justifyContent:'space-between'}}><h2 style={{margin:0}}>Voter: {studentId}</h2><button onClick={()=>{setLoggedIn(false); setStudentId(""); setSelections({});}} style={{background:'#fff', border:'none', padding:'6px 12px', borderRadius:6}}>Logout</button></div>
      <div style={{background:'#d1ecf1', padding:10, borderRadius:8, marginTop:15, fontSize:13, textAlign:'center'}}>You can skip positions. Select at least 1 to submit.</div>
      {positionOrder.filter(p => candidates.some(c => c.position === p)).map(pos => {
        const single = candidates.filter(c=>c.position===pos).length === 1
        return (
        <div key={pos} style={{marginTop:20, background:'#fff', padding:18, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border: selections[pos] ? '2px solid #28a745' : '2px solid #fff'}}>
          <div style={{display:'flex', justifyContent:'space-between'}}><h3 style={{background: single ? '#b8860b' : '#0d5c5c', color:'#fff', padding:'8px 12px', borderRadius:8, margin:0, fontSize:14, flex:1}}>{pos} {single && '(SOLO)'}</h3>{selections[pos] ? <span style={{background:'#28a745', color:'#fff', padding:'4px 10px', borderRadius:20, fontSize:12, marginLeft:10}}>VOTED</span> : <span style={{background:'#eee', color:'#666', padding:'4px 10px', borderRadius:20, fontSize:12, marginLeft:10}}>SKIPPED</span>}</div>
          <div style={{display:'flex', flexDirection:'column', gap:14, marginTop:14}}>
            {candidates.filter(c=>c.position===pos).map(c=>(
              <label key={c.id} style={{display:'flex', alignItems:'center', gap:16, border: selections[pos]===c.id? '3px solid #0d5c5c' : '2px solid #e0e0e0', padding:14, borderRadius:12, cursor:'pointer', background: selections[pos]===c.id? '#e8f5f5':'#fff'}}>
                <input type="radio" name={pos} value={c.id} checked={selections[pos]===c.id} onChange={()=>setSelections({...selections, [pos]:c.id})} style={{width:24, height:24}} />
                {c.photo ? <img src={c.photo} alt={c.name} style={{width:110, height:110, objectFit:'cover', borderRadius:10}} /> : <div style={{width:110, height:110, background:'#e9ecef', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#666', textAlign:'center'}}>NO PHOTO<br/>{c.name}</div>}
                <div style={{flex:1}}><div style={{fontWeight:'bold', fontSize:17}}>{c.name}</div><div style={{fontSize:12, color:'#666'}}>{pos}</div></div>
                {selections[pos]===c.id && <span style={{color:'#0d5c5c', fontWeight:'bold', fontSize:20}}>✓</span>}
              </label>
            ))}
            <button onClick={()=>{ const s={...selections}; delete s[pos]; setSelections(s) }} style={{fontSize:12, background:'none', border:'none', color:'#999', textAlign:'left'}}>Clear vote for {pos}</button>
          </div>
        </div>
      )})}
      <div style={{marginTop:30, background:'#fff', padding:20, borderRadius:12, position:'sticky', bottom:10, boxShadow:'0 -2px 15px rgba(0,0,0,0.15)', border:'2px solid #0d5c5c'}}>
        <div style={{textAlign:'center', marginBottom:12, fontWeight:'bold'}}>Selected {Object.keys(selections).length} / {positions.length} positions</div>
        <button onClick={handleSubmitAll} disabled={loading || Object.keys(selections).length===0} style={{padding:16, width:'100%', background: Object.keys(selections).length>0 ? '#0d5c5c' : '#aaa', color:'#fff', fontSize:18, fontWeight:'bold', border:'none', borderRadius:10}}>{loading?'Submitting...':`SUBMIT VOTES (${Object.keys(selections).length})`}</button>
        <div style={{textAlign:'center', fontSize:11, color:'#666', marginTop:8}}>Solo: selecting = YES. Skipping = NO.</div>
      </div>
    </div>
  )
}
