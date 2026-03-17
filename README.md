# swipe_delete — Roundcube Plugin

A Roundcube webmail plugin that adds LinkedIn-style swipe-to-delete functionality to the message list.

---

## English

### Description

When you drag an email row to the left, a red trash button appears immediately next to the row. Clicking it (or dragging far enough) deletes the message.

Works on both desktop (mouse drag) and mobile (touch swipe).

### Features

- Swipe left to reveal a delete button right at the edge of the message row
- Release after a short swipe → button stays visible, click it to delete
- Release after a long swipe (120 px) → message is deleted immediately
- Click anywhere else → row snaps back
- Works with Roundcube's native delete command (Trash / permanent delete depending on server config)
- MutationObserver support: works on newly loaded rows after pagination or refresh

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

Because `position: absolute` does not work correctly inside HTML `<tr>` elements (browsers do not treat `<tr>` as a positioning context), the delete button is a single `position: fixed` overlay element appended to `<body>`. Its position is calculated using `getBoundingClientRect()` of the target row at the moment the swipe begins, so the button's left edge aligns exactly with the row's right edge after the row slides left.

---

## Magyar

### Leírás

LinkedIn-stílusú balra húzás törlés funkció Roundcube webmailhez. Ha az email sort balra húzod, közvetlenül mellette megjelenik egy piros kuka gomb. Rákattintva (vagy elég messzire húzva) az üzenet törlődik.

Asztali gépen (egér) és mobilon (érintés) egyaránt működik.

### Funkciók

- Balra húzásra a kuka gomb pontosan az email sor jobb szélénél jelenik meg
- Kis húzás + elengedés → a gomb látható marad, kattintásra töröl
- Nagy húzás (120 px) + elengedés → az üzenet azonnal törlődik
- Máshova kattintva → a sor visszaugrik
- A Roundcube natív törlés parancsát használja (Kuka / végleges törlés a szerver beállítástól függően)
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

A HTML `<tr>` elemen belül a `position: absolute` nem működik rendesen (a böngészők nem kezelik a `<tr>`-t positioning context-ként). Ezért a törlés gomb egy `position: fixed` overlay elem, amelyet a `<body>`-hoz csatolunk. Pozícióját a JavaScript a `getBoundingClientRect()` segítségével a húzás kezdetén határozza meg, így a gomb bal éle pontosan egybeesik a balra tolódott sor jobb élével — nincs rés.

---

## License

GNU GPLv3+
