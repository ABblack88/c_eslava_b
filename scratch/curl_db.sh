URL=$(grep "SUPABASE_URL" js/supabase.js | cut -d"'" -f2)
KEY=$(grep "SUPABASE_KEY" js/supabase.js | cut -d"'" -f2)
curl -s -X GET "$URL/rest/v1/servicios?nombre=eq.Evaluaci%C3%B3n%20F%C3%ADsica" \
-H "apikey: $KEY" \
-H "Authorization: Bearer $KEY"
