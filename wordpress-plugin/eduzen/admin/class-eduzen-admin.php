<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Eduzen_Admin {

	public function init() {
		add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
		add_action( 'admin_init', [ $this, 'register_settings' ] );
		add_action( 'admin_post_eduzen_flush_cache', [ $this, 'handle_flush_cache' ] );
		add_action( 'wp_ajax_eduzen_test_connection', [ $this, 'handle_test_connection' ] );
		add_action( 'admin_notices', [ $this, 'show_admin_notices' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_scripts' ] );
		// Vider le cache automatiquement quand la clé API change
		add_action( 'update_option_eduzen_api_key', [ 'Eduzen_Cache', 'flush' ] );
		// Vérification des mises à jour depuis eduzen.fr
		add_filter( 'update_plugins_eduzen.fr', [ $this, 'check_for_updates' ], 10, 4 );
	}

	public function add_settings_page() {
		add_options_page(
			__( 'EDUZEN Connexion Site', 'eduzen' ),
			'EDUZEN',
			'manage_options',
			'eduzen-settings',
			[ $this, 'render_settings_page' ]
		);
	}

	public function register_settings() {
		register_setting( 'eduzen_options', 'eduzen_api_key', [
			'sanitize_callback' => 'sanitize_text_field',
		] );
		register_setting( 'eduzen_options', 'eduzen_cache_ttl', [
			'sanitize_callback' => 'absint',
			'default'           => 15,
		] );
	}

	public function render_settings_page() {
		include EDUZEN_PLUGIN_DIR . 'admin/partials/settings-page.php';
	}

	public function handle_flush_cache() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'Permissions insuffisantes.', 'eduzen' ) );
		}
		check_admin_referer( 'eduzen_flush_cache' );

		Eduzen_Cache::flush();

		wp_redirect( add_query_arg( [
			'page'          => 'eduzen-settings',
			'eduzen_notice' => 'cache_flushed',
		], admin_url( 'options-general.php' ) ) );
		exit;
	}

	public function handle_test_connection() {
		check_ajax_referer( 'eduzen_test_connection', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( __( 'Permissions insuffisantes.', 'eduzen' ) );
		}

		$api    = new Eduzen_API();
		$result = $api->test_connection();

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( $result->get_error_message() );
		}

		wp_send_json_success( __( 'Connexion réussie ! L\'API EDUZEN répond correctement.', 'eduzen' ) );
	}

	public function show_admin_notices() {
		$notice = isset( $_GET['eduzen_notice'] ) ? sanitize_key( $_GET['eduzen_notice'] ) : '';

		if ( $notice === 'cache_flushed' ) {
			echo '<div class="notice notice-success is-dismissible"><p>'
				. esc_html__( 'Cache EDUZEN vidé avec succès.', 'eduzen' )
				. '</p></div>';
		}
	}

	public function check_for_updates( $update, $plugin_data, $plugin_file, $locales ) {
		if ( plugin_basename( EDUZEN_PLUGIN_DIR . 'eduzen.php' ) !== $plugin_file ) {
			return $update;
		}

		$response = wp_remote_get( 'https://eduzen.fr/api/wordpress-plugin/update', [
			'timeout' => 10,
			'headers' => [ 'Accept' => 'application/json' ],
		] );

		if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
			return $update;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $data['version'] ) ) {
			return $update;
		}

		if ( version_compare( EDUZEN_VERSION, $data['version'], '>=' ) ) {
			return $update;
		}

		return (object) [
			'id'           => 'eduzen/eduzen.php',
			'slug'         => 'eduzen',
			'plugin'       => $plugin_file,
			'new_version'  => $data['version'],
			'url'          => 'https://eduzen.fr',
			'package'      => $data['download_url'],
			'tested'       => $data['tested']       ?? '6.7',
			'requires_php' => $data['requires_php'] ?? '7.4',
			'icons'        => [],
			'banners'      => [],
		];
	}

	public function enqueue_admin_scripts( $hook ) {
		if ( $hook !== 'settings_page_eduzen-settings' ) {
			return;
		}

		wp_enqueue_script(
			'eduzen-admin',
			EDUZEN_PLUGIN_URL . 'admin/js/eduzen-admin.js',
			[ 'jquery' ],
			EDUZEN_VERSION,
			true
		);

		wp_localize_script( 'eduzen-admin', 'eduzenAdmin', [
			'ajax_url'      => admin_url( 'admin-ajax.php' ),
			'nonce'         => wp_create_nonce( 'eduzen_test_connection' ),
			'testing'       => __( 'Test en cours…', 'eduzen' ),
			'btn_label'     => __( 'Tester la connexion', 'eduzen' ),
			'network_error' => __( 'Erreur réseau.', 'eduzen' ),
		] );
	}
}
