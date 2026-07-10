<?php
/**
 * Plugin Name:       EDUZEN Connexion Site
 * Plugin URI:        https://eduzen.fr
 * Description:       Connectez votre site WordPress à EDUZEN — catalogue de formations CPT avec SEO, synchronisation automatique et design personnalisable.
 * Version:           2.0.0
 * Author:            EDUZEN
 * Author URI:        https://eduzen.fr
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       eduzen
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Update URI:        https://eduzen.fr
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'EDUZEN_VERSION',    '2.0.0' );
define( 'EDUZEN_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EDUZEN_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

if ( ! defined( 'EDUZEN_API_URL' ) ) {
	define( 'EDUZEN_API_URL', getenv( 'EDUZEN_API_URL' ) ?: 'https://www.eduzen.io/api/v1' );
}

require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-cache.php';
require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-api.php';
require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-cpt.php';
require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-sync.php';
require_once EDUZEN_PLUGIN_DIR . 'includes/class-eduzen-shortcodes.php';
require_once EDUZEN_PLUGIN_DIR . 'admin/class-eduzen-admin.php';

add_action( 'plugins_loaded', function () {
	// CPT + taxonomy (must run on every request for rewrites)
	( new Eduzen_CPT() )->init();

	// Shortcodes (legacy API-based)
	( new Eduzen_Shortcodes() )->init();

	// Sync (cron hook + admin POST handler)
	( new Eduzen_Sync() )->init();

	if ( is_admin() ) {
		( new Eduzen_Admin() )->init();
	}
} );

// ── Activation ───────────────────────────────────────────

register_activation_hook( __FILE__, function () {
	// Default options
	if ( false === get_option( 'eduzen_cache_ttl' ) )         add_option( 'eduzen_cache_ttl', 15 );
	if ( false === get_option( 'eduzen_catalogue_slug' ) )    add_option( 'eduzen_catalogue_slug', 'formations' );
	if ( false === get_option( 'eduzen_primary_color' ) )     add_option( 'eduzen_primary_color', '#274472' );
	if ( false === get_option( 'eduzen_cta_label' ) )         add_option( 'eduzen_cta_label', 'Demander des informations' );

	// Register CPT so flush_rewrite_rules works correctly
	( new Eduzen_CPT() )->init();
	flush_rewrite_rules();

	// Schedule daily sync if not already scheduled
	if ( ! wp_next_scheduled( 'eduzen_daily_sync' ) ) {
		wp_schedule_event( time(), 'eduzen_daily', 'eduzen_daily_sync' );
	}
} );

// ── Deactivation ─────────────────────────────────────────

register_deactivation_hook( __FILE__, function () {
	wp_clear_scheduled_hook( 'eduzen_daily_sync' );
	flush_rewrite_rules();
} );
