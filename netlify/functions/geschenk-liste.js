const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // Supabase-Konstanten aus Umgebungsvariablen (Netlify-Dashboard)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    // Initialisierung
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Identifizierung über den Header
    const linkId = event.headers['x-link-id'] || null; 
    const isGifter = !!linkId && linkId !== 'GUEST';

    try {
        let { data, error } = await supabase
            .from('Wishes')
            .select('*') 
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Datenschutz-Logik: Filtern der Spalten im JS-Code
        const filteredWishes = data.map(item => {
            const baseData = {
                wunsch_id: item.id, // Supabase 'id'
                geschenk_name: item.geschenk_name,
                is_chosen: item.is_chosen,
            };

            // Wenn es ein Schenkender ist, fügen wir die private Information hinzu.
            if (isGifter) {
                return {
                    ...baseData,
                    // WICHTIG: Diese Spalte ist nur für Schenkende sichtbar!
                    chosen_by_link_id: item.chosen_by_link_id 
                };
            } else {
                // Geburtstagskind/Öffentlichkeit sieht diese Spalte NICHT
                return baseData;
            }
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filteredWishes),
        };

    } catch (error) {
        console.error('Fehler beim Abrufen der Wunschliste:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Fehler beim Datenbankzugriff.' }) };
    }

};
