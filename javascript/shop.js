// ================================
// SUPABASE
// ================================

import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabaseUrl = "https://oeqoqwbsqilaqkuhlfcb.supabase.co"

const supabaseKey =
  "sb_publishable_XDc991FgppM8_V6IjNtC2g_Ziv2MEs8"

const supabase = createClient(supabaseUrl, supabaseKey)


// ================================
// GLOBALS
// ================================

let shopItems = []
let profile = null
let user = null
let ownedMap = {} // 🔥 NEW: Cache für Ownership


// ================================
// INIT
// ================================

loadStatus()


// =====================================================
// LOAD STATUS
// =====================================================

async function loadStatus() {

  const { data: userData } = await supabase.auth.getUser()

  user = userData?.user
  if (!user) return

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  profile = data

  await loadShop()
}


// =====================================================
// SHOP LOAD
// =====================================================

async function loadShop() {

  const { data } = await supabase
    .from("shop_public")
    .select("*")
    .eq("active", true)

  if (!data) return

  shopItems = data

  await loadOwnedItems() // 🔥 NEW
  renderShop()
}


// =====================================================
// OWNED CACHE
// =====================================================

async function loadOwnedItems() {

  if (!user) return

  const { data } = await supabase
    .from("user_inventory")
    .select("item_id, amount")
    .eq("user_id", user.id)

  ownedMap = {}

  data?.forEach(i => {
    ownedMap[i.item_id] = i.amount
  })
}

function getOwnedSync(itemId) {
  return ownedMap[itemId] || 0
}


// =====================================================
// GROUP
// =====================================================

function groupByType(items) {

  const grouped = {}

  items.forEach(item => {
    if (!grouped[item.type]) grouped[item.type] = []
    grouped[item.type].push(item)
  })

  return grouped
}


// =====================================================
// EQUIPPED CHECK
// =====================================================

function isEquipped(item) {

  if (item.type === "avatar") {
    return profile?.equipped_avatar === item.id
  }

  if (item.type === "rahmen") {
    return profile?.equipped_frame === item.id
  }

  if (item.type === "titel") {
    return profile?.equipped_title === item.id
  }

  return false
}


// =====================================================
// OVERLAY
// =====================================================

function showShopOverlay(title, text) {

  const old = document.getElementById("shopOverlay")
  if (old) old.remove()

  const overlay = document.createElement("div")
  overlay.id = "shopOverlay"

  overlay.innerHTML = `
    <div class="levelup-box">
      <h2>${title}</h2>
      <p>${text}</p>
      <button id="shopOverlayBtn" class="levelup-btn">Weiter</button>
    </div>
  `

  document.body.appendChild(overlay)

  setTimeout(() => overlay.classList.add("show"), 10)

  document
    .getElementById("shopOverlayBtn")
    .onclick = () => {
      overlay.classList.remove("show")
      setTimeout(() => overlay.remove(), 250)
    }
}


// =====================================================
// RENDER SHOP
// =====================================================

function renderShop() {

  const container = document.querySelector(".shop-section")
  if (!container) return

  container.innerHTML = ""

  const grouped = groupByType(shopItems)

  Object.keys(grouped).forEach(type => {

    const section = document.createElement("div")

    const title = document.createElement("h2")
    title.className = "shop-title"
    title.innerText = type.toUpperCase()

    const list = document.createElement("div")
    list.className = "shop-list"

    const sorted = [...grouped[type]]
      .sort((a, b) => a.price - b.price)

    sorted.forEach(item => {

      const card = document.createElement("div")
      card.className = "shop-card"

      const cosmetic = ["avatar", "rahmen", "titel"].includes(item.type)
      const equipped = isEquipped(item)
      const owned = getOwnedSync(item.id)

      if (equipped) {
  card.classList.add("equippedCard")
} else if (owned > 0 && ["avatar", "rahmen", "titel"].includes(item.type)) {
  card.classList.add("ownedCard")
}

      let buttonHTML = ""

      // =========================
      // COSMETIC LOGIC
      // =========================
      if (cosmetic) {

        if (equipped) {

          buttonHTML = `
            <button disabled>
              Ausgerüstet
            </button>
          `

        } else if (owned > 0) {

          buttonHTML = `
            <button class="equipBtn">
              Ausrüsten
            </button>
          `

        } else {

          buttonHTML = `
            <button class="buyBtn">
              ${item.price} Münzen
            </button>
          `
        }

      } else {

        buttonHTML = `
          <button class="buyBtn">
            ${item.price} Münzen
          </button>
        `
      }

      card.innerHTML = `
        <div class="info">
          <h3>${item.name}</h3>
          <p>${item.description || ""}</p>
        </div>
        ${buttonHTML}
      `

      const btn = card.querySelector("button")

      // =========================
      // CLICK LOGIC
      // =========================
      if (cosmetic) {

        btn.onclick = async () => {

          if (equipped) return

          const owned = getOwnedSync(item.id)

          if (owned <= 0) {
            await buyItem(item)
            return
          }

          await equipItem(item)
        }

      } else {

        btn.onclick = async () => {
          await buyItem(item)
        }
      }

      list.appendChild(card)
    })

    section.appendChild(title)
    section.appendChild(list)
    container.appendChild(section)
  })
}


// =====================================================
// BUY ITEM
// =====================================================

async function buyItem(item) {

  if (!user) return

  const owned = getOwnedSync(item.id)

  const max = item.max_stack ?? null
  const unlimited = max === null

  if (!unlimited && owned >= max) {
    showShopOverlay(
      "BEREITS ERWORBEN!",
      "Du kannst dieses Item nicht mehr kaufen."
    )
    return
  }

  if ((profile?.muenzen || 0) < item.price) {
    showShopOverlay(
      "NICHT GENUG MÜNZEN!",
      "Du hast nicht genug Coins."
    )
    return
  }

  await supabase
    .from("profiles")
    .update({
      muenzen: profile.muenzen - item.price
    })
    .eq("id", user.id)

  profile.muenzen -= item.price

  const { data: inv } = await supabase
    .from("user_inventory")
    .select("amount")
    .eq("user_id", user.id)
    .eq("item_id", item.id)
    .maybeSingle()

  const newAmount = (inv?.amount || 0) + 1

  if (!inv) {

    await supabase
      .from("user_inventory")
      .insert({
        user_id: user.id,
        item_id: item.id,
        item_name: item.name,
        item_icon: item.icon,
        item_type: item.type,
        amount: 1
      })

  } else {

    await supabase
      .from("user_inventory")
      .update({
        amount: newAmount
      })
      .eq("user_id", user.id)
      .eq("item_id", item.id)
  }

  if (["avatar", "rahmen", "titel"].includes(item.type)) {

    await equipItem(item)

    showShopOverlay(
      "GEKAUFT + AUSGERÜSTET!",
      item.name
    )

  } else {

    showShopOverlay(
      "GEKAUFT!",
      item.name
    )
  }

  await loadStatus()
}


// =====================================================
// EQUIP ITEM
// =====================================================

async function equipItem(item) {

  const update = {}

  if (item.type === "avatar") update.equipped_avatar = item.id
  if (item.type === "rahmen") update.equipped_frame = item.id
  if (item.type === "titel") update.equipped_title = item.id

  await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)

  await loadStatus()
}