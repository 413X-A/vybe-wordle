// =====================================================
// SUPABASE CLIENT
// =====================================================

import { createClient }
from "https://esm.sh/@supabase/supabase-js"

const supabaseUrl =
  "https://oeqoqwbsqilaqkuhlfcb.supabase.co"

const supabaseKey =
  "sb_publishable_XDc991FgppM8_V6IjNtC2g_Ziv2MEs8"

export const supabase =
  createClient(
    supabaseUrl,
    supabaseKey
  )