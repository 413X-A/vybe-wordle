// ================================
// SUPABASE
// ================================

import { createClient } from "https://esm.sh/@supabase/supabase-js"
import "./last_seen.js"

const supabaseUrl =
  "https://oeqoqwbsqilaqkuhlfcb.supabase.co"

const supabaseKey =
  "sb_publishable_XDc991FgppM8_V6IjNtC2g_Ziv2MEs8"

const supabase =
  createClient(supabaseUrl, supabaseKey)


// ================================
// GLOBALS
// ================================

let currentUser = null
let profile = null
let seasonState = null

const ONLINE_THRESHOLD = 2 * 60 * 1000

const topBar =
  document.getElementById("top-ui-bar")

const logoutBtn =
  document.getElementById("logoutBtn")


// ================================
// USER
// ================================

async function loadUser() {

  const { data: { user } } =
    await supabase.auth.getUser()

  currentUser = user
}


// ================================
// PROFILE
// ================================

async function loadProfile() {

  if (!currentUser) return

  const { data, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle()

  if (error) {
    
    return
  }

  profile = data
}


// ================================
// SEASON STATE
// ================================

async function loadSeasonState() {

  const { data, error } =
    await supabase
      .from("season_state")
      .select("*")
      .eq("id", 1)
      .single()

  if (error) {
    
    return
  }

  seasonState = data
}


// ================================
// ONLINE COUNT
// ================================

function countOnline(users = []) {

  const now = Date.now()

  return users.filter(u => {

    if (!u?.last_seen) return false

    const last = new Date(u.last_seen).getTime()

    return (now - last) < ONLINE_THRESHOLD
  }).length
}


// ================================
// LOAD TOP BAR
// ================================

async function loadTopBar() {

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      level,
      streak,
      last_seen
    `)
    .limit(1000)

  if (error) {
    
    return
  }

  const ranked = data
    .map(p => ({
      ...p,
      score: (p.level * 1000) + (p.streak * 500)
    }))
    .sort((a, b) => b.score - a.score)

  const bestPlayer = ranked[0]

  const totalUsers = data.length
  const onlineUsers = countOnline(data)

  const season = seasonState?.season_number

  renderTopBar({
    bestPlayer,
    totalUsers,
    onlineUsers,
    season
  })
}


// ================================
// RENDER TOP BAR
// ================================

function renderTopBar({
  bestPlayer,
  totalUsers,
  onlineUsers,
  season
}) {

  if (!topBar) return

  topBar.innerHTML = `
    <div class="ui-item">Saison ${season}</div> | 
    <div class="ui-item">#1 ${bestPlayer?.username ?? "-"}</div> | 
    <div class="ui-item">Online: ${onlineUsers ?? 0} / ${totalUsers ?? 0}</div>
  `
}


// ================================
// LOGOUT
// ================================

logoutBtn?.addEventListener("click", async () => {

  await supabase.auth.signOut()
  window.location.href = "index.html"
})


// ================================
// INIT
// ================================

async function start() {

  await loadUser()
  await loadProfile()
  await loadSeasonState()
  await loadTopBar()

  setInterval(loadTopBar, 30000)
}

start()