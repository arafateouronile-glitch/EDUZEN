<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Eduzen_API {

	private $api_key;
	private $api_url;

	public function __construct() {
		$this->api_key = get_option( 'eduzen_api_key', '' );
		$this->api_url = defined( 'EDUZEN_API_URL' ) ? EDUZEN_API_URL : 'https://eduzen.fr/api/v1';
	}

	public function get_programs( $args = [] ) {
		$params = array_filter( [
			'is_public' => isset( $args['is_public'] ) ? $args['is_public'] : 'true',
			'limit'     => isset( $args['limit'] ) ? intval( $args['limit'] ) : 10,
			'page'      => isset( $args['page'] ) ? intval( $args['page'] ) : 1,
			'search'    => isset( $args['search'] ) ? sanitize_text_field( $args['search'] ) : '',
		], function ( $v ) {
			return $v !== '';
		} );

		return $this->request( '/programs', $params );
	}

	public function get_sessions( $args = [] ) {
		$params = array_filter( [
			'limit'        => isset( $args['limit'] ) ? intval( $args['limit'] ) : 10,
			'page'         => isset( $args['page'] ) ? intval( $args['page'] ) : 1,
			'status'       => isset( $args['status'] ) ? sanitize_text_field( $args['status'] ) : '',
			'formation_id' => isset( $args['formation_id'] ) ? sanitize_text_field( $args['formation_id'] ) : '',
			'search'       => isset( $args['search'] ) ? sanitize_text_field( $args['search'] ) : '',
		], function ( $v ) {
			return $v !== '';
		} );

		return $this->request( '/sessions', $params );
	}

	public function get_formations( $args = [] ) {
		$params = array_filter( [
			'limit'  => isset( $args['limit'] ) ? intval( $args['limit'] ) : 10,
			'page'   => isset( $args['page'] ) ? intval( $args['page'] ) : 1,
			'search' => isset( $args['search'] ) ? sanitize_text_field( $args['search'] ) : '',
		], function ( $v ) {
			return $v !== '';
		} );

		return $this->request( '/formations', $params );
	}

	private function request( $endpoint, $params = [] ) {
		if ( empty( $this->api_key ) ) {
			return new WP_Error( 'no_api_key', __( 'Clé API EDUZEN non configurée.', 'eduzen' ) );
		}

		$url = $this->api_url . $endpoint;
		if ( ! empty( $params ) ) {
			$url .= '?' . http_build_query( $params );
		}

		$response = wp_remote_get( $url, [
			'timeout' => 10,
			'headers' => [
				'X-Eduzen-API-Key' => $this->api_key,
				'Accept'           => 'application/json',
			],
		] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( $code === 401 ) {
			return new WP_Error( 'invalid_api_key', __( 'Clé API invalide ou révoquée.', 'eduzen' ) );
		}

		if ( $code === 403 ) {
			return new WP_Error( 'forbidden', __( 'Accès refusé — vérifiez les scopes de votre clé API.', 'eduzen' ) );
		}

		if ( $code !== 200 ) {
			$message = isset( $data['error'] ) ? $data['error'] : sprintf( __( 'Erreur API : code %d', 'eduzen' ), $code );
			return new WP_Error( 'api_error', $message );
		}

		return $data;
	}

	public function test_connection() {
		return $this->request( '/programs', [ 'limit' => 1 ] );
	}
}
