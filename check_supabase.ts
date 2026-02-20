import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kezzelegsfgeggoqjlal.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlenplbGVnc2ZnZWdnb3FqbGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzI3MTgsImV4cCI6MjA4NzE0ODcxOH0.EPlab9bZ0CgO_3nKA0rx1UMwFIQdRHxxTaEyiSOhX0s'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkMarkets() {
    const { data, error } = await supabase.from('markets').select('*')
    if (error) {
        console.error('Error fetching markets:', error)
    } else {
        console.log(`Found ${data.length} markets in Supabase:`)
        console.log(data)
    }
}

checkMarkets()
