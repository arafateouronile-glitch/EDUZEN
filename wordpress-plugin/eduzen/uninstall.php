<?php

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'eduzen_api_key' );
delete_option( 'eduzen_cache_ttl' );

global $wpdb;
$wpdb->query(
	"DELETE FROM {$wpdb->options}
	 WHERE option_name LIKE '_transient_eduzen_%'
	    OR option_name LIKE '_transient_timeout_eduzen_%'"
);
