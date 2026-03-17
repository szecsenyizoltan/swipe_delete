/**
 * Swipe Delete Plugin
 * LinkedIn-stílusú balra húzás törlés funkció az email listában.
 *
 * A törlés gomb position:fixed overlay, mert a <tr> elemen belül
 * a position:absolute nem működik rendesen böngészőkben.
 * Mobilon a <tr> display:flex + position:relative, de a fixed megközelítés
 * viewport-relatív koordinátákkal mindkét esetben helyes.
 */

(function() {
    'use strict';

    // A gomb csak akkor jelenik meg teljes szélességben, ha a sor
    // pontosan ennyit csúszott (= gomb szélessége).
    // Addig arányos opacity-val fokozatosan látszik.
    var SWIPE_REVEAL    = 48;   // px — ennyit tolódik el a sor és ennyit foglal a gomb
    var DELETE_TRIGGER  = 130;  // px — ennyi után automatikus törlés

    var activeRow    = null;
    var startX       = 0;
    var startY       = 0;
    var currentX     = 0;
    var isDragging   = false;
    var isHorizontal = null;
    var deleteBtn    = null;

    function getTrashSVG() {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M9 3v1H4v2h1v13a2 2 0 002 2h10a2 2 0 002-2V6h1V4h-5V3H9z' +
            'M7 6h10v13H7V6zm2 2v9h2V8H9zm4 0v9h2V8h-2z"/>' +
            '</svg>';
    }

    function viewportWidth() {
        return window.visualViewport ? window.visualViewport.width : window.innerWidth;
    }

    // Pozicionálja a gombot a sor eredeti (transform nélküli) jobb széléhez.
    // A gomb jobb éle = sor jobb éle → 48px csúszás után a tartalom jobb éle
    // pontosan érinti a gomb bal élét, nincs rés és nincs átfedés.
    function anchorBtnToRow(row) {
        // Ha van előző transform, ideiglenesen töröljük a helyes méréshez
        var had = !!row.style.transform;
        if (had) {
            row.style.transition = 'none';
            row.style.transform  = '';
            row.getBoundingClientRect(); // force reflow
        }

        var rect = row.getBoundingClientRect();

        if (had) {
            requestAnimationFrame(function() { row.style.transition = ''; });
        }

        var vw         = viewportWidth();
        var rightEdge  = Math.min(rect.right, vw); // ne legyen negatív right érték
        deleteBtn.style.top    = rect.top    + 'px';
        deleteBtn.style.height = rect.height + 'px';
        deleteBtn.style.right  = (vw - rightEdge)  + 'px';
        deleteBtn.style.width  = SWIPE_REVEAL + 'px';
    }

    // Opacity arányos a csúszás mértékével: 0 → teljes gomb szélességig fokozatosan látszik
    function updateBtnOpacity(deltaX) {
        var ratio = Math.min(1, Math.abs(deltaX) / SWIPE_REVEAL);
        deleteBtn.style.opacity      = ratio;
        deleteBtn.style.pointerEvents = ratio >= 1 ? 'auto' : 'none';
    }

    function showBtnFull() {
        deleteBtn.style.opacity       = '1';
        deleteBtn.style.pointerEvents = 'auto';
    }

    function hideBtn() {
        deleteBtn.style.opacity       = '0';
        deleteBtn.style.pointerEvents = 'none';
    }

    // Kinyeri az IMAP UID-t a Roundcube sorból.
    // HTML: id="rcmrow{uid}" → uid = a szám utáni rész
    function getRowUid(row) {
        return row.getAttribute('data-uid')
            || (row.id || '').replace(/^rcmrow/, '');
    }

    function doDelete(row) {
        isDragging = false;
        activeRow  = null;
        hideBtn();

        if (!window.rcmail) return;

        var uid = getRowUid(row);
        if (!uid) return;

        // Csúsztatás ki (Roundcube a sort majd eltávolítja a DOM-ból
        // a törlés válasz feldolgozásakor)
        row.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
        row.style.transform  = 'translateX(-110%)';
        row.style.opacity    = '0';

        setTimeout(function() {
            var ml = rcmail.message_list;
            if (ml) {
                ml.clear_selection();
                // Közvetlen állapot beállítás — message_list.select() esetén
                // a rows[uid] bejegyzés hiánya silently failelhet mobilon
                if (ml.rows && ml.rows[uid]) {
                    ml.selection         = [uid];
                    ml.rows[uid].selected = true;
                } else {
                    // Próbáljuk numerikusan is
                    var n = parseInt(uid, 10);
                    if (ml.rows && ml.rows[n]) {
                        ml.selection        = [n];
                        ml.rows[n].selected = true;
                        uid = n;
                    }
                }
            }
            rcmail.command('delete');
        }, 230);
    }

    function resetRow(row) {
        if (!row) return;
        row.style.transform = '';
        row.style.opacity   = '';
        hideBtn();
    }

    // --- Egér kezelők (documentra kötve drag alatt) ---

    function onMouseMove(e) {
        if (!isDragging || !activeRow) return;
        handleMove(e.clientX, e.clientY);
    }

    function onMouseUp(e) {
        if (!isDragging) return;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
        handleUp(e.clientX);
    }

    // --- Érintés kezelők ---

    function onTouchMove(e) {
        if (!isDragging || !activeRow) return;
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
        if (isHorizontal === true) e.preventDefault();
    }

    function onTouchEnd(e) {
        if (!isDragging) return;
        var x = e.changedTouches && e.changedTouches[0]
            ? e.changedTouches[0].clientX : currentX;
        handleUp(x);
    }

    // --- Közös mozgás / felengedés logika ---

    function handleMove(clientX, clientY) {
        var deltaX = clientX - startX;
        var deltaY = clientY - startY;

        if (isHorizontal === null) {
            if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
                isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            }
            return;
        }

        if (!isHorizontal) return;

        if (deltaX > 0) {
            activeRow.style.transform = '';
            hideBtn();
            return;
        }

        currentX = clientX;
        var offset = Math.min(Math.abs(deltaX), SWIPE_REVEAL);
        activeRow.style.transform = 'translateX(-' + offset + 'px)';
        updateBtnOpacity(deltaX);
    }

    function handleUp(clientX) {
        isDragging = false;
        var deltaX = clientX - startX;

        if (!isHorizontal) {
            resetRow(activeRow);
            activeRow = null;
            return;
        }

        if (Math.abs(deltaX) >= DELETE_TRIGGER) {
            doDelete(activeRow);
        } else if (Math.abs(deltaX) >= SWIPE_REVEAL) {
            // Megáll a revealed pozícióban — gomb kattintható
            activeRow.style.transform = 'translateX(-' + SWIPE_REVEAL + 'px)';
            showBtnFull();
            // activeRow megmarad a gomb click/touchend handleréhez
        } else {
            resetRow(activeRow);
            activeRow = null;
        }
    }

    // --- Sor eseményei ---

    function onRowMouseDown(e) {
        if (e.button !== 0) return;
        startSwipe(e.currentTarget, e.clientX, e.clientY);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);
    }

    function onRowTouchStart(e) {
        startSwipe(e.currentTarget, e.touches[0].clientX, e.touches[0].clientY);
    }

    function startSwipe(row, clientX, clientY) {
        if (activeRow && activeRow !== row) resetRow(activeRow);
        activeRow    = row;
        startX       = clientX;
        startY       = clientY;
        currentX     = clientX;
        isDragging   = true;
        isHorizontal = null;
        anchorBtnToRow(row);
    }

    // --- Törlés gomb létrehozása ---

    function createGlobalDeleteBtn() {
        deleteBtn = document.createElement('div');
        deleteBtn.className = 'swipe-delete-action';
        deleteBtn.innerHTML = getTrashSVG();
        deleteBtn.setAttribute('title', 'Törlés');
        document.body.appendChild(deleteBtn);

        // Click: desktop
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (activeRow) doDelete(activeRow);
        });

        // Touchend: mobil — 300ms click-delay megkerülése
        deleteBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (activeRow) doDelete(activeRow);
        });
    }

    // --- Visszaállítás ha máshova kattint/tap ---

    function onDocumentClick(e) {
        if (!activeRow) return;
        if (activeRow.contains(e.target) || deleteBtn.contains(e.target)) return;
        resetRow(activeRow);
        activeRow = null;
    }

    // --- Görgetéskor elrejtjük ---

    function onScroll() {
        if (activeRow) { resetRow(activeRow); activeRow = null; }
    }

    // --- Sorok csatolása ---

    function attachToRow(row) {
        if (row._swipeDeleteAttached) return;
        row._swipeDeleteAttached = true;
        row.addEventListener('mousedown',  onRowMouseDown);
        row.addEventListener('touchstart', onRowTouchStart, { passive: true });
        row.addEventListener('touchmove',  onTouchMove,     { passive: false });
        row.addEventListener('touchend',   onTouchEnd);
    }

    function attachToAllRows() {
        document.querySelectorAll('#messagelist tbody tr, .message-list tr')
            .forEach(attachToRow);
    }

    // --- Inicializálás ---

    function init() {
        if (!window.rcmail) return;

        createGlobalDeleteBtn();
        attachToAllRows();

        rcmail.addEventListener('listupdate', function() {
            setTimeout(attachToAllRows, 100);
        });

        var list = document.getElementById('messagelist') || document.querySelector('.message-list');
        if (list) {
            new MutationObserver(function(muts) {
                muts.forEach(function(m) {
                    m.addedNodes.forEach(function(n) {
                        if (n.tagName === 'TR') attachToRow(n);
                        else if (n.querySelectorAll) n.querySelectorAll('tr').forEach(attachToRow);
                    });
                });
            }).observe(list, { childList: true, subtree: true });

            list.addEventListener('scroll', onScroll);
        }

        window.addEventListener('scroll', onScroll);
        if (window.visualViewport) window.visualViewport.addEventListener('scroll', onScroll);
        document.addEventListener('click', onDocumentClick);
    }

    if (window.rcmail) {
        rcmail.addEventListener('init', init);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.rcmail) rcmail.addEventListener('init', init);
            else window.addEventListener('load', init);
        });
    }

})();
