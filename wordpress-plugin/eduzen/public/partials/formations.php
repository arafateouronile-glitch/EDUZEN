<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<?php
/**
 * Template formations
 * Variables : $items (array), $atts (shortcode atts)
 */
$cols = intval( $atts['columns'] );
?>
<div class="eduzen-grid" style="--eduzen-cols:<?php echo esc_attr( $cols ); ?>;">
	<?php foreach ( $items as $formation ) :
		$duration = $formation['duration_hours'] ?? null;
		$price    = $formation['price']          ?? null;
	?>
	<div class="eduzen-card">

		<div class="eduzen-card__badges">
			<?php if ( ! empty( $formation['category'] ) ) : ?>
			<span class="eduzen-badge eduzen-badge--category"><?php echo esc_html( $formation['category'] ); ?></span>
			<?php endif; ?>
		</div>

		<h3 class="eduzen-card__title"><?php echo esc_html( $formation['name'] ); ?></h3>

		<?php if ( ! empty( $formation['description'] ) ) : ?>
		<p class="eduzen-card__description"><?php echo esc_html( $formation['description'] ); ?></p>
		<?php endif; ?>

		<div class="eduzen-card__meta">
			<?php if ( $duration ) : ?>
			<span class="eduzen-meta-item">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
				<?php printf( esc_html( _n( '%sh de formation', '%sh de formation', intval( $duration ), 'eduzen' ) ), number_format_i18n( intval( $duration ) ) ); ?>
			</span>
			<?php endif; ?>

			<?php if ( $price !== null && $price !== '' ) : ?>
			<span class="eduzen-meta-item">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.028 2.353 1.028V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.028-2.354-1.028V5z" clip-rule="evenodd"/></svg>
				<?php echo esc_html( number_format_i18n( floatval( $price ), 0 ) ); ?> €
			</span>
			<?php endif; ?>

			<?php if ( ! empty( $formation['programs'] ) ) :
				$prog = is_array( $formation['programs'] ) ? $formation['programs'] : [];
				if ( ! empty( $prog['name'] ) ) :
			?>
			<span class="eduzen-meta-item">
				<?php echo esc_html( $prog['name'] ); ?>
			</span>
			<?php endif; endif; ?>
		</div>

	</div>
	<?php endforeach; ?>
</div>
