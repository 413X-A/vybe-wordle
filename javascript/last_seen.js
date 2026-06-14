// ================================
// LAST SEEN SYSTEM (GLOBAL)
// ================================

import { supabase } from "./supabase.js"

let currentUser = null

const HEARTBEAT_INTERVAL = 20000 // 20s

// ================================
// INIT USER
// ================================

async function initLastSeen() {

  const { data: { user } } = await supabase.auth.getUser()

  currentUser = user

  if (!currentUser) {
    
    return
  }

  startHeartbeat()
}

// ================================
// HEARTBEAT UPDATE
// ================================

async function sendHeartbeat() {

  if (!currentUser) return

  const { error } = await supabase
    .from("profiles")
    .update({
      last_seen: new Date().toISOString()
    })
    .eq("id", currentUser.id)

  if (error) {
    
  }
}

// ================================
// LOOP
// ================================

function startHeartbeat() {

  // sofort einmal setzen
  sendHeartbeat()

  // danach regelmäßig
  setInterval(() => {
    sendHeartbeat()
  }, HEARTBEAT_INTERVAL)
}

// ================================
// AUTH LISTENER (optional aber wichtig)
// ================================

supabase.auth.onAuthStateChange((event, session) => {

  if (!session?.user) {
    currentUser = null
    return
  }

  currentUser = session.user
  startHeartbeat()
})

// ================================
// AUTO START
// ================================

initLastSeen()