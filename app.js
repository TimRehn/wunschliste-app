document.addEventListener('DOMContentLoaded', () => {
    const wishlistContainer = document.getElementById('wishlist-container');
    const linkStatus = document.getElementById('link-status');
    // NEU: Elemente für die Wunsch-Erstellung
    const addWishSection = document.getElementById('add-wish-section');
    const addWishForm = document.getElementById('add-wish-form');
    const giftNameInput = document.getElementById('gift-name-input');
    const addWishMessage = document.getElementById('add-wish-message');
    
    // --- 1. Link-ID verarbeiten ---
    const urlParams = new URLSearchParams(window.location.search);
    let linkId = urlParams.get('id');

    if (linkId) {
        // ID in LocalStorage speichern und URL bereinigen
        localStorage.setItem('birthday_link_id', linkId);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // ID aus LocalStorage holen
        linkId = localStorage.getItem('birthday_link_id');
    }
    
    const actualLinkId = linkId || 'GUEST';
    linkStatus.textContent = linkId 
        ? `Dein Link-Status: ${linkId} (Du siehst, wessen Liste du siehst und wer reserviert hat!)` 
        : `Dein Status: Öffentlich (Du siehst eine allgemeine Liste und kannst anonym reservieren.)`;
    
    // NEU: Nur das Erstellungsformular anzeigen, wenn eine Link-ID vorhanden ist (Eigentümer)
    if (!linkId) {
        addWishSection.style.display = 'none';
    } else {
         // Den Header anpassen, um anzuzeigen, dass der Nutzer die Liste bearbeiten kann
         addWishSection.querySelector('h2').textContent = `Wunschliste von ${linkId} bearbeiten`;
    }

    // --- 2. Wunschliste abrufen ---
    async function loadWishlist() {
        wishlistContainer.innerHTML = 'Lade Wunschliste...';
        
        try {
            const response = await fetch('/.netlify/functions/geschenk-liste', {
                method: 'GET',
                headers: {
                    // Sende die ID, um die korrekte (gefilterte) Wunschliste zu erhalten
                    'X-Link-ID': actualLinkId 
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Daten vom Server.');
            }

            const wishlist = await response.json();
            renderWishlist(wishlist);
        } catch (error) {
            wishlistContainer.innerHTML = `<p style="color: red;">Fehler: ${error.message}. Bitte überprüfe die Netlify Functions und Supabase.</p>`;
        }
    }

    // --- 3. Wunschliste rendern ---
    function renderWishlist(wishlist) {
        wishlistContainer.innerHTML = ''; 

        if (wishlist.length === 0) {
            const ownerText = linkId ? `für ${linkId}` : '';
            wishlistContainer.innerHTML = `<p>Diese Wunschliste ${ownerText} ist leer. Füge Wünsche hinzu!</p>`;
            return;
        }

        wishlist.forEach(item => {
            const isReserved = item.is_chosen;
            const itemElement = document.createElement('div');
            itemElement.classList.add('wish-item');
            if (isReserved) {
                itemElement.classList.add('reserved');
            }
            
            let statusTextHtml = '';
            
            // Logik zur Anzeige des Reservierungsstatus
            if (isReserved) {
                if (linkId && item.chosen_by_link_id) { 
                    const reservedById = item.chosen_by_link_id;
                    statusTextHtml = `<span class="reserved-status">Reserviert von: <span class="reserved-by-name">${reservedById}</span></span>`;
                } else {
                    statusTextHtml = '<span class="reserved-status">(Reserviert)</span>'; 
                }
            }
            
            const btnDisabled = isReserved || !linkId;
            const btnText = isReserved ? 'Reserviert' : 'Reservieren';

            // Verwendet item.wunsch_id wie in geschenk-liste.js definiert
            itemElement.innerHTML = `
                <span>${item.geschenk_name} ${statusTextHtml}</span>
                <button class="reserve-btn" data-id="${item.wunsch_id}" ${btnDisabled ? 'disabled' : ''}>
                    ${btnText}
                </button>
            `;

            if (!btnDisabled) {
                itemElement.querySelector('.reserve-btn').addEventListener('click', () => {
                    reserveGift(item.wunsch_id, actualLinkId); 
                });
            }

            wishlistContainer.appendChild(itemElement);
        });
    }

    // --- 4. Reservierung senden ---
    async function reserveGift(id, linkId) {
        if (!confirm(`Möchtest du das Geschenk mit der ID "${id}" wirklich reservieren?`)) {
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/wunsch-reservieren', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Link-ID': linkId
                },
                body: JSON.stringify({ id: id }) // Sendet die Geschenk-ID
            });

            if (response.status === 409) {
                alert('Reservierung fehlgeschlagen: Das Geschenk ist bereits vergeben.');
            } else if (!response.ok) {
                throw new Error('Serverfehler beim Reservieren.');
            } else {
                alert('Geschenk erfolgreich reserviert!');
            }
            
            loadWishlist(); // Liste neu laden

        } catch (error) {
            alert(`Ein Fehler ist aufgetreten: ${error.message}`);
            loadWishlist();
        }
    }
    
    // --- 5. NEUE Funktion: Wunsch erstellen ---
    async function createGift(name, ownerId) {
        const createBtn = document.getElementById('add-wish-btn');
        createBtn.disabled = true;
        addWishMessage.textContent = 'Wird gespeichert...';
        addWishMessage.style.color = 'inherit';

        try {
            const response = await fetch('/.netlify/functions/wunsch-erstellen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Die Link-ID des Besuchers ist der EIGENTÜMER der neuen Liste
                    'X-Link-ID': ownerId 
                },
                body: JSON.stringify({ name: name })
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Erstellen des Wunsches.');
            }

            addWishMessage.textContent = 'Wunsch erfolgreich hinzugefügt!';
            giftNameInput.value = '';
            loadWishlist(); // Liste neu laden
            
        } catch (error) {
            addWishMessage.textContent = `Fehler: ${error.message}`;
            addWishMessage.style.color = 'red';
        } finally {
            createBtn.disabled = false;
            // Nachricht nach 3 Sekunden ausblenden
            setTimeout(() => {
                addWishMessage.textContent = '';
                addWishMessage.style.color = 'inherit';
            }, 3000);
        }
    }
    
    // --- 6. NEU: Formular-Listener ---
    if (addWishForm) {
        addWishForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const giftName = giftNameInput.value.trim();
            if (giftName && linkId) {
                createGift(giftName, linkId);
            } else {
                addWishMessage.textContent = 'Bitte gib einen Wunschnamen ein.';
                addWishMessage.style.color = 'orange';
            }
        });
    }

    loadWishlist();
});
C. ➕ NEUE DATEI: netlify/functions/wunsch-erstellen.js
Diese Datei muss neu im Ordner netlify/functions erstellt werden.

JavaScript

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Nur POST-Anfragen erlaubt' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { name } = JSON.parse(event.body); // Geschenkname aus dem Body
    const ownerId = event.headers['x-link-id']; // Listenbesitzer-ID aus dem Header

    // Sicherheitsprüfung
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

        return {
            statusCode: 201, // 201 Created
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Wunsch erfolgreich erstellt.' }),
        };

    } catch (error) {
        console.error('Allgemeiner Fehler beim Erstellen des Wunsches:', error);
        return { statusCode: 500, body: JSON.stringify({ error: `Serverfehler: ${error.message}` }) };
    }



