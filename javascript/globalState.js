// =====================================================
// GLOBAL STATE
// =====================================================

export let currentUser = null

export let profile = null

// =====================================================
// SET USER
// =====================================================

export function setCurrentUser(
  user
) {

  currentUser = user
}

// =====================================================
// SET PROFILE
// =====================================================

export function setProfile(
  newProfile
) {

  profile = newProfile
}