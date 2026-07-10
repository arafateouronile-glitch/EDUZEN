<?php
/**
 * Archive template — catalogue EDUZEN (list of eduzen_program posts).
 * Inherits the active WordPress theme's header/footer.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

$primary_color = get_option( 'eduzen_primary_color', '#274472' );
$cta_url       = get_option( 'eduzen_cta_url', '#contact' );
$archive_title = get_option( 'eduzen_catalogue_title', 'Catalogue des formations' );
$archive_sub   = get_option( 'eduzen_catalogue_subtitle', 'Découvrez nos programmes de formation professionnelle' );

// Count total published programs
$total_programs = wp_count_posts( 'eduzen_program' )->publish;

get_header(); ?>

<style>
:root { --eduzen-primary: <?php echo esc_attr( $primary_color ); ?>; }

/* Annule les contraintes de largeur des thèmes block (TwentyTwentyFive, etc.) */
.post-type-archive-eduzen_program .wp-site-blocks,
.tax-eduzen_category .wp-site-blocks {
  padding-right: 0 !important;
  padding-left:  0 !important;
}
.post-type-archive-eduzen_program .is-layout-constrained > *,
.tax-eduzen_category .is-layout-constrained > *,
.post-type-archive-eduzen_program .has-global-padding,
.tax-eduzen_category .has-global-padding {
  max-width: none !important;
  padding-left:  0 !important;
  padding-right: 0 !important;
  margin-left:  0 !important;
  margin-right: 0 !important;
}
/* Reset des marges WordPress classiques */
.post-type-archive-eduzen_program #content,
.post-type-archive-eduzen_program #primary,
.post-type-archive-eduzen_program #main,
.post-type-archive-eduzen_program .site-main,
.tax-eduzen_category #content,
.tax-eduzen_category #primary,
.tax-eduzen_category #main {
  padding: 0 !important;
  max-width: none !important;
  width: 100% !important;
}
</style>

<div class="eduzen-archive">

  <?php /* ── Hero ─────────────────────────────────────────── */ ?>
  <div class="eduzen-archive-hero">
    <?php if ( is_tax( 'eduzen_category' ) ) : $term = get_queried_object(); ?>
      <h1><?php echo esc_html( $term->name ); ?></h1>
      <?php if ( $term->description ) : ?>
        <p><?php echo esc_html( $term->description ); ?></p>
      <?php endif; ?>
    <?php else : ?>
      <h1><?php echo esc_html( $archive_title ); ?></h1>
      <p><?php echo esc_html( $archive_sub ); ?></p>
      <span class="eduzen-badge-count">
        <?php printf( _n( '%s programme', '%s programmes', $total_programs, 'eduzen' ), number_format_i18n( $total_programs ) ); ?>
      </span>
    <?php endif; ?>
  </div>

  <?php /* ── Category filter ──────────────────────────────── */ ?>
  <?php
  $categories = get_terms( [ 'taxonomy' => 'eduzen_category', 'hide_empty' => true ] );
  if ( ! empty( $categories ) && ! is_wp_error( $categories ) ) :
    $current_term = is_tax( 'eduzen_category' ) ? get_queried_object()->slug : '';
  ?>
  <div class="eduzen-filter-bar">
    <a href="<?php echo esc_url( get_post_type_archive_link( 'eduzen_program' ) ); ?>"
       class="eduzen-filter-pill <?php echo $current_term === '' ? 'active' : ''; ?>">
      Toutes
    </a>
    <?php foreach ( $categories as $cat ) : ?>
    <a href="<?php echo esc_url( get_term_link( $cat ) ); ?>"
       class="eduzen-filter-pill <?php echo $current_term === $cat->slug ? 'active' : ''; ?>">
      <?php echo esc_html( $cat->name ); ?> (<?php echo intval( $cat->count ); ?>)
    </a>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>

  <?php /* ── Program cards ─────────────────────────────────── */ ?>
  <div class="eduzen-programs-grid">
    <?php if ( have_posts() ) : ?>
      <?php while ( have_posts() ) : the_post();
        $post_id         = get_the_ID();
        $image_url       = get_post_meta( $post_id, '_eduzen_image_url', true );
        $category        = get_post_meta( $post_id, '_eduzen_category', true );
        $price           = get_post_meta( $post_id, '_eduzen_price', true );
        $success_rate    = get_post_meta( $post_id, '_eduzen_success_rate', true );
        $total_learners  = get_post_meta( $post_id, '_eduzen_total_learners', true );
        $sessions_json   = get_post_meta( $post_id, '_eduzen_sessions', true );
        $sessions        = json_decode( $sessions_json ?: '[]', true );
        $upcoming_count  = count( array_filter( $sessions, fn( $s ) =>
          in_array( $s['status'] ?? '', [ 'scheduled', 'ongoing' ], true ) &&
          ! empty( $s['start_date'] ) && strtotime( $s['start_date'] ) >= time()
        ) );
      ?>
      <a href="<?php the_permalink(); ?>" class="eduzen-program-card">

        <?php if ( $image_url ) : ?>
          <img src="<?php echo esc_url( $image_url ); ?>"
               alt="<?php echo esc_attr( get_the_title() ); ?>"
               class="eduzen-card-image"
               loading="lazy">
        <?php else : ?>
          <div class="eduzen-card-image-placeholder">🎓</div>
        <?php endif; ?>

        <div class="eduzen-card-body">
          <?php if ( $category ) : ?>
            <span class="eduzen-card-category"><?php echo esc_html( $category ); ?></span>
          <?php endif; ?>

          <h2 class="eduzen-card-title"><?php the_title(); ?></h2>

          <p class="eduzen-card-excerpt"><?php echo esc_html( get_the_excerpt() ); ?></p>

          <div class="eduzen-card-stats">
            <?php if ( $upcoming_count > 0 ) : ?>
              <span class="eduzen-stat-pill">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z"/></svg>
                <?php printf( _n( '%s session', '%s sessions', $upcoming_count, 'eduzen' ), $upcoming_count ); ?>
              </span>
            <?php endif; ?>
            <?php if ( $success_rate ) : ?>
              <span class="eduzen-stat-pill">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <?php echo intval( $success_rate ); ?>% réussite
              </span>
            <?php endif; ?>
            <?php if ( $total_learners ) : ?>
              <span class="eduzen-stat-pill">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                <?php echo number_format_i18n( intval( $total_learners ) ); ?> apprenants
              </span>
            <?php endif; ?>
          </div>
        </div>

        <div class="eduzen-card-footer">
          <?php if ( $price ) : ?>
            <div>
              <div class="eduzen-price"><?php echo number_format( floatval( $price ), 0, ',', ' ' ); ?> €</div>
              <div class="eduzen-price-label">HT / personne</div>
            </div>
          <?php else : ?>
            <div class="eduzen-price-label">Prix sur demande</div>
          <?php endif; ?>
          <span class="eduzen-btn eduzen-btn--outline">Voir →</span>
        </div>

      </a>
      <?php endwhile; ?>
    <?php else : ?>
      <div class="eduzen-empty-state">
        <p>Aucun programme disponible pour le moment.</p>
        <p style="font-size:.85rem;">Revenez bientôt ou contactez-nous pour plus d'informations.</p>
      </div>
    <?php endif; ?>
  </div>

  <?php /* ── Pagination ────────────────────────────────────── */ ?>
  <?php if ( $GLOBALS['wp_query']->max_num_pages > 1 ) : ?>
    <div class="eduzen-pagination">
      <?php
      echo paginate_links( [
        'prev_text' => '← Précédent',
        'next_text' => 'Suivant →',
        'type'      => 'list',
      ] );
      ?>
    </div>
  <?php endif; ?>

</div>

<?php get_footer(); ?>
