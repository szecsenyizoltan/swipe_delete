<?php

/**
 * Swipe Delete
 *
 * Gmail-stílusú balra húzás törlés funkció mobilon.
 * Ha a felhasználó balra húzza az email sort, megjelenik egy kuka ikon,
 * amelyre kattintva törölhető az üzenet.
 *
 * @license GNU GPLv3+
 */
class swipe_delete extends rcube_plugin
{
    public $task = 'mail';

    function init()
    {
        $rcmail = rcmail::get_instance();

        if ($rcmail->task == 'mail' && ($rcmail->action == '' || $rcmail->action == 'show')) {
            $this->include_stylesheet('swipe_delete.css');
            $this->include_script('swipe_delete.js');
        }
    }
}
