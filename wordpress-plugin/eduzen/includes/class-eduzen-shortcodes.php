<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Eduzen_Shortcodes {

	public function init() {
		add_shortcode( 'eduzen_programs', [ $this, 'render_programs' ] );
		add_shortcode( 'eduzen_sessions', [ $this, 'render_sessions' ] );
		add_shortcode( 'eduzen_formations', [ $this, 'render_formations' ] );

		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_styles' ] );
	}

	public function enqueue_styles() {
		wp_enqueue_style(
			'eduzen-public',
			EDUZEN_PLUGIN_URL . 'public/css/eduzen-public.css',
			[],
			EDUZEN_VERSION
		);
	}

	public function render_programs( $atts ) {
		$atts = shortcode_atts( [
			'limit'      => 10,
			'columns'    => 3,
			'is_public'  => 'true',
			'show_stats' => 'true',
			'search'     => '',
		], $atts, 'eduzen_programs' );

		if ( ! get_option( 'eduzen_api_key' ) ) {
			return $this->no_key_notice();
		}

		$cache_key = 'programs_' . http_build_query( $atts );
		$items     = Eduzen_Cache::get( $cache_key );

		if ( false === $items ) {
			$api      = new Eduzen_API();
			$response = $api->get_programs( $atts );

			if ( is_wp_error( $response ) ) {
				return $this->error_notice( $response->get_error_message() );
			}

			$items = isset( $response['data'] ) ? $response['data'] : [];
			Eduzen_Cache::set( $cache_key, $items );
		}

		if ( empty( $items ) ) {
			return '<p class="eduzen-empty">' . esc_html__( 'Aucun programme disponible.', 'eduzen' ) . '</p>';
		}

		ob_start();
		include EDUZEN_PLUGIN_DIR . 'public/partials/programs.php';
		return ob_get_clean();
	}

	public function render_sessions( $atts ) {
		$atts = shortcode_atts( [
			'limit'        => 10,
			'columns'      => 2,
			'status'       => '',
			'formation_id' => '',
			'search'       => '',
		], $atts, 'eduzen_sessions' );

		if ( ! get_option( 'eduzen_api_key' ) ) {
			return $this->no_key_notice();
		}

		$cache_key = 'sessions_' . http_build_query( $atts );
		$items     = Eduzen_Cache::get( $cache_key );

		if ( false === $items ) {
			$api      = new Eduzen_API();
			$response = $api->get_sessions( $atts );

			if ( is_wp_error( $response ) ) {
				return $this->error_notice( $response->get_error_message() );
			}

			$items = isset( $response['data'] ) ? $response['data'] : [];
			Eduzen_Cache::set( $cache_key, $items );
		}

		if ( empty( $items ) ) {
			return '<p class="eduzen-empty">' . esc_html__( 'Aucune session disponible.', 'eduzen' ) . '</p>';
		}

		ob_start();
		include EDUZEN_PLUGIN_DIR . 'public/partials/sessions.php';
		return ob_get_clean();
	}

	public function render_formations( $atts ) {
		$atts = shortcode_atts( [
			'limit'   => 10,
			'columns' => 3,
			'search'  => '',
		], $atts, 'eduzen_formations' );

		if ( ! get_option( 'eduzen_api_key' ) ) {
			return $this->no_key_notice();
		}

		$cache_key = 'formations_' . http_build_query( $atts );
		$items     = Eduzen_Cache::get( $cache_key );

		if ( false === $items ) {
			$api      = new Eduzen_API();
			$response = $api->get_formations( $atts );

			if ( is_wp_error( $response ) ) {
				return $this->error_notice( $response->get_error_message() );
			}

			$items = isset( $response['data'] ) ? $response['data'] : [];
			Eduzen_Cache::set( $cache_key, $items );
		}

		if ( empty( $items ) ) {
			return '<p class="eduzen-empty">' . esc_html__( 'Aucune formation disponible.', 'eduzen' ) . '</p>';
		}

		ob_start();
		include EDUZEN_PLUGIN_DIR . 'public/partials/formations.php';
		return ob_get_clean();
	}

	private function no_key_notice() {
		return '<div class="eduzen-notice">'
			. esc_html__( 'EDUZEN : clé API non configurée. Rendez-vous dans Réglages → EDUZEN.', 'eduzen' )
			. '</div>';
	}

	private function error_notice( $message ) {
		return '<div class="eduzen-notice eduzen-notice--error">'
			. esc_html( $message )
			. '</div>';
	}
}
