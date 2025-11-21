const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Nur POST-Anfragen erlaubt' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id } = JSON.parse(event.body);
    const linkId = event.headers['x-link-id']; 

    if (!id || !linkId || linkId === 'GUEST') {
        return { statusCode: 400, body: 'Reservierung nur mit gültiger Link-ID möglich.' };
    }

    try {
        const { error, count } = await supabase
            .from('Wishes')
            .update({ 
                is_chosen: true, 
                chosen_by_link_id: linkId 
            })
            .eq('id', id) 
            .select() 
            .limit(1) 
            .maybeSingle(); 

        if (error) {
            // Fängt Fehler ab, z.B. wenn RLS das Update wegen is_chosen=true verweigert
            return {
                statusCode: 409, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Reservierung fehlgeschlagen. Das Geschenk ist bereits vergeben oder ein Datenbankfehler ist aufgetreten.' })
            };
        }
        
        // Wenn 0 Zeilen aktualisiert wurden, bedeutet dies, dass die RLS-Regel blockiert hat (z.B. schon reserviert)
        if (count === 0) {
             return {
                statusCode: 409, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Reservierung fehlgeschlagen. Das Geschenk ist bereits vergeben.' })
            };
        }


        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Geschenk erfolgreich reserviert.' }),
        };

    } catch (error) {
        console.error('Allgemeiner Fehler bei Reservierung:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Serverfehler.' }) };
    }

};

