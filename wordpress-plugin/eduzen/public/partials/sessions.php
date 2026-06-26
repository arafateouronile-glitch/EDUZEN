<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<?php
/**
 * Template sessions
 * Variables : $items (array), $atts (shortcode atts)
 */
$cols = intval( $atts['columns'] );

$status_labels = [
	'ongoing'   => __( 'En cours', 'eduzen' ),
	'upcoming'  => __( 'À venir', 'eduzen' ),
	'completed' => __( 'Terminée', 'eduzen' ),
	'cancelled' => __( 'Annulée', 'eduzen' ),
	'draft'     => __( 'Brouillon', 'eduzen' ),
];
?>
<div class="eduzen-grid" style="--eduzen-cols:<?php echo esc_attr( $cols ); ?>;">
	<?php foreach ( $items as $session ) :
		$status       = $session['status'] ?? '';
		$status_label = $status_labels[ $status ] ?? ucfirst( $status );

		$start = ! empty( $session['start_date'] ) ? date_i18n( get_option( 'date_format' ), strtotime( $session['start_date'] ) ) : '';
		$end   = ! empty( $session['end_date'] )   ? date_i18n( get_option( 'date_format' ), strtotime( $session['end_date'] ) )   : '';

		$capacity = intval( $session['max_participants'] ?? 0 );
		$enrolled = intval( $session['enrolled_count']   ?? 0 );
		$places   = $capacity > 0 ? max( 0, $capacity - $enrolled ) : null;
	?>
	<div class="eduzen-card">

		<div class="eduzen-card__badges">
			<?php if ( $status ) : ?>
			<span class="eduzen-badge eduzen-badge--status is-<?php echo esc_attr( $status ); ?>">
				<?php echo esc_html( $status_label ); ?>
			</span>
			<?php endif; ?>
		</div>

		<h3 class="eduzen-card__title">
			<?php echo esc_html( $session['formation_name'] ?? ( $session['title'] ?? __( 'Session', 'eduzen' ) ) ); ?>
		</h3>

		<?php if ( ! empty( $session['location'] ) ) : ?>
		<p class="eduzen-card__description"><?php echo esc_html( $session['location'] ); ?></p>
		<?php endif; ?>

		<div class="eduzen-card__meta">
			<?php if ( $start ) : ?>
			<span class="eduzen-meta-item">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
				<?php echo esc_html( $start ); ?>
				<?php if ( $end && $end !== $start ) : ?>
				→ <?php echo esc_html( $end ); ?>
				<?php endif; ?>
			</span>
			<?php endif; ?>

			<?php if ( $places !== null ) : ?>
			<span class="eduzen-meta-item">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
				<?php
				if ( $places > 0 ) {
					printf( esc_html( _n( '%s place disponible', '%s places disponibles', $places, 'eduzen' ) ), number_format_i18n( $places ) );
				} else {
					esc_html_e( 'Complet', 'eduzen' );
				}
				?>
			</span>
			<?php endif; ?>

			<?php if ( ! empty( $session['price'] ) ) : ?>
			<span class="eduzen-meta-item">
				<?php echo esc_html( number_format_i18n( floatval( $session['price'] ), 0 ) ); ?> €
			</span>
			<?php endif; ?>
		</div>

	</div>
	<?php endforeach; ?>
</div>
