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
            
            let statusText = '';
            if (isReserved) {
                // Nur wenn Link-ID vorhanden ist UND die private Spalte von der Function gesendet wurde
                if (linkId && item.chosen_by_link_id) { 
                    const reservedById = item.chosen_by_link_id;
                    if (reservedById === linkId) {
                        statusText = ' (Von DIR reserviert)';
                    } else {
                        statusText = ` (Reserviert von Link: ${reservedById.substring(0, 6)}...)`;
                    }
                } else {
                    // Sichtbar für das Geburtstagskind (keine Link-ID-Info)
                    statusText = ' (Reserviert)'; 
                }
            }
            
            const btnDisabled = isReserved || !linkId;
            const btnText = isReserved ? 'Reserviert' : 'Reservieren';

            itemElement.innerHTML = `
                <span>${item.geschenk_name} ${statusText}</span>
                <button class="reserve-btn" data-id="${item.wunsch_id}" ${btnDisabled ? 'disabled' : ''}>
                    ${btnText}
                </button>
            `;

            if (!btnDisabled) {
                itemElement.querySelector('.reserve-btn').addEventListener('click', () => {
                    reserveGift(item.wunsch_id, linkId);
                });
            }

            wishlistContainer.appendChild(itemElement);
        });
    }

    // --- 4. Reservierung senden ---
    async function reserveGift(wunsch_id, linkId) {
        if (!confirm(`Möchtest du "${wunsch_id}" wirklich reservieren?`)) {
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/wunsch-reservieren', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Link-ID': linkId
                },
                body: JSON.stringify({ wunsch_id })
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