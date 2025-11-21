const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    
    // 💡 HIER IST DIE NEUE ZEILE (Punkt A)
    console.log('>>> [START] wunsch-erstellen Function gestartet. Link-ID im Header:', event.headers['x-link-id']);

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Nur POST-Anfragen erlaubt' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    // Initialisierung
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Geschenkname aus dem Body lesen
    const { name } = JSON.parse(event.body); 
    // Listenbesitzer-ID aus dem Header (wird von app.js gesendet)
    const ownerId = event.headers['x-link-id']; 

    // 💡 HIER IST DIE NEUE ZEILE (Punkt B: Prüft, ob die Daten vom Body lesbar sind)
    console.log('Wunsch-Daten: ', { name, ownerId });


    // Sicherheitsprüfung: Nur mit gültigem Link-Namen erlauben
    if (!name || !ownerId || ownerId === 'GUEST') {
        return { statusCode: 400, body: 'Name des Geschenks oder gültige Link-ID des Besitzers fehlt.' };
    }

    try {
        const { error } = await supabase
            .from('Wishes')
            .insert({ 
                geschenk_name: name,
                list_owner_id: ownerId, // WICHTIG: Setzt den Besitzer der Liste
                is_chosen: false,
                chosen_by_link_id: null
            });

        if (error) {
             console.error('Supabase Fehler beim INSERT:', error);
             throw new Error(`DB Error: ${error.message}`);
        }
        
        // 💡 HIER IST DIE NEUE ZEILE (Punkt C: Bestätigt erfolgreichen DB-Eintrag)
        console.log(`Wunsch "${name}" erfolgreich für OwnerId: ${ownerId} erstellt.`);


        return {
            statusCode: 201, // 201 Created
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Wunsch erfolgreich erstellt.' }),
        };

    } catch (error) {
        console.error('Allgemeiner Fehler beim Erstellen des Wunsches:', error);
        return { statusCode: 500, body: JSON.stringify({ error: `Serverfehler: ${error.message}` }) };
    }
};
