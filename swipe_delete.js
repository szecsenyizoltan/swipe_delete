/**
 * Swipe Delete Plugin
 * LinkedIn-stílusú balra húzás törlés funkció az email listában.
 *
 * A törlés gomb position:fixed overlay, mert a <tr> elemen belül
 * a position:absolute nem működik rendesen böngészőkben.
 * Mobilon a <tr> display:flex + position:relative, de a fixed megközelítés
 * viewport-relatív koordinátákkal mindkét esetben helyes.
 *
 * Törlés után 10 másodpercig "Visszaállítás" toast jelenik meg.
 * A tényleges Roundcube-hívás (move to trash) csak a toast lejárta után fut.
 */

(function() {
    'use strict';

    var SWIPE_REVEAL    = 48;    // px — ennyit tolódik el a sor és ennyit foglal a gomb
    var MAX_DRIFT_Y     = 40;    // px — ennyi függőleges eltérés után mappa-húzásnak tekintjük
    var UNDO_TIMEOUT_MS = 10000; // ms — ennyi ideig lehet visszaállítani

    var activeRow    = null;
    var startX       = 0;
    var startY       = 0;
    var currentX     = 0;
    var isDragging   = false;
    var isHorizontal = null;
    var deleteBtn    = null;

    // Függőben lévő törlés állapota
    var pending = null; // { row, uid, mbox, timer, progressTimer }

    // --- Toast elem ---
    var toast         = null;
    var toastProgress = null;

    function getTrashSVG() {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M9 3v1H4v2h1v13a2 2 0 002 2h10a2 2 0 002-2V6h1V4h-5V3H9z' +
            'M7 6h10v13H7V6zm2 2v9h2V8H9zm4 0v9h2V8h-2z"/>' +
            '</svg>';
    }

    function viewportWidth() {
        return window.visualViewport ? window.visualViewport.width : window.innerWidth;
    }

    // --- Toast ---

    function createToast() {
        toast = document.createElement('div');
        toast.className = 'swipe-delete-toast';
        toast.innerHTML =
            '<span class="swipe-delete-toast-text">Levél törölve</span>' +
            '<button class="swipe-delete-toast-undo" type="button">Visszaállítás</button>' +
            '<div class="swipe-delete-toast-progress"></div>';
        document.body.appendChild(toast);

        toastProgress = toast.querySelector('.swipe-delete-toast-progress');

        toast.querySelector('.swipe-delete-toast-undo').addEventListener('click', function(e) {
            e.stopPropagation();
            undoDelete();
        });
        toast.querySelector('.swipe-delete-toast-undo').addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            undoDelete();
        });
    }

    function showToast() {
        toast.classList.add('visible');
        // Progress bar: 100% → 0% lineárisan UNDO_TIMEOUT_MS alatt
        toastProgress.style.transition = 'none';
        toastProgress.style.width = '100%';
        // Következő frame-ben indítjuk az animációt
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toastProgress.style.transition = 'width ' + (UNDO_TIMEOUT_MS / 1000) + 's linear';
                toastProgress.style.width = '0%';
            });
        });
    }

    function hideToast() {
        toast.classList.remove('visible');
        toastProgress.style.transition = 'none';
        toastProgress.style.width = '0%';
    }

    // --- Törlés logika ---

    function doDelete(row) {
        isDragging = false;
        activeRow  = null;
        hideBtn();

        if (!window.rcmail) return;

        var uid = getRowUid(row);
        if (!uid) return;

        // Ha van korábbi függőben lévő törlés, azt most végrehajtjuk
        if (pending) commitPending();

        // Sor animálása kifelé
        row.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
        row.style.transform  = 'translateX(-110%)';
        row.style.opacity    = '0';

        setTimeout(function() {
            row.style.display = 'none';

            pending = {
                row:  row,
                uid:  parseInt(row.getAttribute('data-uid') || (row.id || '').replace(/^rcmrow/, ''), 10)
                      || row.getAttribute('data-uid')
                      || (row.id || '').replace(/^rcmrow/, ''),
                mbox: rcmail.env.mailbox
            };

            showToast();

            // 10 mp után végrehajtjuk a törlést
            pending.timer = setTimeout(function() {
                commitPending();
            }, UNDO_TIMEOUT_MS);
        }, 230);
    }

    // Tényleges Roundcube törlés/mozgatás végrehajtása
    function commitPending() {
        if (!pending) return;
        clearTimeout(pending.timer);

        var p      = pending;
        pending    = null;

        hideToast();

        if (!window.rcmail) return;

        var trash = rcmail.env.trash_mailbox;

        if (trash && p.mbox !== trash) {
            rcmail.move_messages(trash, null, [p.uid]);
        } else {
            var post_data = rcmail.selection_post_data({_uid: [p.uid]});
            if (post_data._uid) {
                rcmail.with_selected_messages('delete', post_data);
            }
        }
    }

    // Visszaállítás: a sor visszakerül az eredeti helyére, törlés elmarad
    function undoDelete() {
        if (!pending) return;
        clearTimeout(pending.timer);

        var row = pending.row;
        pending = null;
        hideToast();

        // Sor visszaállítása animációval
        row.style.display    = '';
        row.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        row.style.transform  = 'translateX(0)';
        row.style.opacity    = '1';

        setTimeout(function() {
            row.style.transition = '';
            row.style.transform  = '';
            row.style.opacity    = '';
        }, 260);
    }

    // --- Gomb pozicionálás ---

    function anchorBtnToRow(row) {
        var had = !!row.style.transform;
        if (had) {
            row.style.transition = 'none';
            row.style.transform  = '';
            row.getBoundingClientRect();
        }

        var rect = row.getBoundingClientRect();

        if (had) {
            requestAnimationFrame(function() { row.style.transition = ''; });
        }

        var vw        = viewportWidth();
        var rightEdge = Math.min(rect.right, vw);
        deleteBtn.style.top    = rect.top    + 'px';
        deleteBtn.style.height = rect.height + 'px';
        deleteBtn.style.right  = (vw - rightEdge)  + 'px';
        deleteBtn.style.width  = SWIPE_REVEAL + 'px';
    }

    function updateBtnOpacity(deltaX) {
        if (!activeRow || !activeRow.parentNode) {
            hideBtn();
            activeRow  = null;
            isDragging = false;
            return;
        }
        var ratio = Math.min(1, Math.abs(deltaX) / SWIPE_REVEAL);
        deleteBtn.style.opacity       = ratio;
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

    function getRowUid(row) {
        return row.getAttribute('data-uid')
            || (row.id || '').replace(/^rcmrow/, '');
    }

    function resetRow(row) {
        if (!row) return;
        row.style.transform = '';
        row.style.opacity   = '';
        hideBtn();
    }

    // --- Egér kezelők ---

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

    // --- Közös logika ---

    function handleMove(clientX, clientY) {
        var deltaX = clientX - startX;
        var deltaY = clientY - startY;

        if (Math.abs(deltaY) > MAX_DRIFT_Y) {
            resetRow(activeRow);
            activeRow    = null;
            isDragging   = false;
            isHorizontal = null;
            return;
        }

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

        if (Math.abs(deltaX) >= SWIPE_REVEAL) {
            activeRow.style.transform = 'translateX(-' + SWIPE_REVEAL + 'px)';
            showBtnFull();
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

    // --- Törlés gomb ---

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

        deleteBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (activeRow) doDelete(activeRow);
        });
    }

    // --- Globális click: visszaállítás ha máshova kattint ---

    function onDocumentClick(e) {
        if (!activeRow) return;
        if (activeRow.contains(e.target) || deleteBtn.contains(e.target)) return;
        resetRow(activeRow);
        activeRow = null;
    }

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
        createToast();
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
