<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Eduzen_Cache {

	private static function transient_key( $cache_key ) {
		return 'eduzen_' . md5( $cache_key );
	}

	public static function get( $cache_key ) {
		return get_transient( self::transient_key( $cache_key ) );
	}

	public static function set( $cache_key, $data ) {
		$ttl_minutes = intval( get_option( 'eduzen_cache_ttl', 15 ) );
		$ttl         = $ttl_minutes * MINUTE_IN_SECONDS;
		set_transient( self::transient_key( $cache_key ), $data, $ttl );
	}

	public static function flush() {
		global $wpdb;
		$wpdb->query(
			"DELETE FROM {$wpdb->options}
			 WHERE option_name LIKE '_transient_eduzen_%'
			    OR option_name LIKE '_transient_timeout_eduzen_%'"
		);
	}
}
