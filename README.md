# swipe_delete — Roundcube Plugin

A Roundcube webmail plugin that adds Gmail-style swipe-to-delete on mobile.

---

## English

### Description

Swipe an email row to the left on mobile to delete it — just like in the Gmail app. A toast notification appears at the bottom for 2 seconds with a **Restore** button and a countdown progress bar, giving you a chance to undo before the message is moved to Trash.

Desktop is unaffected. No trash icon is shown anywhere.

### Features

- **Mobile only** (`layout-phone` / `touch` layout): swipe left 80 px to delete
- Row follows your finger; release past the threshold → row slides out and disappears
- **Undo toast** appears for 2 seconds with a **Restore** button and a progress bar
- Tapping **Restore** slides the row back; no API call is made and the message stays in its folder
- After 2 seconds the toast closes and the message is moved to Trash via Roundcube's native `move_messages()`
- If you delete a second message while a toast is still open, the first deletion is committed immediately and a new toast opens
- Swipe is cancelled automatically if the finger drifts more than 40 px vertically (prevents conflict with drag-to-folder)
- Desktop: the plugin is fully inactive

### Requirements

- Roundcube 1.5+
- Elastic skin (or any skin that adds `layout-phone` or `touch` class to `<html>`)

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

**Swipe detection**

Touch events are attached to each message row. On `touchstart` the plugin records the starting position. On `touchmove` it tracks the horizontal delta and moves the row with `translateX`. If the vertical drift exceeds 40 px at any point, the swipe is cancelled and the row snaps back. On `touchend`, if the horizontal delta is ≥ 80 px the deletion flow begins; otherwise the row snaps back.

**Deferred deletion with undo**

When the swipe threshold is reached, the row is animated out and hidden with `display: none` — but no Roundcube API is called yet. The pending deletion (UID + source mailbox) is stored in memory and a 2-second undo toast is shown. Only after the countdown expires does the plugin call `rcmail.move_messages(trash, null, [uid])` (or `rcmail.http_post('delete', ...)` when already in the Trash folder). If the user taps **Restore**, the pending deletion is cancelled, the row is made visible again with a slide-in animation, and no API call is ever made.

---

## Magyar

### Leírás

Gmail-stílusú balra húzás törlés Roundcube webmailhez mobilon. Húzd balra az email sort, és az eltűnik — akárcsak a Gmail appban. Alul 2 másodpercig egy toast értesítés jelenik meg **Visszaállítás** gombbal és visszaszámlálós progress bar-ral, mielőtt az üzenet ténylegesen a Kukába kerülne.

Desktopon a plugin inaktív. Kuka gomb sehol nem jelenik meg.

### Funkciók

- **Csak mobilon** (`layout-phone` / `touch` layout): balra húzás 80 px után töröl
- A sor követi az ujjat; elengedés a küszöb után → sor kirepül és eltűnik
- **Visszaállítás toast** jelenik meg 2 másodpercig **Visszaállítás** gombbal és progress bar-ral
- **Visszaállítás** tapra a sor visszacsúszik animációval; semmilyen API-hívás nem történik, a levél marad
- 2 másodperc után a toast bezárul és az üzenet a Roundcube natív `move_messages()`-ével a Kukába kerül
- Ha a toast még nyitva van és egy másik levelet törlünk, az előző törlés azonnal végrehajtódik, új toast nyílik
- A swipe automatikusan leáll, ha az ujj 40 px-nél többet mozdul függőlegesen (mappa-húzással nem ütközik)
- Desktop: a plugin teljesen inaktív

### Követelmények

- Roundcube 1.5+
- Elastic skin (vagy bármely skin, amely `layout-phone` vagy `touch` osztályt ad a `<html>` elemhez)

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

**Swipe érzékelés**

A touch események minden üzenet-sorra fel vannak csatolva. `touchstart`-kor a plugin rögzíti a kiindulási pozíciót. `touchmove` közben nyomon követi a vízszintes elmozdulást és `translateX`-szel mozgatja a sort. Ha a függőleges eltérés bármikor meghaladja a 40 px-t, a swipe leáll és a sor visszaugrik. `touchend`-kor, ha a vízszintes delta ≥ 80 px, megkezdődik a törlési folyamat; egyébként a sor visszaugrik.

**Halasztott törlés visszaállítással**

Amikor a swipe küszöböt eléri az ujj, a sor kianimálódik és `display: none`-ra vált — de még semmilyen Roundcube API nem hívódik. A függőben lévő törlés (UID + forrásmappa) memóriában tárolódik, és megjelenik a 2 másodperces visszaállítás toast. Csak az időkorlát lejárta után hívódik meg a `rcmail.move_messages(trash, null, [uid])` (vagy kukában `rcmail.http_post('delete', ...)`). Ha a felhasználó **Visszaállítás**t tapol, a törlés törlődik, a sor visszacsúszik animációval, és semmilyen API-hívás nem kerül elküldésre.

---

## License

GNU GPLv3+
