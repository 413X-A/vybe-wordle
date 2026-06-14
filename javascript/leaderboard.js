import { supabase }
from "./supabase.js"

import {

  currentUser,
  profile

} from "./globalState.js"


// =====================================================
// WEEK KEY
// =====================================================

function getWeekKey() {

  const now =
    new Date()

  return (

    now.getFullYear()

    + "-W" +

    Math.ceil(
      now.getDate() / 7
    )
  )
}


// =====================================================
// CALCULATE SCORE
// =====================================================

function calculateScore() {

  if (!profile) {
    return 0
  }

  return (

    // STREAK WICHTIG
    (
      profile.streak * 500
    )

    +

    // LEVEL
    (
      profile.level * 100
    )

    +

    // REST EXP
    (
      profile.exp || 0
    )

    +

    // GESPIELTE SPIELE
    (
      profile.games_played * 10
    )
  )
}


// =====================================================
// UPDATE LEADERBOARD
// =====================================================

export async function updateLeaderboard() {

  if (
    !currentUser ||
    !profile
  ) {

    return
  }

  const score =
    calculateScore()

  const weekKey =
    getWeekKey()

  const saveData = {

    user_id:
      currentUser.id,

    username:
      profile.username,

    week_key:
      weekKey,

    score:
      score,

    level:
      profile.level,

    streak:
      profile.streak
  }

  const { error } =
    await supabase
      .from(
        "leaderboard_weekly"
      )
      .upsert(
        saveData,
        {
          onConflict:
            "user_id,week_key"
        }
      )

  if (error) {
    
    return
  }

}


// =====================================================
// GET TOP PLAYERS
// =====================================================

export async function loadTopPlayers() {

  const weekKey =
    getWeekKey()

  const {
    data,
    error
  } =
    await supabase
      .from(
        "leaderboard_weekly"
      )
      .select("*")
      .eq(
        "week_key",
        weekKey
      )
      .order(
        "score",
        {
          ascending: false
        }
      )
      .limit(100)

  if (error) {

    return []
  }

  return data || []
}


// =====================================================
// GET PLAYER RANK
// =====================================================

export async function getMyRank() {

  const topPlayers =
    await loadTopPlayers()

  const index =
    topPlayers.findIndex(

      p =>

        p.user_id ===
        currentUser.id
    )

  if (index === -1) {

    return null
  }

  return index + 1
}
