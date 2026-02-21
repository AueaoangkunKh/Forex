import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://nxrssjsusqkhlhuhrrhf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cnNzanN1c3FraGxodWhycmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzE3MzgsImV4cCI6MjA4NzI0NzczOH0.iD0aL444fBHshE6V6y5CtIOeVr29qr9DkWfqrzC6Lc4'

export const supabase = createClient(supabaseUrl, supabaseKey)