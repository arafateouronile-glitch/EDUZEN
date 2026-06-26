/* global jQuery, eduzenAdmin */
jQuery( function ( $ ) {
	$( '#eduzen-test-btn' ).on( 'click', function () {
		var $btn    = $( this );
		var $result = $( '#eduzen-test-result' );

		$btn.prop( 'disabled', true ).text( eduzenAdmin.testing );
		$result.css( 'color', '#666' ).text( '' );

		$.post( eduzenAdmin.ajax_url, {
			action: 'eduzen_test_connection',
			nonce:  eduzenAdmin.nonce,
		}, function ( response ) {
			$btn.prop( 'disabled', false ).text( eduzenAdmin.btn_label );
			if ( response.success ) {
				$result.css( 'color', '#00a32a' ).text( response.data );
			} else {
				$result.css( 'color', '#d63638' ).text( response.data );
			}
		} ).fail( function () {
			$btn.prop( 'disabled', false ).text( eduzenAdmin.btn_label );
			$result.css( 'color', '#d63638' ).text( eduzenAdmin.network_error );
		} );
	} );
} );
