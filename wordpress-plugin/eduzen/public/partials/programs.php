<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<?php
/**
 * Template programmes
 * Variables : $items (array), $atts (shortcode atts)
 */
$cols       = intval( $atts['columns'] );
$show_stats = $atts['show_stats'] !== 'false';
?>
<div class="eduzen-grid" style="--eduzen-cols:<?php echo esc_attr( $cols ); ?>;">
	<?php foreach ( $items as $program ) : ?>
	<div class="eduzen-card">

		<?php if ( ! empty( $program['public_image_url'] ) ) : ?>
		<img
			class="eduzen-card__image"
			src="<?php echo esc_url( $program['public_image_url'] ); ?>"
			alt="<?php echo esc_attr( $program['name'] ); ?>"
			loading="lazy"
		/>
		<?php endif; ?>

		<div class="eduzen-card__badges">
			<?php if ( ! empty( $program['code'] ) ) : ?>
			<span class="eduzen-badge eduzen-badge--code"><?php echo esc_html( $program['code'] ); ?></span>
			<?php endif; ?>
			<?php if ( ! empty( $program['category'] ) ) : ?>
			<span class="eduzen-badge eduzen-badge--category"><?php echo esc_html( $program['category'] ); ?></span>
			<?php endif; ?>
		</div>

		<h3 class="eduzen-card__title"><?php echo esc_html( $program['name'] ); ?></h3>

		<?php
		$description = ! empty( $program['public_description'] ) ? $program['public_description'] : ( $program['description'] ?? '' );
		if ( $description ) :
		?>
		<p class="eduzen-card__description"><?php echo esc_html( $description ); ?></p>
		<?php endif; ?>

		<?php if ( $show_stats ) : ?>
		<div class="eduzen-card__stats">

			<?php if ( isset( $program['success_rate'] ) && $program['success_rate'] !== null ) :
				$rate = floatval( $program['success_rate'] );
			?>
			<div class="eduzen-stat">
				<span class="eduzen-stat__label"><?php esc_html_e( 'Taux de réussite', 'eduzen' ); ?></span>
				<div class="eduzen-stat__bar">
					<div class="eduzen-stat__fill" style="width:<?php echo esc_attr( min( 100, $rate ) ); ?>%;"></div>
				</div>
				<span class="eduzen-stat__value"><?php echo esc_html( round( $rate ) ); ?>%</span>
			</div>
			<?php endif; ?>

			<?php if ( isset( $program['satisfaction_rate'] ) && $program['satisfaction_rate'] !== null ) :
				$satisfaction = floatval( $program['satisfaction_rate'] );
				$pct          = ( $satisfaction / 5 ) * 100;
			?>
			<div class="eduzen-stat">
				<span class="eduzen-stat__label"><?php esc_html_e( 'Satisfaction', 'eduzen' ); ?></span>
				<div class="eduzen-stat__bar">
					<div class="eduzen-stat__fill eduzen-stat__fill--satisfaction" style="width:<?php echo esc_attr( min( 100, $pct ) ); ?>%;"></div>
				</div>
				<span class="eduzen-stat__value"><?php echo esc_html( number_format( $satisfaction, 1 ) ); ?>/5</span>
			</div>
			<?php endif; ?>

			<?php if ( ! empty( $program['total_learners'] ) ) : ?>
			<div class="eduzen-card__learners">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
				<?php printf( esc_html( _n( '%s apprenant', '%s apprenants', intval( $program['total_learners'] ), 'eduzen' ) ), number_format_i18n( intval( $program['total_learners'] ) ) ); ?>
			</div>
			<?php endif; ?>

		</div>
		<?php endif; ?>

	</div>
	<?php endforeach; ?>
</div>
