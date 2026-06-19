// ================================
// SUPABASE
// ================================

import { createClient } from "https://esm.sh/@supabase/supabase-js"


const supabaseUrl =
  "https://oeqoqwbsqilaqkuhlfcb.supabase.co"


const supabaseKey =
  "sb_publishable_XDc991FgppM8_V6IjNtC2g_Ziv2MEs8"


const supabase =
  createClient(
    supabaseUrl,
    supabaseKey
  )



// =====================================================
// GAME DATA
// =====================================================

let gameData = {

  currentUser: null,
  grid: null,
  keyMap: null,
  targetWord: "",
  board: [],
  row: 0

}



// =====================================================
// INIT
// =====================================================

export function initPowerups(data){

  gameData = {

    ...gameData,

    ...data

  }

}



export function updatePowerupsState(data){

  gameData = {

    ...gameData,

    ...data

  }

}



// =====================================================
// POWERUP OVERLAY
// =====================================================

export async function showPowerupOverlay(){


  const {
    data: inventory
  } =
  await supabase
    .from("user_inventory")
    .select("*")
    .eq(
      "user_id",
      gameData.currentUser.id
    )



  const powerups =
    (inventory || [])
    .filter(item =>
      item.item_type === "powerup"
    )



  // XP BOOST AUSBLENDEN

  const filtered =
    powerups.filter(item =>
      item.item_name
      ?.toLowerCase()
      !==
      "xp boost"
    )



  document
    .getElementById(
      "powerupOverlay"
    )
    ?.remove()



  const overlay =
    document.createElement("div")


  overlay.id =
    "powerupOverlay"


  let html = ""



  filtered.forEach(item=>{


    if(item.amount <= 0)
      return



    html += `
  <label class="powerup-option">

    <input 
      type="checkbox"
      value="${item.item_id}"
    >

    <div class="powerup-content">

      <div class="powerup-title">
        ${item.item_name}
      </div>

      <div class="powerup-count">
        Anzahl: ${item.amount}
      </div>

    </div>

  </label>
`

  })



  if(html === ""){

    html = `

    <p>
      Keine Powerups vorhanden
    </p>

    `

  }



  overlay.innerHTML = `


<div class="levelup-box">


<h2>
POWERUPS EINSETZEN
</h2>


<div id="powerupList">

${html}

</div>


<button
id="powerupConfirm"
class="levelup-btn">

Weiter ohne

</button>


</div>


`



  document.body.appendChild(
    overlay
  )



  setTimeout(()=>{

    overlay.classList.add(
      "show"
    )

  },10)



  const checks =
    document.querySelectorAll(
      "#powerupList input"
    )



  const button =
    document.getElementById(
      "powerupConfirm"
    )



  checks.forEach(check=>{


    check.onchange = ()=>{


      const selected =
        [...checks]
        .some(
          c=>c.checked
        )



      button.innerText =
        selected
          ?
          "Bestätigen"
          :
          "Weiter ohne"

    }


  })



  button.onclick = async ()=>{


    const selected =
      [...checks]
      .filter(
        c=>c.checked
      )



    overlay.remove()



    for(
      const item of selected
    ){

      await usePowerup(
        item.value
      )

    }


  }


}



// =====================================================
// POWERUP VERBRAUCH
// =====================================================

async function usePowerup(itemId){


  const {
    data
  } =
  await supabase
    .from("user_inventory")
    .select("*")
    .eq(
      "user_id",
      gameData.currentUser.id
    )
    .eq(
      "item_id",
      itemId
    )
    .single()



  if(
    !data ||
    data.amount <= 0
  )
    return



  if(
    data.item_name === "Hinweis"
  ){

    useHint()

  }



  if(
    data.item_name === 
    "Falsche Buchstaben entfernen"
  ){

    removeWrongLetters()

  }



  await supabase
    .from("user_inventory")
    .update({

      amount:
        data.amount - 1

    })
    .eq(
      "user_id",
      gameData.currentUser.id
    )
    .eq(
      "item_id",
      itemId
    )


}



// =====================================================
// HINWEIS
// =====================================================

function useHint(){


  const {
    grid,
    keyMap,
    targetWord,
    row
  } =
  gameData



  if(!grid)
    return



  for(
    let i = 0;
    i < targetWord.length;
    i++
  ){


    const cell =
      grid.children[row]
      ?.children[i]



    if(!cell)
      continue



    // Position schon grün?

    if(
      cell.classList.contains(
        "green"
      )
    ){

      continue

    }



const letter =
  targetWord[i]

cell.innerText =
  letter

gameData.board[row][i] = letter

cell.classList.remove(
  "gray",
  "orange",
  "purple"
)

cell.classList.add("green")

// 👉 KEYBOARD UPDATE (WICHTIG)
keyMap[letter]
  ?.classList.remove(
    "gray",
    "orange",
    "purple"
  )

keyMap[letter]
  ?.classList.add("green")

break

  }


}



// =====================================================
// FALSCHE BUCHSTABEN ENTFERNEN
// =====================================================

function removeWrongLetters(){


  const {
    keyMap,
    targetWord
  } =
  gameData



  Object.keys(
    keyMap
  )
  .forEach(letter=>{


    if(
      !targetWord.includes(
        letter
      )
    ){


keyMap[letter]
.classList.remove(
 "green",
 "orange",
 "purple"
)

keyMap[letter]
.classList.add(
 "gray"
)


    }


  })


}