document.addEventListener('DOMContentLoaded', () => {
    const wishlistContainer = document.getElementById('wishlist-container');
    const linkStatus = document.getElementById('link-status');
    
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
        ? `Dein Link-Status: ${linkId} (Du siehst, wer reserviert hat!)` 
        : `Dein Status: Geburtstagskind/Öffentlich (Reservierungen sind anonym.)`;

    // --- 2. Wunschliste abrufen ---
    async function loadWishlist() {
        wishlistContainer.innerHTML = 'Lade Wunschliste...';
        
        try {
            const response = await fetch('/.netlify/functions/geschenk-liste', {
                method: 'GET',
                headers: {
                    // WICHTIG: Sende die ID, um die korrekte Datenansicht zu erhalten
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
            wishlistContainer.innerHTML = '<p>Die Liste ist leer. Füge Wünsche in Supabase hinzu!</p>';
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
                // Nur wenn Link-ID vorhanden ist UND die private Spalte von der Function gesendet wurde
                if (linkId && item.chosen_by_link_id) { 
                    const reservedById = item.chosen_by_link_id;
                    
                    // Korrektur: Neuer Anzeigetext mit CSS-Klasse für die Breite
                    statusTextHtml = `<span class="reserved-status">Reserviert von: <span class="reserved-by-name">${reservedById}</span></span>`;
                } else {
                    // Sichtbar für das Geburtstagskind (keine Link-ID-Info)
                    statusTextHtml = '<span class="reserved-status">(Reserviert)</span>'; 
                }
            }
            
            const btnDisabled = isReserved || !linkId;
            const btnText = isReserved ? 'Reserviert' : 'Reservieren';

            // Korrektur: HTML-Struktur für statusTextHtml angepasst
            itemElement.innerHTML = `
                <span>${item.geschenk_name} ${statusTextHtml}</span>
                <button class="reserve-btn" data-id="${item.id}" ${btnDisabled ? 'disabled' : ''}>
                    ${btnText}
                </button>
            `;

            if (!btnDisabled) {
                // HINWEIS: Hier wurde von wunsch_id auf id korrigiert, falls Ihre Supabase-Tabelle 'id' verwendet.
                itemElement.querySelector('.reserve-btn').addEventListener('click', () => {
                    reserveGift(item.id, linkId); 
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
                body: JSON.stringify({ wunsch_id: id }) // Sendet die ID
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

    loadWishlist();
});

