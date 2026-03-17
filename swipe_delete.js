/**
 * Swipe Delete Plugin
 * Egyszerű balra húzás törlés mobilon (layout-phone / touch).
 * Desktopon inaktív. Kuka gomb nincs — a swipe közvetlenül töröl,
 * 10 másodperces visszaállítási lehetőséggel.
 */

(function() {
    'use strict';

    var SWIPE_DELETE_PX  = 80;   // px — ennyi után töröl elengedéskor
    var MAX_DRIFT_Y      = 40;   // px — ennyi függőleges eltérés után leáll
    var UNDO_TIMEOUT_MS  = 10000;

    var activeRow    = null;
    var startX       = 0;
    var startY       = 0;
    var isDragging   = false;
    var isHorizontal = null;

    var pending = null; // { row, uid, mbox, timer }
    var toast   = null;
    var toastProgress = null;

    // Csak Roundcube mobilos layoutján fut
    function isMobile() {
        var cl = document.documentElement.classList;
        return cl.contains('layout-phone') || cl.contains('touch');
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

        var undoBtn = toast.querySelector('.swipe-delete-toast-undo');
        undoBtn.addEventListener('click',    function(e) { e.stopPropagation(); undoDelete(); });
        undoBtn.addEventListener('touchend', function(e) { e.preventDefault(); e.stopPropagation(); undoDelete(); });
    }

    function showToast() {
        toast.classList.add('visible');
        toastProgress.style.transition = 'none';
        toastProgress.style.width = '100%';
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

    function getRowUid(row) {
        return row.getAttribute('data-uid')
            || (row.id || '').replace(/^rcmrow/, '');
    }

    function doDelete(row) {
        isDragging = false;
        activeRow  = null;

        if (!window.rcmail) return;
        var uid = getRowUid(row);
        if (!uid) return;

        // Korábbi függőben lévő törlés végrehajtása
        if (pending) commitPending();

        // Sor kianimálása
        row.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
        row.style.transform  = 'translateX(-110%)';
        row.style.opacity    = '0';

        setTimeout(function() {
            row.style.display = 'none';

            pending = {
                row:  row,
                uid:  parseInt(uid, 10) || uid,
                mbox: rcmail.env.mailbox
            };

            showToast();

            pending.timer = setTimeout(function() {
                commitPending();
            }, UNDO_TIMEOUT_MS);
        }, 220);
    }

    function commitPending() {
        if (!pending) return;
        clearTimeout(pending.timer);
        var p = pending;
        pending = null;
        hideToast();

        if (!window.rcmail) return;
        var trash = rcmail.env.trash_mailbox;
        if (trash && p.mbox !== trash) {
            rcmail.move_messages(trash, null, [p.uid]);
        } else {
            var post_data = rcmail.selection_post_data({_uid: [p.uid]});
            if (post_data._uid) rcmail.with_selected_messages('delete', post_data);
        }
    }

    function undoDelete() {
        if (!pending) return;
        clearTimeout(pending.timer);
        var row = pending.row;
        pending = null;
        hideToast();

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

    // --- Touch kezelők ---

    function onTouchStart(e) {
        if (!isMobile()) return;
        var row = e.currentTarget;
        if (activeRow && activeRow !== row) resetRow(activeRow);
        activeRow    = row;
        startX       = e.touches[0].clientX;
        startY       = e.touches[0].clientY;
        isDragging   = true;
        isHorizontal = null;
    }

    function onTouchMove(e) {
        if (!isDragging || !activeRow) return;

        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;

        // Túl nagy függőleges eltérés → nem swipe
        if (Math.abs(dy) > MAX_DRIFT_Y) {
            resetRow(activeRow);
            activeRow    = null;
            isDragging   = false;
            isHorizontal = null;
            return;
        }

        if (isHorizontal === null) {
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                isHorizontal = Math.abs(dx) > Math.abs(dy);
            }
            return;
        }

        if (!isHorizontal) return;
        if (dx > 0) { resetRow(activeRow); return; } // jobbra húzás: vissza

        e.preventDefault(); // scroll tiltása vízszintes swipe közben

        // Sor követi az ujjat, de max SWIPE_DELETE_PX * 1.3-ig
        var offset = Math.min(Math.abs(dx), SWIPE_DELETE_PX * 1.3);
        activeRow.style.transform = 'translateX(-' + offset + 'px)';
    }

    function onTouchEnd(e) {
        if (!isDragging || !activeRow) return;
        isDragging = false;

        var dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : startX) - startX;

        if (isHorizontal && Math.abs(dx) >= SWIPE_DELETE_PX) {
            doDelete(activeRow);
        } else {
            resetRow(activeRow);
            activeRow = null;
        }
    }

    function resetRow(row) {
        if (!row) return;
        row.style.transition = 'transform 0.2s ease';
        row.style.transform  = '';
        row.style.opacity    = '';
        setTimeout(function() { if (row) row.style.transition = ''; }, 200);
    }

    // --- Sorok csatolása ---

    function attachToRow(row) {
        if (row._swipeDeleteAttached) return;
        row._swipeDeleteAttached = true;
        row.addEventListener('touchstart', onTouchStart, { passive: true });
        row.addEventListener('touchmove',  onTouchMove,  { passive: false });
        row.addEventListener('touchend',   onTouchEnd);
    }

    function attachToAllRows() {
        if (!isMobile()) return;
        document.querySelectorAll('#messagelist tbody tr, .message-list tr')
            .forEach(attachToRow);
    }

    // --- Inicializálás ---

    function init() {
        if (!window.rcmail) return;

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
        }
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
