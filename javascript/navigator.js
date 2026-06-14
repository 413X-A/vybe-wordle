// ================================
// SUPABASE
// ================================

import { createClient }
from "https://esm.sh/@supabase/supabase-js"

const supabaseUrl =
"https://oeqoqwbsqilaqkuhlfcb.supabase.co"

const supabaseKey =
"sb_publishable_XDc991FgppM8_V6IjNtC2g_Ziv2MEs8"

const supabase =
createClient(
    supabaseUrl,
    supabaseKey
)

// =====================================
// LOGOUT
// =====================================

const logoutBtn = document.getElementById("logoutNode")

if (logoutBtn) {

  logoutBtn.addEventListener("click", async () => {

    await supabase.auth.signOut()

    window.location.href = "index.html"
  })
}



// =====================================
// HOME NODE
// =====================================

const homeNode =
  document.getElementById(
    "homeNode"
  )

if (homeNode) {

  homeNode.addEventListener(
    "click",
    () => {

      animate(homeNode)

      setTimeout(() => {

        window.location.href =
          "hauptmenue.html"

      }, 150)
    }
  )
}


// =====================================
// DAILY NODE
// =====================================

const dailyNode =
  document.getElementById(
    "dailyNode"
  )

if (dailyNode) {

  dailyNode.addEventListener(
    "click",
    () => {

      animate(dailyNode)

      setTimeout(() => {

        window.location.href =
          "daily.html"

      }, 150)
    }
  )
}


// =====================================
// SHOP NODE
// =====================================

const shopNode =
  document.getElementById(
    "shopNode"
  )

if (shopNode) {

  shopNode.addEventListener(
    "click",
    () => {

      animate(shopNode)

      setTimeout(() => {

        window.location.href =
          "shop.html"

      }, 150)
    }
  )
}

// =====================================
// LEADERBOARD NODE
// =====================================

const leaderboardNode =
  document.getElementById(
    "leaderboardNode"
  )

if (leaderboardNode) {

  leaderboardNode
    .addEventListener(
      "click",
      () => {

        animate(
          leaderboardNode
        )

        setTimeout(() => {

          window.location.href =
            "leaderboard.html"

        }, 150)
      }
    )
}


// =====================================
// SIMPLE ANIMATION
// =====================================

function animate(el) {

  el.style.transform =
    "scale(0.95)"

  setTimeout(() => {

    el.style.transform =
      "scale(1)"

  }, 150)
}