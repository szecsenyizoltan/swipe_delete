# swipe_delete — Roundcube Plugin

A Roundcube webmail plugin that adds LinkedIn-style swipe-to-delete functionality to the message list.

---

## English

### Description

Swipe an email row to the left to reveal a red trash button right at the edge of the row. Tap the button to delete — an undo toast appears at the bottom of the screen for 10 seconds, giving you a chance to restore the message before it is actually moved to the Trash folder.

Works on both desktop (mouse drag) and mobile (touch swipe).

### Features

- Swipe left to reveal a trash button flush with the right edge of the message row
- The button fades in proportionally as you swipe — no overlap with email content
- Release the swipe → button stays visible, tap/click it to delete
- **Undo toast** appears for 10 seconds after deletion with a **Restore** button and a countdown progress bar
- Clicking **Restore** slides the row back into place; the message is never moved to Trash
- After 10 seconds the toast closes and the message is moved to Trash via Roundcube's native `move_messages()`
- If you delete a second message while a toast is still open, the first deletion is committed immediately and a new toast opens
- Click/tap anywhere outside the row → row snaps back without deleting
- Drag-to-folder safe: if the pointer drifts more than 40 px vertically the swipe is cancelled; if Roundcube removes the row during a folder drop the trash button disappears automatically
- MutationObserver support: attaches to newly loaded rows after pagination or list refresh

### Requirements

- Roundcube 1.5+
- Elastic skin (or any skin using `#messagelist`)

### Installation

1. Copy the `swipe_delete` folder into your Roundcube `plugins/` directory.
2. Enable the plugin in `config/config.inc.php`:

```php
$config['plugins'] = [
    // ... other plugins ...
    'swipe_delete',
];
```

3. Reload Roundcube.

### How it works

**Swipe button positioning**

Because `position: absolute` does not work correctly inside HTML `<tr>` elements (browsers do not treat `<tr>` as a positioning context), the delete button is a single `position: fixed` overlay appended to `<body>`. Its position is anchored once at `touchstart`/`mousedown` using `getBoundingClientRect()` — before any transform is applied — so the button's left edge aligns exactly with the row's right edge once the row has slid left by the button's width (48 px). `window.visualViewport.width` is used on mobile for correct positioning when the browser viewport is zoomed.

**Deferred deletion with undo**

Tapping the trash button does not immediately call any Roundcube API. Instead it hides the row (`display: none`), stores the pending deletion (UID + source mailbox), and shows the undo toast with a 10-second countdown. Only after the countdown expires does it call `rcmail.move_messages(trash, null, [uid])` (or `rcmail.with_selected_messages('delete', ...)` when already in the Trash folder). This approach requires no knowledge of the new UID assigned after the move — if the user clicks Restore, the row is simply made visible again and no API call is made.

---

## Magyar

### Leírás

LinkedIn-stílusú balra húzás törlés funkció Roundcube webmailhez. Ha az email sort balra húzod, pontosan mellette jelenik meg egy piros kuka gomb. Rákattintva az üzenet "törlődik" — de 10 másodpercig alul egy toast értesítés jelenik meg **Visszaállítás** gombbal, amíg a levél ténylegesen a Kuka mappába kerül.

Asztali gépen (egér) és mobilon (érintés) egyaránt működik.

### Funkciók

- Balra húzásra a kuka gomb pontosan az email sor jobb szélénél jelenik meg
- A gomb a húzás mértékével arányosan halványodik be — nem fed át az email tartalommal
- Elengedés → a gomb látható marad, kattintásra/tapra töröl
- **Visszaállítás toast** jelenik meg 10 másodpercig törlés után, visszaszámlálós progress bar-ral
- **Visszaállítás** gombra kattintva a sor visszacsúszik animációval; a levél sosem kerül a Kukába
- 10 másodperc után a toast bezárul és a Roundcube natív `move_messages()`-ével a levél a Kukába kerül
- Ha a toast még nyitva van és egy másik levelet törlünk, az előző törlés azonnal végrehajtódik, új toast nyílik
- Máshova kattintva/tappolva → a sor visszaugrik törlés nélkül
- Mappa-húzással nem ütközik: ha az egér/ujj 40 px-nél többet mozdul függőlegesen, a swipe leáll; ha Roundcube a sort mappa-drop közben eltávolítja, a kuka gomb automatikusan eltűnik
- MutationObserver: lapozás és frissítés után betöltött új sorokon is működik

### Követelmények

- Roundcube 1.5+
- Elastic skin (vagy bármely skin, amely `#messagelist`-et használ)

### Telepítés

1. Másold a `swipe_delete` mappát a Roundcube `plugins/` könyvtárába.
2. Engedélyezd a plugint a `config/config.inc.php` fájlban:

```php
$config['plugins'] = [
    // ... többi plugin ...
    'swipe_delete',
];
```

3. Töltsd újra a Roundcube-ot.

### Működési elv

**Kuka gomb pozicionálása**

A HTML `<tr>` elemen belül a `position: absolute` nem működik rendesen (a böngészők nem kezelik positioning context-ként). Ezért a törlés gomb egy `position: fixed` overlay, amelyet a `<body>`-hoz csatolunk. Pozícióját a JavaScript a `touchstart`/`mousedown` eseménykor határozza meg `getBoundingClientRect()`-tel — még mielőtt bármilyen transform alkalmazódna —, így a gomb bal éle pontosan egybeesik a sor jobb élével, miután a sor 48 px-t csúszott balra. Mobilon `window.visualViewport.width`-t használunk a helyes pozicionáláshoz zoomolt viewport esetén is.

**Halasztott törlés visszaállítással**

A kuka gombra kattintás nem hív azonnal Roundcube API-t. Ehelyett a sor azonnal `display: none`-ra vált, a függőben lévő törlés adatait (UID + forrásmappa) eltároljuk, és megjelenik a visszaállítás toast 10 másodperces visszaszámlálással. Csak az időkorlát lejárta után hívódik meg a `rcmail.move_messages(trash, null, [uid])` (vagy kukában `rcmail.with_selected_messages('delete', ...)`). Ez a megközelítés nem igényli az áthelyezés utáni új UID ismeretét — ha a felhasználó Visszaállítást kattint, a sor egyszerűen újra láthatóvá válik és semmilyen API-hívás nem történik.

---

## License

GNU GPLv3+
