const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Nur POST-Anfragen erlaubt' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Erwarte die ID des Wunsches aus dem Body
    const { id } = JSON.parse(event.body);
    // Erwarte die ID des Listenbesitzers aus dem Header
    const ownerId = event.headers['x-link-id'];

    if (!id || !ownerId || ownerId === 'GUEST') {
        return { statusCode: 400, body: 'Ungültige Wunsch-ID oder Besitzer-ID fehlt.' };
    }

    try {
        // Lösche den Wunsch NUR, wenn der list_owner_id-Wert mit dem Header-Wert übereinstimmt.
        // Das ist die erste Sicherheitsstufe.
        const { error, count } = await supabase
            .from('Wishes')
            .delete()
            .eq('id', id)
            .eq('list_owner_id', ownerId) // WICHTIG: Nur löschen, wenn man der Besitzer ist!
            .select() // Liefert die Anzahl der gelöschten Zeilen
            .maybeSingle();

        if (error) throw error;

        if (count === 0) {
            // Dies passiert, wenn RLS blockiert oder die Bedingung (eq) nicht erfüllt ist (falscher Besitzer)
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Löschen fehlgeschlagen. Du bist nicht der Besitzer dieses Wunsches.' })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Wunsch erfolgreich gelöscht.' }),
        };

    } catch (error) {
        console.error('Fehler beim Löschen des Wunsches:', error);
        return { statusCode: 500, body: JSON.stringify({ error: `Serverfehler: ${error.message}` }) };
    }
};
