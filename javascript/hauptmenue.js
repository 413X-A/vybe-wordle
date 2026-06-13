// ================================
// SUPABASE
// ================================

import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabaseUrl =
  "https://oeqoqwbsqilaqkuhlfcb.supabase.co"

const supabaseKey =
  "sb_publishable_XDc991FgppM8_V6IjNtC2g_Ziv2MEs8"

const supabase =
  createClient(supabaseUrl, supabaseKey)


// ================================
// GLOBALS
// ================================

let profile = null
let rewards = []
let seasonState = null
let streakChecked = false


import { renderUI } from "./ui.js"


// ================================
// INIT
// ================================

loadStatus()


// =====================================================
// USER + PROFILE
// =====================================================

async function loadStatus() {

  const { data: userData } =
    await supabase.auth.getUser()

  const user = userData?.user
  if (!user) return

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  profile = data

  await checkStreak()

  await loadSeasonState()

  loadSeasonPass(user.id)
}


// =====================================================
// STREAK CHECK
// =====================================================

async function checkStreak() {

  if (streakChecked) return

  streakChecked = true


  const today = new Date()

  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)


  const yesterdayKey =
    yesterday.toISOString().split("T")[0]


  const lastSolved =
    profile?.last_word_solved


  // neuer Spieler
  if (!lastSolved) return


  // gestern gespielt -> alles ok
  if (lastSolved === yesterdayKey) {
    return
  }


  // heute schon gespielt -> auch ok
  const todayKey =
    today.toISOString().split("T")[0]

  if (lastSolved === todayKey) {
    return
  }


  // Streak verlieren
  if ((profile.streak || 0) > 0) {


    await supabase
      .from("profiles")
      .update({
        streak: 0
      })
      .eq("id", profile.id)


    profile.streak = 0


    renderUI(profile)

    showStreakLostOverlay()

  }
}


// =====================================================
// SEASON STATE (GLOBAL)
// =====================================================

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


// =====================================================
// LOAD PASS
// =====================================================

async function loadSeasonPass(userId) {

  const { data } = await supabase
    .from("saisonpass")
    .select("*")
    .order("stufe", { ascending: true })

  rewards = data || []

  renderSeason(userId)
}


// =====================================================
// RARITY SYSTEM
// =====================================================

function getRarity(type) {

  const t = (type || "").toLowerCase().trim()

  if (t === "muenzen" || t === "exp") return "common"
  if (t === "powerup") return "rare"
  if (t === "song") return "epic"
  if (t === "kosmetik") return "legendary"

  return "common"
}


// =====================================================
// RENDER SEASON PASS
// =====================================================

function renderSeason(userId) {

  const track = document.getElementById("bpTrack")
  if (!track) return

  track.innerHTML = ""

  const marks = profile?.saisonmarken || 0
  const claimedList = profile?.saisonpass_claimed || []

  const seasonNumber = seasonState?.season_number || 1

  document.getElementById("bpProgressText").innerText =
    `SEASON PASS ${seasonNumber} • ${marks} / 2500`

  const percent = Math.min((marks / 2500) * 100, 100)

  document.getElementById("seasonBar").style.width =
    percent + "%"


  rewards.forEach(r => {

    const unlocked = marks >= r.gesamt_marken
    const claimed = claimedList.includes(r.stufe)

    const card = document.createElement("div")

    const rarity = getRarity(r.belohnung_typ)
    card.className = `bp-card ${rarity}`

    if (claimed) card.classList.add("claimed")
    else if (unlocked) card.classList.add("unlocked")
    else card.classList.add("locked")


    let icon = "./assets/icons/coin.png"

    if (r.belohnung_typ === "exp")
      icon = "./assets/icons/exp.png"

    if (r.belohnung_typ === "powerup")
      icon = "./assets/icons/powerup.png"

    if (r.belohnung_typ === "song")
      icon = "./assets/icons/music.png"

    if (r.belohnung_typ === "kosmetik")
      icon = "./assets/icons/cosmetic.png"


    let typeText = "ITEM"

    if (r.belohnung_typ === "muenzen") typeText = "MÜNZEN"
    if (r.belohnung_typ === "exp") typeText = "EXP"
    if (r.belohnung_typ === "powerup") typeText = "POWERUP"
    if (r.belohnung_typ === "song") typeText = "SONG"
    if (r.belohnung_typ === "kosmetik") typeText = "KOSMETIK"


    const rewardText =
      r.belohnung_typ === "song"
        ? "Neues Lied"
        : r.belohnung_typ === "kosmetik"
          ? "Neue Kosmetik"
          : `+${r.belohnung_menge} ${typeText}`


    card.innerHTML = `
      <div class="bp-level">${r.stufe}</div>

      <div class="bp-icon">
        <img src="${icon}">
      </div>

      <div class="bp-text">
        ${rewardText}
      </div>
    `

    card.onclick = () => claimReward(userId, r)

    track.appendChild(card)
  })
}


// =====================================================
// CLAIM REWARD
// =====================================================

async function claimReward(userId, reward) {

  const { data: p } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (!p) return

  const claimed = p.saisonpass_claimed || []

  if (claimed.includes(reward.stufe)) return
  if ((p.saisonmarken || 0) < reward.gesamt_marken) return


  const changes = {}

  if (reward.belohnung_typ === "muenzen") {
    changes.muenzen = (p.muenzen || 0) + reward.belohnung_menge
  }

  if (reward.belohnung_typ === "exp") {
    changes.exp = (p.exp || 0) + reward.belohnung_menge
  }

  if (reward.belohnung_typ === "powerup") {
    changes.powerups = (p.powerups || 0) + reward.belohnung_menge
  }

  changes.saisonpass_claimed =
    [...claimed, reward.stufe]


  const { data: updatedProfile } = await supabase
  .from("profiles")
  .update(changes)
  .eq("id", userId)
  .select("*")
  .single()


if (updatedProfile) {
  renderUI(updatedProfile)
}


  await loadStatus()
  await handleLevelUp(p.level)
  loadSeasonPass(userId)
}


// =====================================================
// LEVEL SYSTEM
// =====================================================

function getNeededExp(level) {
  return Math.floor(level * 1.5)
}


// =====================================================
// LEVEL UP
// =====================================================

async function handleLevelUp(oldLevel) {

  let leveledUp = false

  let currentLevel = profile.level
  let exp = profile.exp

  while (exp >= getNeededExp(currentLevel)) {
    exp -= getNeededExp(currentLevel)
    currentLevel++
    leveledUp = true
  }

  profile.level = currentLevel
  profile.exp = exp


  if (leveledUp) {
    showLevelUpOverlay(oldLevel, currentLevel)
  }


  await supabase
    .from("profiles")
    .update({
      level: currentLevel,
      exp: exp
    })
    .eq("id", profile.id)
}


// =====================================================
// LEVEL UP UI
// =====================================================

function showLevelUpOverlay(oldLevel, newLevel) {

  const old = document.getElementById("levelUpOverlay")
  if (old) old.remove()

  const overlay = document.createElement("div")
  overlay.id = "levelUpOverlay"

  overlay.innerHTML = `
    <div class="levelup-box">

      <h2>LEVEL UP!</h2>

      <p>
        Du bist jetzt Level <b>${newLevel}</b>
      </p>

      <button id="levelupContinueBtn" class="levelup-btn">
        Weiter
      </button>

    </div>
  `

  document.body.appendChild(overlay)

  setTimeout(() => overlay.classList.add("show"), 10)

  document
    .getElementById("levelupContinueBtn")
    .addEventListener("click", () => {
      overlay.classList.remove("show")
      setTimeout(() => overlay.remove(), 250)
    })
}


// =====================================================
// SEASON RESET OVERLAY (optional global trigger)
// =====================================================

function showSeasonResetOverlay(newSeasonNumber) {

  const old = document.getElementById("seasonResetOverlay")
  if (old) old.remove()

  const overlay = document.createElement("div")

  overlay.id = "seasonResetOverlay"

  overlay.innerHTML = `
    <div class="levelup-box">

      <h2>NEUE SAISON!</h2>

      <p>
        Season <b>${newSeasonNumber}</b> gestartet 🎉
      </p>

      <button id="seasonResetBtn" class="levelup-btn">
        Weiter
      </button>

    </div>
  `

  document.body.appendChild(overlay)

  setTimeout(() => overlay.classList.add("show"), 10)

  document
    .getElementById("seasonResetBtn")
    .addEventListener("click", () => {
      overlay.classList.remove("show")
      setTimeout(() => overlay.remove(), 250)
    })
}


function showStreakLostOverlay() {

  const old =
    document.getElementById("streakLostOverlay")

  if (old) old.remove()


  const overlay =
    document.createElement("div")


  overlay.id = "streakLostOverlay"


  overlay.innerHTML = `

    <div class="levelup-box">

      <h2>STREAK VERLOREN</h2>

      <p>
        Du hast das gestrige Wort nicht gelöst.<br><br>
        Deine Streak wurde zurückgesetzt.
      </p>


      <button 
        id="streakContinueBtn"
        class="levelup-btn">

        Weiter

      </button>

    </div>

  `


  document.body.appendChild(overlay)


  setTimeout(() => {
    overlay.classList.add("show")
  }, 10)



  document
    .getElementById("streakContinueBtn")
    .onclick = () => {

      overlay.classList.remove("show")

      setTimeout(() => {
        overlay.remove()
      },250)

    }

}