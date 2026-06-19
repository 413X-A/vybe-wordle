import { supabase }
from "./supabase.js"

import {
  initPowerups,
  updatePowerupsState,
  showPowerupOverlay
} from "./main_lasttry.js"



// =====================================================
// HTML
// =====================================================

const grid =
  document.getElementById("grid")

const keyboard =
  document.getElementById("keyboard")

const submitBtn =
  document.getElementById("submit")

const status =
  document.getElementById("status")


// =====================================================
// GAME
// =====================================================

let currentUser = null
let profile = null
let gameState = null
let roundCoins = 0
let roundExp = 0
let roundSaisonmarken = 0
let rewardedLetters = new Set()

let targetWord = ""
let bonusWord = ""

let board =
  Array.from(
    { length: 6 },
    () => Array(5).fill("")
  )

let row = 0
let col = 0

let gameOver = false
let isBonusGame = false

let dailyCompleted = false
let bonusCompleted = false

const keyMap = {}

let discoveredLetters =
  new Set()


// =====================================================
// DATE
// =====================================================

function getTodayKey() {

  const d = new Date()

  return (
    d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0")
  )
}


// =====================================================
// USER
// =====================================================

async function loadUser() {

  const {
    data: { user }
  } =
    await supabase.auth.getUser()

  if (!user) {

    window.location.href =
      "index.html"

    return
  }

  currentUser = user
}


// =====================================================
// PROFILE
// =====================================================

async function loadProfile() {

  const { data, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single()

  if (error || !data) {

    return
  }

  profile = data
}


// =====================================================
// DAILY WORD
// =====================================================

async function loadDailyWord() {

  const today =
    getTodayKey()

  const { data, error } =
    await supabase
      .from("daily_words")
      .select("*")
      .eq("game_date", today)
      .single()

  if (error || !data) {

    status.innerText =
      "Kein Tageswort haha"

    return
  }

  // =========================
  // MAIN WORD
  // =========================

  targetWord =
    data.word
      .trim()
      .toUpperCase()

  // =========================
  // BONUS WORD
  // =========================

  bonusWord =
    (data.bonus_word || "")
      .trim()
      .toUpperCase()

}


// =====================================================
// GRID
// =====================================================

function buildGrid() {

  grid.innerHTML = ""

  for (let r = 0; r < 6; r++) {

    const rowEl =
      document.createElement("div")

    rowEl.classList.add("row")

    for (let c = 0; c < 5; c++) {

      const cell =
        document.createElement("div")

      cell.classList.add("cell")

      rowEl.appendChild(cell)
    }

    grid.appendChild(rowEl)
  }
}


// =====================================================
// RENDER
// =====================================================

function renderBoard() {

  for (let r = 0; r < 6; r++) {

    const rowEl =
      grid.children[r]

    for (let c = 0; c < 5; c++) {

      rowEl.children[c].innerText =
        board[r][c]
    }
  }
}


// =====================================================
// UPDATE GRID
// =====================================================

function updateGrid() {

  const rowEl =
    grid.children[row]

  for (let i = 0; i < 5; i++) {

    rowEl.children[i].innerText =
      board[row][i]
  }
}


// =====================================================
// KEYBOARD
// =====================================================

function buildKeyboard() {

  keyboard.innerHTML = ""

  const layout = [

    "QWERTZUIOP",

    "ASDFGHJKL",

    "⌫YXCVBNM"
  ]

  layout.forEach(line => {

    const rowDiv =
      document.createElement("div")

    rowDiv.classList.add("key-row")

    line.split("").forEach(k => {

      const key =
        document.createElement("div")

      key.classList.add("key")

      key.innerText = k

      key.addEventListener(
        "click",
        () => handleKey(k)
      )

      rowDiv.appendChild(key)

      keyMap[k] = key
    })

    keyboard.appendChild(rowDiv)
  })
}


// =====================================================
// COLORS
// =====================================================

function updateKey(letter, color) {

  const key =
    keyMap[letter]

  if (!key) return

  key.classList.remove(
    "gray",
    "orange",
    "green",
    "purple"
  )

  key.classList.add(color)
}


function setCell(
  cell,
  letter,
  color
) {

  cell.innerText = letter

  cell.classList.remove(
    "gray",
    "orange",
    "green",
    "purple"
  )

  cell.classList.add(color)

  updateKey(letter, color)
}


// =====================================================
// INPUT
// =====================================================

async function handleKey(k) {

  if (gameOver) return

  if (k === "⌫") {

    if (col > 0) {

      col--

      board[row][col] = ""

      updateGrid()

      await saveGameState(false)
    }

    return
  }

  if (col < 5) {

    board[row][col] = k

    col++

    updateGrid()

    await saveGameState(false)
  }
}

// =====================================================
// EXP FÜR NÄCHSTES LEVEL
// =====================================================

function getNeededExp(level) {

  return Math.floor(
    level * 1.5
  )
}


// =====================================================
// REWARDS
// =====================================================

async function giveRewards(letterKey) {

  // Bereits belohnt?
  if (rewardedLetters.has(letterKey)) {
    return
  }

  rewardedLetters.add(letterKey)

  // =========================
  // COINS
  // =========================

  roundCoins++

  profile.muenzen =
    (profile.muenzen || 0) + 1

  // =========================
  // EXP
  // =========================

  roundExp++

  profile.exp =
    (profile.exp || 0) + 1

  // =========================
  // LEVEL UP
  // =========================

  let neededExp =
    getNeededExp(profile.level)

  while (
    profile.exp >= neededExp
  ) {

    profile.exp -= neededExp

    const oldLevel =
  profile.level

profile.level += 1

showLevelUpOverlay(
  oldLevel,
  profile.level
)

    neededExp =
      getNeededExp(profile.level)
  }

  // =========================
  // SAVE
  // =========================

  await supabase
    .from("profiles")
    .update({

      muenzen:
        profile.muenzen,

      exp:
        profile.exp,

      level:
        profile.level

    })
    .eq("id", currentUser.id)
}



// =====================================================
// SAVE GAME
// =====================================================

async function saveGameState(
  wonState = false
) {

  if (!targetWord) {
    return
  }

  // =================================
  // ALTE DATEN HOLEN
  // =================================

  const oldData =
    gameState || {}

  // =================================
  // SAVE OBJECT
  // =================================

  const saveData = {

    user_id:
      currentUser.id,

    game_date:
      getTodayKey(),

    // =================================
    // NORMAL GAME
    // =================================

    board:
      !isBonusGame
        ? board
        : oldData.board || [],

    current_row:
      !isBonusGame
        ? row
        : oldData.current_row || 0,

    current_col:
      !isBonusGame
        ? col
        : oldData.current_col || 0,

    won:
      !isBonusGame
        ? wonState
        : oldData.won || false,

    // =================================
    // BONUS GAME
    // =================================

    board_bonus:
      isBonusGame
        ? board
        : oldData.board_bonus || [],

    bonus_row:
      isBonusGame
        ? row
        : oldData.bonus_row || 0,

    bonus_col:
      isBonusGame
        ? col
        : oldData.bonus_col || 0,

    bonus_won:
      isBonusGame
        ? wonState
        : oldData.bonus_won || false,

    // =================================
    // STATUS
    // =================================

    daily_completed:
      dailyCompleted,

    bonus_completed:
      bonusCompleted,

    is_bonus_game:
      isBonusGame
  }

  // =================================
  // SAVE
  // =================================

  const { data, error } =
    await supabase
      .from("game_state")
      .upsert(
        saveData,
        {
          onConflict:
            "user_id,game_date"
        }
      )
      .select()
      .single()

  if (error) {

    return
  }

  // =================================
  // WICHTIG !!!
  // =================================

  gameState = data
}


// =====================================================
// LOAD GAME STATE
// =====================================================

async function loadGameState() {

  const { data, error } =
    await supabase
      .from("game_state")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .eq(
        "game_date",
        getTodayKey()
      )
      .maybeSingle()

  if (error) {

    return
  }

  if (!data) {

    await saveGameState(false)

    return
  }

  gameState = data

  dailyCompleted =
    data.daily_completed || false

  bonusCompleted =
    data.bonus_completed || false

  isBonusGame =
    data.is_bonus_game || false

  // =================================
  // BONUS GAME LADEN
  // =================================

  if (isBonusGame) {

    targetWord = bonusWord

    board =
      data.board_bonus ||
      Array.from(
        { length: 6 },
        () => Array(5).fill("")
      )

    row =
      Number(data.bonus_row) || 0

    col =
      Number(data.bonus_col) || 0

    gameOver =
      data.bonus_won || false
  }

  // =================================
  // NORMALES SPIEL LADEN
  // =================================

  else {

    board =
      data.board ||
      Array.from(
        { length: 6 },
        () => Array(5).fill("")
      )

    row =
      Number(data.current_row) || 0

    col =
      Number(data.current_col) || 0

    gameOver =
      data.won || false
  }

  renderBoard()

  restoreBoardColors()

  // =================================
  // ALLES FERTIG
  // =================================

  if (
    dailyCompleted &&
    bonusCompleted
  ) {

    gameOver = true

    showFullyCompletedOverlay()

    return
  }

  // =================================
  // OVERLAY
  // =================================

  if (gameOver) {

    setTimeout(() => {

      showEndOverlay(true)

    }, 300)
  }
}


// =====================================================
// BONUS SAISONMARKEN JE REIHE
// =====================================================

function getRowBonus(rowIndex) {

  const max = 10
  const value = max - rowIndex

  return value > 5 ? value : 5
}



// =====================================================
// RESTORE COLORS
// =====================================================

function restoreBoardColors() {

  for (let r = 0; r < 6; r++) {

    const guess =
      board[r].join("")

    if (guess.length !== 5) {
      continue
    }

    const rowEl =
      grid.children[r]

    for (let i = 0; i < 5; i++) {

      const letter =
        guess[i]

      const cell =
        rowEl.children[i]

      if (
        letter === targetWord[i]
      ) {

        setCell(
          cell,
          letter,
          "green"
        )

      } else if (
        targetWord.includes(letter)
      ) {

        setCell(
          cell,
          letter,
          "orange"
        )

      } else {

        setCell(
          cell,
          letter,
          "gray"
        )
      }
    }
  }
}

// =====================================================
// CHECK
// =====================================================

submitBtn.addEventListener(
  "click",
  check
)

// =====================================================
// CHECK
// =====================================================

async function check() {

  if (gameOver) return

  const guess =
    board[row].join("")

  if (guess.length !== 5) {

    status.innerText =
      "5 Buchstaben"

    return
  }

  const rowEl =
    grid.children[row]

  // =================================================
  // TARGET LETTER COUNTS
  // =================================================

  const targetCounts = {}

  for (const letter of targetWord) {

    targetCounts[letter] =
      (targetCounts[letter] || 0) + 1
  }

  // =================================================
  // RESULT ARRAY
  // =================================================

  const result =
    Array(5).fill("gray")

  // =================================================
  // PASS 1 → GREEN
  // =================================================

  const correctCounts = {}

  for (let i = 0; i < 5; i++) {

    const letter = guess[i]

    if (letter === targetWord[i]) {

      result[i] = "green"

      targetCounts[letter]--

      correctCounts[letter] =
        (correctCounts[letter] || 0) + 1

      const rewardKey =
        `${i}-${letter}`

      await giveRewards(rewardKey)
    }
  }

  // =================================================
  // PASS 2 → ORANGE / GRAY
  // =================================================

  for (let i = 0; i < 5; i++) {

    if (result[i] === "green") continue

    const letter = guess[i]

    if (!targetWord.includes(letter)) {

      result[i] = "gray"
      continue
    }

    const available =
      targetCounts[letter] || 0

    if (available > 0) {

      result[i] = "orange"

      targetCounts[letter]--

      const rewardKey =
        `${i}-${letter}`

      await giveRewards(rewardKey)

    } else {

      result[i] = "gray"
    }
  }

  // =================================================
  // PASS 3 → PURPLE OVERRIDE
  // =================================================

  const remainingTarget = {}

  for (const letter of targetWord) {
    remainingTarget[letter] =
      (remainingTarget[letter] || 0) + 1
  }

  for (let i = 0; i < 5; i++) {

    if (
      result[i] === "green" ||
      result[i] === "orange"
    ) {
      remainingTarget[guess[i]]--
    }
  }

  for (let i = 0; i < 5; i++) {

    const letter = guess[i]

    if (result[i] !== "green") continue

    if ((remainingTarget[letter] || 0) > 0) {

      result[i] = "purple"
      remainingTarget[letter]--
    }
  }

  // =================================================
  // CELLS
  // =================================================

  for (let i = 0; i < 5; i++) {

    setCell(
      rowEl.children[i],
      guess[i],
      result[i]
    )
  }

  // =================================================
  // WIN
  // =================================================

  if (guess === targetWord) {

    gameOver = true

    if (isBonusGame) {
      bonusCompleted = true
    } else {
      dailyCompleted = true
      last_word_solved: new Date().toISOString().split("T")[0]
    }

    const bonusMarken =
      getRowBonus(row)

    roundSaisonmarken += bonusMarken

    profile.saisonmarken =
      (profile.saisonmarken || 0) + bonusMarken

    let leveledUp = false

    let oldLevel =
      profile.level

    let neededExp =
      getNeededExp(profile.level)

    while (profile.exp >= neededExp) {

      profile.exp -= neededExp
      profile.level += 1

      leveledUp = true

      neededExp =
        getNeededExp(profile.level)
    }

    if (leveledUp) {
      showLevelUpOverlay(oldLevel, profile.level)
    }

    profile.games_played =
      (profile.games_played || 0) + 1

    // 👉 STREAK: nur normales Game zählt
    if (!isBonusGame) {

      profile.streak =
        (profile.streak || 0) + 1

    } else {

      profile.streak =
        profile.streak || 0
    }

    if (profile.streak > profile.best_streak) {
      profile.best_streak = profile.streak
    }

    await supabase
      .from("profiles")
      .update({
        level: profile.level,
        exp: profile.exp,
        saisonmarken: profile.saisonmarken,
        muenzen: profile.muenzen,
        streak: profile.streak,
        best_streak: profile.best_streak,
        games_played: profile.games_played
      })
      .eq("id", currentUser.id)

    await saveGameState(true)
    await loadProfile()
    showEndOverlay(true)

    return
  }

// =================================================
// NEXT ROW
// =================================================

row++
col = 0


if (
  row === 5 &&
  !isBonusGame &&
  !gameOver
) {

  updatePowerupsState({

    currentUser,
    grid,
    keyMap,
    targetWord,
    board,
    row

  })


  await showPowerupOverlay()

  return
}

  // =================================================
  // LOSE
  // =================================================

  if (row >= 6) {

    gameOver = true

    const bonusMarken =
      getRowBonus(row - 1)

    roundSaisonmarken += bonusMarken

    profile.saisonmarken =
      (profile.saisonmarken || 0) + bonusMarken

    profile.games_played =
      (profile.games_played || 0) + 1

    // 👉 STREAK RESET nur bei normalen Games
    if (!isBonusGame) {

      profile.streak = 0

    } else {

      profile.streak =
        profile.streak || 0
    }

    await supabase
      .from("profiles")
      .update({
        level: profile.level,
        exp: profile.exp,
        saisonmarken: profile.saisonmarken,
        muenzen: profile.muenzen,
        streak: profile.streak,
        best_streak: profile.best_streak,
        games_played: profile.games_played
      })
      .eq("id", currentUser.id)

    await saveGameState(false)
    await loadProfile()
    showEndOverlay(false)

    return
  }

  await saveGameState(false)
}



// =====================================================
// OVERLAY
// =====================================================

function showEndOverlay(won) {

  const old =
    document.getElementById(
      "endOverlay"
    )

  if (old) {
    old.remove()
  }

  const overlay =
    document.createElement("div")

  overlay.id =
    "endOverlay"

  const tries =
    won ? row + 1 : 6

  const earnedCoins =
    roundCoins

  const earnedExp =
    roundExp

  const earnedMarken =
    roundSaisonmarken

  const currentLevel =
    profile.level

  const expNeeded =
    getNeededExp(
      currentLevel
    )

  const currentExp =
    profile.exp

  overlay.innerHTML = `

    <div class="overlay-box">

      <h1>
        ${
          won
            ? "TIPPI TOPPI!"
            : "SATZ MIT X..."
        }
      </h1>

      <p>
        Wort:
        <b>${targetWord}</b>
      </p>

      <p>
        Versuche:
        <b>${tries}</b>
        / 6
      </p>

      <p>
        Marken erhalten:
        <b>+${earnedMarken}</b>
      </p>

      <p>
        EXP erhalten:
        <b>+${earnedExp}</b>
      </p>

      <p>
        Level:
        <b>${currentLevel}</b>

        <span class="overlay-sub">
          (${currentExp}/${expNeeded} EXP)
        </span>
      </p>

      <div class="overlay-buttons">

        <button id="overlayBtn">
          Hauptmenü
        </button>

        ${
          won &&
          bonusWord &&
          !isBonusGame &&
          !bonusCompleted
            ? `
        <button id="bonusBtn">
          Bonus Wort
        </button>
        `
            : ""
        }

      </div>

    </div>
  `

  document.body.appendChild(
    overlay
  )

  // =====================================
  // HAUPTMENÜ
  // =====================================

  document
    .getElementById(
      "overlayBtn"
    )
    .addEventListener(
      "click",
      () => {

        window.location.href =
          "hauptmenue.html"
      }
    )

  // =====================================
  // BONUS BUTTON
  // =====================================

  const bonusBtn =
    document.getElementById(
      "bonusBtn"
    )

  if (bonusBtn) {

  bonusBtn
    .addEventListener(
      "click",
      async () => {

        document
          .getElementById("endOverlay")
          ?.remove()

        await startBonusGame()
      }
    )
}
}


// =====================================================
// FULLY COMPLETED
// =====================================================

function showFullyCompletedOverlay() {

  const old =
    document.getElementById(
      "endOverlay"
    )

  if (old) {
    old.remove()
  }

  const overlay =
    document.createElement("div")

  overlay.id =
    "endOverlay"

  overlay.innerHTML = `

    <div class="overlay-box">

      <h1>
        ABGEHAKT!
      </h1>

      <p>
        Du hast heute das Tageswort und das Bonus-Wort gelöst.
      </p>

      <button id="overlayBtn">
        Hauptmenü
      </button>

    </div>
  `

  document.body.appendChild(
    overlay
  )

  document
    .getElementById(
      "overlayBtn"
    )
    .addEventListener(
      "click",
      () => {

        window.location.href =
          "hauptmenue.html"
      }
    )
}



// =====================================================
// PHYSICAL KEYBOARD
// =====================================================

document.addEventListener(
  "keydown",
  async (e) => {

    const key =
      e.key.toUpperCase()

    if (key === "BACKSPACE") {

      await handleKey("⌫")
      return
    }

    if (key === "ENTER") {

      await check()
      return
    }

    if (
      /^[A-ZÄÖÜ]$/.test(key)
    ) {

      await handleKey(key)
    }
  }
)


// =====================================================
// LEVEL UP OVERLAY
// =====================================================

function showLevelUpOverlay(
  oldLevel,
  newLevel
) {

  // Bereits offen?
  const old =
    document.getElementById(
      "levelUpOverlay"
    )

  if (old) {
    old.remove()
  }

  const overlay =
    document.createElement("div")

  overlay.id =
    "levelUpOverlay"

  overlay.innerHTML = `

  <div class="levelup-box">

    <div class="levelup-icon">

  <img
    src="levelup.png"
    alt="Level Up"
    class="levelup-image"
  >

</div>

    <h2>
      LEVEL UP!
    </h2>

    <p class="levelup-text">

      Du bist jetzt<br>

      Level

      <b>${newLevel}</b>

    </p>

    <button
      id="levelupContinueBtn"
      class="levelup-btn"
    >
      Weiter
    </button>

  </div>
`

  document.body.appendChild(
    overlay
  )

  // Animation
  setTimeout(() => {

    overlay.classList.add(
      "show"
    )

  }, 10)

  // Weiter Button
  document
    .getElementById(
      "levelupContinueBtn"
    )
    .addEventListener(
      "click",
      () => {

        overlay.classList.remove(
          "show"
        )

        setTimeout(() => {
          overlay.remove()
        }, 250)
      }
    )
}



// =====================================================
// START BONUS GAME
// =====================================================

async function startBonusGame() {

  if (!bonusWord) return

  // =================================
  // BONUS STATUS
  // =================================

  isBonusGame = true
  gameOver = false

  targetWord = bonusWord

  // =================================
  // LEERES BOARD
  // =================================

  board = Array.from(
    { length: 6 },
    () => Array(5).fill("")
  )

  row = 0
  col = 0

  // =================================
  // RESET REWARDS
  // =================================

  rewardedLetters =
    new Set()

  roundCoins = 0
  roundExp = 0
  roundSaisonmarken = 0

  // =================================
  // OVERLAY WEG
  // =================================

  document
    .getElementById("endOverlay")
    ?.remove()

  // =================================
  // GRID KOMPLETT NEU
  // =================================

  buildGrid()

  renderBoard()

  // =================================
  // KEYBOARD RESET
  // =================================

  Object.values(keyMap)
    .forEach(key => {

      key.classList.remove(
        "gray",
        "orange",
        "green",
        "purple"
      )
    })

  // =================================
  // BONUS SAVE
  // =================================

  await saveGameState(false)

  // =================================
  // STATUS
  // =================================

  status.innerText =
    "BONUS-WORT!"
}


// =====================================================
// START
// =====================================================

import { ensureDailyWord } from "./daily_word.js"

async function startGame() {

  roundCoins = 0
  roundExp = 0
  roundSaisonmarken = 0
  rewardedLetters = new Set()

  await loadUser()
  await loadProfile()

  await ensureDailyWord()

  await loadDailyWord()

  buildGrid()
  buildKeyboard()

  initPowerups({

 currentUser,
 grid,
 keyMap,
 targetWord,
 board,
 row

})

  await loadGameState()
}

startGame()