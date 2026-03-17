/**
 * Swipe Delete Plugin
 * LinkedIn-stílusú balra húzás törlés funkció az email listában.
 *
 * A törlés gomb position:fixed overlay, mert a <tr> elemen belül
 * a position:absolute nem működik rendesen böngészőkben.
 */

(function() {
    'use strict';

    var SWIPE_THRESHOLD = 20;   // px, ennyi után jelenik meg a kuka
    var SWIPE_REVEAL    = 44;   // px, ennyit tolódik el a sor (= gomb szélessége)
    var DELETE_TRIGGER  = 120;  // px, ennyi után automatikusan töröl

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

    // Viewport szélessége mobilon is helyesen (zoom esetén visualViewport)
    function viewportWidth() {
        return (window.visualViewport ? window.visualViewport.width : window.innerWidth);
    }

    // Pozicionálja a gombot a sor EREDETI (transform nélküli) jobb széléhez.
    // Átmenetileg törli a transformot a mérés előtt, majd visszaállítja.
    function anchorBtnToRow(row) {
        row.style.transition = 'none';
        row.style.transform  = '';

        var rect = row.getBoundingClientRect();

        // Transition visszakapcsolása a következő frame-ben
        requestAnimationFrame(function() {
            row.style.transition = '';
        });

        deleteBtn.style.top    = rect.top + 'px';
        deleteBtn.style.height = rect.height + 'px';
        // Gomb jobb éle = sor jobb éle → sor 44px-es elcsúszása után
        // a tartalom jobb éle pontosan érinti a gomb bal élét, nincs rés
        deleteBtn.style.right  = (viewportWidth() - rect.right) + 'px';
    }

    function showBtn() { deleteBtn.classList.add('visible'); }
    function hideBtn() { deleteBtn.classList.remove('visible'); }

    // Kinyeri a Roundcube IMAP UID-t a sorból.
    // Roundcube a sort id="rcmrow{uid}" formában generálja.
    function getRowUid(row) {
        var uid = row.getAttribute('data-uid');
        if (uid) return uid;
        // "rcmrow123456" → "123456"
        return (row.id || '').replace(/^rcmrow/, '');
    }

    function doDelete(row) {
        isDragging = false;
        var uid = getRowUid(row);
        row.classList.add('swipe-deleting');
        hideBtn();
        activeRow = null;

        setTimeout(function() {
            if (!window.rcmail) return;
            if (rcmail.message_list) {
                rcmail.message_list.clear_selection();
                rcmail.message_list.select(uid);
            }
            rcmail.command('delete', '', row);
        }, 250);
    }

    function resetRow(row) {
        if (!row) return;
        row.style.transform = '';
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

    // --- Érintés kezelők (a sorra kötve — touch követi az indítási elemet) ---

    function onTouchMove(e) {
        if (!isDragging || !activeRow) return;
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
        // Csak vízszintes swipe esetén tiltjuk a scrollt
        if (isHorizontal === true) e.preventDefault();
    }

    function onTouchEnd(e) {
        if (!isDragging) return;
        var clientX = e.changedTouches && e.changedTouches[0]
            ? e.changedTouches[0].clientX
            : currentX;
        handleUp(clientX);
    }

    // --- Mozgás / felengedés közös logika ---

    function handleMove(clientX, clientY) {
        var deltaX = clientX - startX;
        var deltaY = clientY - startY;

        // Irány meghatározása az első 5px után
        if (isHorizontal === null) {
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            }
            return;
        }

        if (!isHorizontal) return;

        // Jobbra visszahúzás: visszaállítás
        if (deltaX > 0) {
            activeRow.style.transform = '';
            hideBtn();
            return;
        }

        currentX = clientX;
        var offset = Math.min(Math.abs(deltaX), SWIPE_REVEAL);
        activeRow.style.transform = 'translateX(-' + offset + 'px)';

        if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
            showBtn();
        } else {
            hideBtn();
        }
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
            // Elég messzire húzta: azonnali törlés
            doDelete(activeRow);
        } else if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
            // Megáll SWIPE_REVEAL px-nél, gomb várja a tapot/kattintást
            activeRow.style.transform = 'translateX(-' + SWIPE_REVEAL + 'px)';
            showBtn();
            // activeRow megmarad, hogy a gomb click/touchend törölhessen
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
        // Előző aktív sor visszaállítása
        if (activeRow && activeRow !== row) {
            resetRow(activeRow);
        }

        activeRow    = row;
        startX       = clientX;
        startY       = clientY;
        currentX     = clientX;
        isDragging   = true;
        isHorizontal = null;

        // Gombot a sor jobb széléhez horgonyozzuk (transform törlése után mérve)
        anchorBtnToRow(row);
    }

    // --- Törlés gomb: click (desktop) + touchend (mobil, 300ms delay nélkül) ---

    function createGlobalDeleteBtn() {
        deleteBtn = document.createElement('div');
        deleteBtn.className = 'swipe-delete-action';
        deleteBtn.innerHTML = getTrashSVG();
        deleteBtn.setAttribute('title', 'Törlés');
        document.body.appendChild(deleteBtn);

        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (activeRow) doDelete(activeRow);
        });

        // Mobil: touchend a 300ms click-delay megkerülésére
        deleteBtn.addEventListener('touchend', function(e) {
            e.preventDefault(); // megakadályozza a szimulált click-et
            e.stopPropagation();
            if (activeRow) doDelete(activeRow);
        });
    }

    // --- Globális kattintás / tap: visszaállítás ha máshova kattint ---

    function onDocumentClick(e) {
        if (!activeRow) return;
        if (activeRow.contains(e.target) || deleteBtn.contains(e.target)) return;
        resetRow(activeRow);
        activeRow = null;
    }

    // --- Görgetéskor elrejtjük a gombot ---

    function onScroll() {
        if (activeRow) {
            resetRow(activeRow);
            activeRow = null;
        }
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
        var rows = document.querySelectorAll('#messagelist tbody tr, .message-list tr');
        rows.forEach(attachToRow);
    }

    // --- Inicializálás ---

    function init() {
        if (!window.rcmail) return;

        createGlobalDeleteBtn();
        attachToAllRows();

        rcmail.addEventListener('listupdate', function() {
            setTimeout(attachToAllRows, 100);
        });

        var listContainer = document.getElementById('messagelist') || document.querySelector('.message-list');
        if (listContainer) {
            new MutationObserver(function(mutations) {
                mutations.forEach(function(mut) {
                    mut.addedNodes.forEach(function(node) {
                        if (node.tagName === 'TR') {
                            attachToRow(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('tr').forEach(attachToRow);
                        }
                    });
                });
            }).observe(listContainer, { childList: true, subtree: true });

            listContainer.addEventListener('scroll', onScroll);
        }

        window.addEventListener('scroll', onScroll);

        // visualViewport scroll (mobil böngészők)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('scroll', onScroll);
        }

        document.addEventListener('click', onDocumentClick);
    }

    if (window.rcmail) {
        rcmail.addEventListener('init', init);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.rcmail) {
                rcmail.addEventListener('init', init);
            } else {
                window.addEventListener('load', init);
            }
        });
    }

})();
