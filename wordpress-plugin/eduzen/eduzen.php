<?php
/**
 * Plugin Name:       EDUZEN Connexion Site
 * Plugin URI:        https://eduzen.fr
 * Description:       Connectez votre site WordPress à EDUZEN — affichez programmes, sessions et formations en temps réel avec des shortcodes simples.
 * Version:           1.0.0
 * Author:            EDUZEN
 * Author URI:        https://eduzen.fr
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       eduzen
 * Requires at least: 5.0
 * Requires PHP:      7.4
 * Update URI:        https://eduzen.fr
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'EDUZEN_VERSION', '1.0.0' );
define( 'EDUZEN_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EDUZEN_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
// Permet de surcharger l'URL via la constante wp-config.php ou la variable d'environnement EDUZEN_API_URL
if ( ! defined( 'EDUZEN_API_URL' ) ) {
	define( 'EDUZEN_API_URL', getenv( 'EDUZEN_API_URL' ) ?: 'https://www.eduzen.io/api/v1' );
}

require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-cache.php';
require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-api.php';
require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-shortcodes.php';
require_once EDUZEN_PLUGIN_DIR . 'admin/class-eduzen-admin.php';

add_action( 'plugins_loaded', function () {
	$shortcodes = new Eduzen_Shortcodes();
	$shortcodes->init();

	if ( is_admin() ) {
		$admin = new Eduzen_Admin();
		$admin->init();
	}
} );

register_activation_hook( __FILE__, function () {
	if ( false === get_option( 'eduzen_cache_ttl' ) ) {
		add_option( 'eduzen_cache_ttl', 15 );
	}
} );
