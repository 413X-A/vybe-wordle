import { supabase } from "./supabase.js"

// ===============================
// ELEMENTE
// ===============================
const usernameInput = document.getElementById("username")
const emailInput = document.getElementById("email")
const passwordInput = document.getElementById("password")
const status = document.getElementById("status")
const loginBtn = document.getElementById("loginBtn")

loginBtn.addEventListener("click", handleLogin)

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin()
})

// ===============================
// LOGIN / SIGNUP
// ===============================
async function handleLogin() {

  const username = usernameInput.value.trim()
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()

  if (!email || !password) {
    status.innerText = "Email + Passwort fehlt"
    return
  }

  // =========================
  // LOGIN
  // =========================
  const { data: loginData } =
    await supabase.auth.signInWithPassword({
      email,
      password
    })

  if (loginData?.user) {
    status.innerText = "Login erfolgreich"

    setTimeout(() => {
      window.location.href = "hauptmenue.html"
    }, 500)

    return
  }

  // =========================
  // SIGNUP
  // =========================
  const { data: signUpData, error: signUpError } =
    await supabase.auth.signUp({
      email,
      password
    })

  if (signUpError) {
    status.innerText = signUpError.message
    return
  }

  const user =
    signUpData.user ||
    signUpData.session?.user

  if (!user) {
    status.innerText = "Bitte Email bestätigen"
    return
  }

  // =========================
  // DEFAULT AVATAR HOLEN
  // =========================
  const { data: defaultAvatar } = await supabase
    .from("shop_public")
    .select("id, name, icon, type")
    .eq("type", "avatar")
    .eq("name", "Standard Avatar")
    .single()

  // =========================
  // PROFIL ERSTELLEN
  // =========================
  const { error: profileError } =
    await supabase.from("profiles").insert({
      id: user.id,
      username: username || "Player",
      email: email,
      level: 1,
      exp: 0,
      muenzen: 0,
      saisonmarken: 0,
      saisonpass_stufe: 0,
      streak: 0,
      best_streak: 0,
      games_played: 0,
      powerups: 0,

      equipped_avatar: defaultAvatar?.id || null
    })

  if (profileError) {
    status.innerText = profileError.message
    return
  }

  // =========================
  // 🔥 DEFAULT AVATAR ALS GEKAUFT EINTRAGEN
  // =========================
  if (defaultAvatar?.id) {

    await supabase.from("user_inventory").insert({
      user_id: user.id,
      item_id: defaultAvatar.id,
      item_name: defaultAvatar.name,
      item_icon: defaultAvatar.icon || null,
      item_type: defaultAvatar.type,
      amount: 1
    })
  }

  status.innerText = "Account erstellt"

  setTimeout(() => {
    window.location.href = "hauptmenue.html"
  }, 500)
}