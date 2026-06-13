import { supabase } from "./supabase.js"

const topBar = document.getElementById("top-ui-bar")
const logoutBtn = document.getElementById("logoutBtn")

let profile = null
let currentUser = null

// =============================
// INIT
// =============================
async function initUI() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    window.location.href = "index.html"
    return
  }

  currentUser = user

  const { data, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

  if (error || !data) {
    
    return
  }

  profile = data

  renderUI()
}

// =============================
// RENDER TOP BAR
// =============================
export function renderUI(newProfile = profile) {

  if (!topBar || !newProfile) return

  topBar.innerHTML = `
    <div class="ui-item">${newProfile.username}</div>
    <div class="ui-item">Level: ${newProfile.level}</div>
    <div class="ui-item">Münzen: ${newProfile.muenzen}</div>
    <div class="ui-item">Streak: ${newProfile.streak}</div>
  `
}

// =============================
// LOGOUT
// =============================
logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut()
  window.location.href = "index.html"
})

// =============================
// AUTH LISTENER
// =============================
supabase.auth.onAuthStateChange((event, session) => {
  if (!session) {
    window.location.href = "index.html"
  }
})

// START
initUI()