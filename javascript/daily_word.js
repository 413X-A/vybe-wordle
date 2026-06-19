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


// ================================
// DATE
// ================================

function getTodayKey() {

    const d = new Date()

    return (

        d.getFullYear() + "-" +

        String(
            d.getMonth() + 1
        ).padStart(2, "0") + "-" +

        String(
            d.getDate()
        ).padStart(2, "0")
    )
}


// ================================
// RANDOM UNUSED WORD
// ================================

async function getRandomUnusedWord(
    excludeWord = ""
) {

    // =====================================
    // UNUSED WORDS HOLEN
    // =====================================

    let { data, error } =
    await supabase
        .from("words_pool")
        .select("*")
        .eq("used", false)

    if(error) {

        return null
    }

    // =====================================
    // EXCLUDE WORD
    // =====================================

    if(excludeWord) {

        data =
        data.filter(
            w =>
            w.word !== excludeWord
        )
    }

    // =====================================
    // WENN ALLE VERBRAUCHT
    // =====================================

    if(data.length === 0) {

        // RESET
        await supabase
            .from("words_pool")
            .update({

                used: false

            })
            .neq("id", 0)

        // NEU LADEN
        const result =
        await supabase
            .from("words_pool")
            .select("*")
            .eq("used", false)

        data = result.data || []

        // EXCLUDE WIEDER
        if(excludeWord) {

            data =
            data.filter(
                w =>
                w.word !== excludeWord
            )
        }
    }

    // =====================================
    // RANDOM WORD
    // =====================================

    const randomWord =
    data[
        Math.floor(
            Math.random() * data.length
        )
    ]

    if(!randomWord) {
        return null
    }

    // =====================================
    // WORD AUF USED
    // =====================================

    await supabase
        .from("words_pool")
        .update({

            used: true

        })
        .eq("id", randomWord.id)

    return randomWord.word
}


// ================================
// ENSURE DAILY WORD
// ================================

export async function ensureDailyWord() {

    const today =
    getTodayKey()

    // =====================================
    // EXISTIERT HEUTE SCHON?
    // =====================================

    const { data } =
    await supabase
        .from("daily_words")
        .select("*")
        .eq("game_date", today)
        .maybeSingle()

    if(data) {

        return
    }

    // =====================================
    // MAIN WORD
    // =====================================

    const mainWord =
    await getRandomUnusedWord()

    if(!mainWord) {

        return
    }

    // =====================================
    // BONUS WORD
    // =====================================

    const bonusWord =
    await getRandomUnusedWord(
        mainWord
    )

    if(!bonusWord) {

        return
    }

    // =====================================
    // DAILY WORD ERSTELLEN
    // =====================================

    const { error } =
    await supabase
        .from("daily_words")
        .insert({

            game_date:
            today,

            word:
            mainWord,

            bonus_word:
            bonusWord
        })

    if(error) {

        return
    }
    
}
