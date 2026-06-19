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

import { checkDailyReward } from "./daily_reward.js"


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

await checkDailyReward()
await new Promise(r => setTimeout(r, 300))
await checkStreak(user.id)


  await loadSeasonState()


  loadSeasonPass(user.id)
}


// =====================================================
// STREAK CHECK
// =====================================================

async function checkStreak(userId) {

  if (streakChecked) return

  streakChecked = true


  const today = new Date()


  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)


  const yesterdayKey =
    yesterday.toISOString().split("T")[0]


  const todayKey =
    today.toISOString().split("T")[0]


  const lastSolved =
    profile?.last_word_solved



  if (!lastSolved) return



  // heute gespielt
  if (lastSolved === todayKey) {
    return
  }


  // gestern gespielt
  if (lastSolved === yesterdayKey) {
    return
  }



  // keine Streak
  if ((profile.streak || 0) <= 0) {
    return
  }



  const saverAmount =
    await getStreakSaverAmount(userId)



  // ===============================
  // SAVER VORHANDEN
  // ===============================

  if (saverAmount > 0) {

    showStreakSaveChoiceOverlay(
      userId,
      saverAmount
    )

    return
  }



  // ===============================
  // KEIN SAVER
  // KAUF ANGEBOT
  // ===============================

  showStreakBuyOverlay(userId)

}

async function getStreakSaverAmount(userId) {


  const { data } = await supabase
    .from("user_inventory")
    .select("amount")
    .eq("user_id", userId)
    .eq("item_type", "streak_saver")
    .maybeSingle()


  return data?.amount || 0
}

async function useStreakSaver(userId) {


  const amount =
    await getStreakSaverAmount(userId)



  if (amount <= 0) return



  await supabase
    .from("user_inventory")
    .update({
      amount: amount - 1
    })
    .eq("user_id", userId)
    .eq("item_type", "streak_saver")



  showStreakSavedOverlay()

}

async function buyStreakSaver(userId) {


  // ==================================
  // PREIS AUS DATENBANK HOLEN
  // ==================================

  const { data: saverItem } =
    await supabase
      .from("shop_public")
      .select("*")
      .eq("type", "streak_saver")
      .single()



  if (!saverItem) {

    alert("Streak Saver nicht im Shop gefunden")
    return

  }


  const price = saverItem.price



  // ==================================
  // GENUG MÜNZEN?
  // ==================================

  if ((profile.muenzen || 0) < price) {

    alert(
      `Nicht genug Münzen (${price} benötigt)`
    )

    return

  }



  // ==================================
  // MÜNZEN ABZIEHEN
  // ==================================

  const { data: updatedProfile } =
    await supabase
      .from("profiles")
      .update({

        muenzen:
          profile.muenzen - price

      })
      .eq("id", userId)
      .select("*")
      .single()



  if (updatedProfile) {

    profile = updatedProfile

    renderUI(profile)

  }



  // ==================================
  // INVENTORY ERHÖHEN
  // ==================================

  const amount =
    await getStreakSaverAmount(userId)



  if (amount > 0) {


    await supabase
      .from("user_inventory")
      .update({

        amount: amount + 1

      })
      .eq("user_id", userId)
      .eq("item_type", "streak_saver")


  } 
  
  else {


    await supabase
      .from("user_inventory")
      .insert({

        user_id: userId,
        item_id: saverItem.id,
        item_name: saverItem.name,
        item_icon: saverItem.icon,
        item_type: "streak_saver",
        amount: 1

      })

  }



  // ==================================
  // DIREKT BENUTZEN
  // ==================================

  await useStreakSaver(userId)

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
  <div class="bp-level">
    STUFE ${r.stufe}
  </div>

  <div class="bp-icon">
    <img src="${icon}">
  </div>

  <div class="bp-text">
    ${rewardText}
  </div>

  <div class="bp-cost">
    ${r.gesamt_marken} Marken
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


  let changes = {
    saisonpass_claimed: [...claimed, reward.stufe]
  }


  // =========================================
  // NORMAL REWARDS
  // =========================================

  if (reward.belohnung_typ === "muenzen") {
    changes.muenzen = (p.muenzen || 0) + reward.belohnung_menge
  }

  if (reward.belohnung_typ === "exp") {
    changes.exp = (p.exp || 0) + reward.belohnung_menge
  }

  if (reward.belohnung_typ === "powerup") {
    await giveSeasonItemOrCoins(userId, p, reward, "powerup")
  }

  if (reward.belohnung_typ === "song") {
    await giveSeasonItemOrCoins(userId, p, reward, "music")
  }

  if (reward.belohnung_typ === "kosmetik") {
    await giveSeasonItemOrCoins(userId, p, reward, "kosmetik")
  }


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

async function getSeasonOwned(userId) {

  const { data } = await supabase
    .from("user_inventory")
    .select("item_id")
    .eq("user_id", userId)
    .eq("source", "season")

  const map = {}

  data?.forEach(i => {
    map[i.item_id] = true
  })

  return map
}


async function giveSeasonItemOrCoins(userId, profile, reward, type) {

  const ownedMap = await getSeasonOwned(userId)

  const item = await getRandomShopItem(type)

  if (!item) return


  // =====================================
  // DUPLIKAT → 100 COINS
  // =====================================
  if (ownedMap[item.id]) {

    await supabase
      .from("profiles")
      .update({
        muenzen: (profile.muenzen || 0) + 100
      })
      .eq("id", userId)

    return
  }


  // =====================================
  // ITEM GIVE (SEASON INVENTORY)
  // =====================================

  const { data: inv } = await supabase
    .from("user_inventory")
    .select("*")
    .eq("user_id", userId)
    .eq("item_id", item.id)
    .maybeSingle()


  if (inv) {

    await supabase
      .from("user_inventory")
      .update({
        amount: (inv.amount || 0) + 1
      })
      .eq("user_id", userId)
      .eq("item_id", item.id)

  } else {

    await supabase
      .from("user_inventory")
      .insert({
        user_id: userId,
        item_id: item.id,
        item_name: item.name,
        item_icon: item.icon,
        item_type: item.type,
        amount: 1,
        source: "season"   // ⭐ WICHTIG
      })
  }
}

async function getRandomShopItem(type) {

  let query = supabase
    .from("shop_public")
    .select("*")
    .eq("active", true)

  if (type === "music") {
    query = query.eq("type", "song")
  }

  if (type === "powerup") {
    query = query.eq("type", "powerup")
  }

  if (type === "kosmetik") {
    query = query.in("type", ["avatar", "rahmen", "titel"])
  }

  const { data } = await query

  if (!data || data.length === 0) return null

  return data[Math.floor(Math.random() * data.length)]
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

function showStreakSaveChoiceOverlay(userId, amount) {


  const overlay = document.createElement("div")

  overlay.className = "overlay"

  overlay.innerHTML = `

<div class="levelup-box">

<h2>🔥 STREAK RETTEN?</h2>


<p>
Du besitzt ${amount} Streak Saver.
<br><br>
Möchtest du einen benutzen?
</p>


<button id="saveYes" class="levelup-btn">
Retten
</button>


<button id="saveNo" class="levelup-btn">
Nicht benutzen
</button>


</div>

`


  document.body.appendChild(overlay)



  document
    .getElementById("saveYes")
    .onclick = async () => {


      overlay.remove()


      await useStreakSaver(userId)


    }



  document
    .getElementById("saveNo")
    .onclick = async () => {


      overlay.remove()


      showStreakLostOverlay()


      await supabase
        .from("profiles")
        .update({
          streak: 0
        })
        .eq("id", userId)


      profile.streak = 0


      renderUI(profile)


    }


  setTimeout(() => {
    overlay.classList.add("show")
  }, 10)


}

function showStreakBuyOverlay(userId) {


  const overlay = document.createElement("div")


  overlay.className = "overlay"


  overlay.innerHTML = `

<div class="levelup-box">


<h2>🔥 STREAK VERLOREN</h2>


<p>
Du hast keinen Streak Saver.
<br><br>
Möchtest du einen kaufen?
</p>


<button id="buySaver" class="levelup-btn">
Streak Saver kaufen
</button>


<button id="loseSaver" class="levelup-btn">
Streak verlieren
</button>


</div>

`


  document.body.appendChild(overlay)



  document
    .getElementById("buySaver")
    .onclick = async () => {


      overlay.remove()


      await buyStreakSaver(userId)


    }



  document
    .getElementById("loseSaver")
    .onclick = async () => {


      overlay.remove()


      await supabase
        .from("profiles")
        .update({
          streak: 0
        })
        .eq("id", userId)


      profile.streak = 0


      renderUI(profile)


      showStreakLostOverlay()


    }


  setTimeout(() => {
    overlay.classList.add("show")
  }, 10)

}


function showStreakSavedOverlay() {


  const overlay = document.createElement("div")


  overlay.className = "overlay"


  overlay.innerHTML = `

<div class="levelup-box">


<h2>🔥 STREAK GERETTET!</h2>


<p>
Deine Streak bleibt erhalten.
</p>


<button class="levelup-btn" id="savedOk">
Weiter
</button>


</div>

`


  document.body.appendChild(overlay)



  document
    .getElementById("savedOk")
    .onclick = () => {

      overlay.remove()

    }


  setTimeout(() => {
    overlay.classList.add("show")
  }, 10)

}