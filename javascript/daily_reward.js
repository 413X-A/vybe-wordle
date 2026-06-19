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



// =================================
// START
// =================================

export async function checkDailyReward(){


const {
 data:userData
}
=
await supabase.auth.getUser()



const user =
userData?.user



if(!user)
return



const today =
new Date()
.toISOString()
.split("T")[0]




// =================================
// SCHON HEUTE ABGEHOLT?
// =================================


const {
data:already
}
=
await supabase
.from("user_daily_rewards")
.select("*")
.eq(
 "user_id",
 user.id
)
.gte(
 "claimed_at",
 today + "T00:00:00"
)
.lt(
 "claimed_at",
 today + "T23:59:59"
)
.maybeSingle()



if(already){

return

}





// =================================
// LETZTE ABHOLUNGEN LADEN
// =================================


const {
data:history
}
=
await supabase
.from("user_daily_rewards")
.select("*")
.eq(
 "user_id",
 user.id
)
.order(
 "claimed_at",
 {
  ascending:false
 }
)



let nextDay = 1



if(history && history.length){


const last =
new Date(
history[0].claimed_at
)


const now =
new Date()



if(
isSameWeek(
last,
now
)
){

nextDay =
history.length + 1


}


}




if(nextDay > 7){

nextDay = 7

}




// =================================
// REWARD AUS DB HOLEN
// =================================


const {
data:reward
}
=
await supabase
.from("daily_rewards")
.select("*")
.eq(
 "day",
 nextDay
)
.single()



if(!reward)
return





// =================================
// SPIELER PROFIL LADEN
// =================================


const {
data:profile
}
=
await supabase
.from("profiles")
.select("*")
.eq(
 "id",
 user.id
)
.single()



if(!profile)
return





// =================================
// BELOHNUNG GEBEN
// =================================


await supabase
.from("profiles")
.update({

exp:
(profile.exp || 0)
+
reward.exp,


muenzen:
(profile.muenzen || 0)
+
reward.muenzen,


saisonmarken:
(profile.saisonmarken || 0)
+
reward.saisonmarken


})
.eq(
"id",
user.id
)





// =================================
// ALS ABGEHOLT SPEICHERN
// =================================


await supabase
.from("user_daily_rewards")
.insert({

user_id:
user.id,

reward_day:
nextDay

})





showDailyRewardOverlay(
 reward
)



}




// =================================
// WOCHEN CHECK
// =================================

function isSameWeek(
a,
b
){


const weekA =
getWeekNumber(a)


const weekB =
getWeekNumber(b)



return (
weekA === weekB &&
a.getFullYear()
===
b.getFullYear()
)

}



function getWeekNumber(date){


const d =
new Date(
Date.UTC(
date.getFullYear(),
date.getMonth(),
date.getDate()
)
)



const dayNum =
d.getUTCDay()
||
7



d.setUTCDate(
d.getUTCDate()
+
4
-
dayNum
)



const yearStart =
new Date(
Date.UTC(
d.getUTCFullYear(),
0,
1
)
)



return Math.ceil(
(
(
d-yearStart
)
/86400000
+1
)
/7
)

}





// =================================
// OVERLAY
// =================================

function showDailyRewardOverlay(
reward
){


const old =
document.getElementById(
"dailyRewardOverlay"
)


if(old)
old.remove()



const overlay =
document.createElement(
"div"
)


overlay.id =
"dailyRewardOverlay"



overlay.innerHTML = `

<div class="levelup-box">


<h2>
🎁 DAILY REWARD
</h2>


<p>

Du hast deine Belohnung erhalten!

</p>


<p>

+${reward.exp} EXP

<br>

+${reward.muenzen} Münzen

<br>

+${reward.saisonmarken} Saisonmarken

</p>



<button
class="levelup-btn"
id="dailyClose">

Weiter

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



document
.getElementById(
"dailyClose"
)
.onclick=()=>{

overlay.remove()

}


}