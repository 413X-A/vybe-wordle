import { supabase } from "./supabase.js"

let currentUser = null

// ==============================
// USER
// ==============================

async function loadUser() {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser = user
}

// ==============================
// SCORE
// ==============================

function calculateScore(p) {
  return (p.level * 1000) + (p.streak * 500)
}

// ==============================
// LOAD DATA
// ==============================

async function loadLeaderboard() {

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, level, streak")
    .limit(100)

  if (error) {
    
    return
  }

  // SORT BY SCORE
  const sorted = data
    .map(p => ({
      ...p,
      score: calculateScore(p)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // TOP 10

  renderList(sorted)
  renderMyRank(sorted, data)
}

// ==============================
// RENDER LIST
// ==============================

function renderList(data) {

  const list = document.getElementById("list")
  list.innerHTML = ""

  data.forEach((p, i) => {

    const div = document.createElement("div")

    // FIX: muss zu CSS passen
    div.classList.add("list-item")

    if (i === 0) div.classList.add("top1")
    if (i === 1) div.classList.add("top2")
    if (i === 2) div.classList.add("top3")

    div.innerHTML = `
      <div class="rank">#${i + 1}</div>
      <div class="name">${p.username || "Player"}</div>
      <div class="level">${p.level}</div>
      <div class="streak">${p.streak}</div>
    `

    list.appendChild(div)
  })
}

// ==============================
// MY RANK (GLOBAL SEARCH)
// ==============================

function renderMyRank(top, all) {

  const myRankEl = document.getElementById("myRank")

  const ranked = all
    .map(p => ({
      ...p,
      score: calculateScore(p)
    }))
    .sort((a, b) => b.score - a.score)

  const index = ranked.findIndex(p => p.id === currentUser?.id)

  if (index === -1) {
    myRankEl.innerText = "Dein Rang: -"
    return
  }

  myRankEl.innerText = `Dein Rang: #${index + 1}`
}

// ==============================
// INIT
// ==============================

async function start() {
  await loadUser()
  await loadLeaderboard()
}

start()