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
    
    // Nur das Erstellungsformular anzeigen, wenn eine Link-ID vorhanden ist (Eigentümer)
    if (addWishSection) {
        addWishSection.style.display = linkId ? 'block' : 'none';
    }

    // --- 2. Wunschliste abrufen ---
    async function loadWishlist() {
        wishlistContainer.innerHTML = 'Lade Wunschliste...';
        
        try {
            const response = await fetch('/.netlify/functions/geschenk-liste', {
                method: 'GET',
                headers: {
                    'X-Link-ID': actualLinkId 
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Wunschliste.');
            }

            const wishes = await response.json();
            renderWishlist(wishes);

        } catch (error) {
            wishlistContainer.innerHTML = `<p style="color: red;">Fehler beim Laden der Liste: ${error.message}</p>`;
        }
    }


    // --- 3. Wunschliste rendern (mit Löschen-Button) ---
    function renderWishlist(wishes) {
        wishlistContainer.innerHTML = ''; // Container leeren
        if (wishes.length === 0) {
            wishlistContainer.innerHTML = '<p>Noch keine Wünsche auf der Liste.</p>';
            return;
        }

        wishes.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = item.is_chosen ? 'wish-item reserved' : 'wish-item';
            
            // Name des Geschenks (links)
            const wishName = document.createElement('strong');
            wishName.textContent = item.geschenk_name;
            itemElement.appendChild(wishName);

            // Container für Buttons und Status (rechts)
            const rightSide = document.createElement('div');
            rightSide.style.display = 'flex';
            rightSide.style.alignItems = 'center';

            if (item.is_chosen) {
                // Anzeige für reservierte Wünsche
                const reservedStatus = document.createElement('span');
                reservedStatus.className = 'reserved-status';
                
                // Nur der Besitzer des Links (nicht GUEST) sieht den Namen
                if (linkId) {
                    const reservedByName = document.createElement('span'); 
                    reservedByName.className = 'reserved-by-name'; 
                    reservedByName.textContent = `Reserviert von: ${item.chosen_by_link_id || 'Unbekannt'}`;
                    reservedStatus.appendChild(reservedByName);

                } else {
                    reservedStatus.textContent = 'Reserviert!';
                }
                rightSide.appendChild(reservedStatus);
                
                // Freigeben-Button für den Besitzer
                if (linkId) {
                     const unreserveBtn = document.createElement('button');
                     unreserveBtn.textContent = 'Freigeben';
                     unreserveBtn.className = 'reserve-btn';
                     unreserveBtn.style.backgroundColor = '#ffc107'; // Gelb für Freigeben
                     unreserveBtn.style.marginLeft = '10px';
                     unreserveBtn.addEventListener('click', () => {
                         // unreserveGift(item.wunsch_id, linkId); // Funktion müsste neu implementiert werden
                         alert('Die Funktion "Freigeben" muss noch implementiert werden.');
                     });
                     rightSide.appendChild(unreserveBtn);
                }

            } else {
                // Button für nicht reservierte Wünsche
                const reserveBtn = document.createElement('button');
                reserveBtn.textContent = 'Reservieren';
                reserveBtn.className = 'reserve-btn';
                reserveBtn.setAttribute('data-id', item.wunsch_id);
                
                reserveBtn.addEventListener('click', () => {
                    reserveGift(item.wunsch_id, actualLinkId); 
                });
                rightSide.appendChild(reserveBtn);
            }
            
            // 🆕 NEU: Löschen-Button NUR für den Listenbesitzer hinzufügen
            if (linkId) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Löschen';
                deleteBtn.className = 'delete-btn';
                deleteBtn.setAttribute('data-id', item.wunsch_id);

                deleteBtn.addEventListener('click', () => {
                    deleteGift(item.wunsch_id, linkId);
                });
                rightSide.appendChild(deleteBtn);
            }
            
            itemElement.appendChild(rightSide);
            wishlistContainer.appendChild(itemElement);
        });
    }

    // --- 4. Reservierung senden ---
    async function reserveGift(id, linkId) {
        if (!confirm('Möchtest du das Geschenk wirklich reservieren?')) {
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/wunsch-reservieren', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Link-ID': linkId
                },
                body: JSON.stringify({ id: id })
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
    
    // --- 5. NEU: Wunsch löschen ---
    async function deleteGift(id, linkId) {
        if (!confirm('Bist du sicher, dass du diesen Wunsch LÖSCHEN möchtest? Dies kann nicht rückgängig gemacht werden.')) {
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/wunsch-loeschen', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                    'X-Link-ID': linkId
                },
                body: JSON.stringify({ id: id })
            });

            if (response.status === 403) {
                alert('Löschen fehlgeschlagen: Du bist nicht der Besitzer dieses Wunsches.');
            } else if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Löschen fehlgeschlagen.');
            } else {
                alert('Wunsch erfolgreich gelöscht!');
            }

            loadWishlist(); // Liste neu laden

        } catch (error) {
            alert(`Ein Fehler ist aufgetreten: ${error.message}`);
            loadWishlist();
        }
    }

    // --- 6. Wunsch erstellen ---
    const createBtn = document.getElementById('add-wish-btn');
    async function createGift(name, linkId) {
        if (createBtn) createBtn.disabled = true;
        if (addWishMessage) addWishMessage.textContent = 'Füge Wunsch hinzu...';
        
        try {
            const response = await fetch('/.netlify/functions/wunsch-erstellen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Link-ID': linkId
                },
                body: JSON.stringify({ name: name })
            });

            if (!response.ok) {
                const errorDetails = await response.text();
                throw new Error(`Serverfehler beim Erstellen des Wunsches: ${errorDetails}`);
            }

            if (addWishMessage) {
                addWishMessage.textContent = 'Wunsch erfolgreich hinzugefügt!';
            }
            if (giftNameInput) giftNameInput.value = '';
            loadWishlist(); // Liste neu laden
            
        } catch (error) {
            if (addWishMessage) {
                addWishMessage.textContent = `Fehler: ${error.message}`;
                addWishMessage.style.color = 'red';
            }
        } finally {
            if (createBtn) createBtn.disabled = false;
            // Nachricht nach 3 Sekunden ausblenden
            setTimeout(() => {
                if (addWishMessage) {
                    addWishMessage.textContent = '';
                    addWishMessage.style.color = 'inherit';
                }
            }, 3000);
        }
    }
    
    // --- 7. Formular-Listener ---
    if (addWishForm) {
        addWishForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const giftName = giftNameInput.value.trim();
            if (giftName && linkId) {
                createGift(giftName, linkId);
            } else {
                if (addWishMessage) {
                    addWishMessage.textContent = 'Bitte gib einen Wunschnamen ein.';
                    addWishMessage.style.color = 'orange';
                }
            }
        });
    }


    // Initialer Ladevorgang
    loadWishlist();
});



