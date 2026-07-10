<?php
/**
 * Single program template — fiche détaillée d'un programme de formation.
 * Inherits the active WordPress theme's header/footer.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

$post_id          = get_the_ID();
$primary_color    = get_option( 'eduzen_primary_color', '#274472' );
$cta_url          = get_option( 'eduzen_cta_url', '#contact' );
$cta_label        = get_option( 'eduzen_cta_label', 'Demander des informations' );

$image_url        = get_post_meta( $post_id, '_eduzen_image_url', true );
$category         = get_post_meta( $post_id, '_eduzen_category', true );
$price            = get_post_meta( $post_id, '_eduzen_price', true );
$price_enterprise = get_post_meta( $post_id, '_eduzen_price_enterprise', true );
$price_freelance  = get_post_meta( $post_id, '_eduzen_price_freelance', true );
$success_rate     = get_post_meta( $post_id, '_eduzen_success_rate', true );
$satisfaction     = get_post_meta( $post_id, '_eduzen_satisfaction_rate', true );
$completion       = get_post_meta( $post_id, '_eduzen_completion_rate', true );
$total_learners   = get_post_meta( $post_id, '_eduzen_total_learners', true );
$sessions_json    = get_post_meta( $post_id, '_eduzen_sessions', true );
$formations_json  = get_post_meta( $post_id, '_eduzen_formations', true );

$sessions   = json_decode( $sessions_json  ?: '[]', true );
$formations = json_decode( $formations_json ?: '[]', true );

// Split sessions: upcoming vs past
$upcoming_sessions = array_values( array_filter( $sessions, fn( $s ) =>
  in_array( $s['status'] ?? '', [ 'scheduled', 'ongoing' ], true ) &&
  ! empty( $s['start_date'] ) && strtotime( $s['start_date'] ) >= strtotime( '-1 day' )
) );
$past_sessions = array_values( array_filter( $sessions, fn( $s ) =>
  ( $s['status'] ?? '' ) === 'completed' ||
  ( ! empty( $s['start_date'] ) && strtotime( $s['start_date'] ) < strtotime( '-1 day' ) )
) );

// Display price: individual price (or first available)
$display_price = $price ?: $price_freelance ?: '';

get_header(); ?>

<style>
:root { --eduzen-primary: <?php echo esc_attr( $primary_color ); ?>; }

/* Annule les contraintes de largeur des thèmes block (TwentyTwentyFive, etc.) */
.single-eduzen_program .wp-site-blocks {
  padding-right: 0 !important;
  padding-left:  0 !important;
}
.single-eduzen_program .is-layout-constrained > *,
.single-eduzen_program .has-global-padding {
  max-width: none !important;
  padding-left:  0 !important;
  padding-right: 0 !important;
  margin-left:  0 !important;
  margin-right: 0 !important;
}
/* Reset des marges WordPress classiques */
.single-eduzen_program #content,
.single-eduzen_program #primary,
.single-eduzen_program #main,
.single-eduzen_program .site-main {
  padding: 0 !important;
  max-width: none !important;
  width: 100% !important;
}
</style>

<div class="eduzen-single">

  <?php /* ── Hero ───────────────────────────────────────────── */ ?>
  <div class="eduzen-single-hero">
    <div class="eduzen-single-hero__bg">
      <?php if ( $image_url ) : ?>
        <img src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" loading="eager">
      <?php endif; ?>
    </div>
    <div class="eduzen-single-hero__overlay"></div>
    <div class="eduzen-single-hero__content">
      <?php
      $breadcrumb_url = get_post_type_archive_link( 'eduzen_program' );
      printf(
        '<p style="margin:0 0 12px;font-size:.85rem;opacity:.7;color:#fff;">
          <a href="%s" style="color:inherit;text-decoration:none;">← Catalogue</a>
          %s</p>',
        esc_url( $breadcrumb_url ),
        $category ? ' &rsaquo; ' . esc_html( $category ) : ''
      );
      ?>
      <?php if ( $category ) : ?>
        <span class="eduzen-card-category"><?php echo esc_html( $category ); ?></span>
      <?php endif; ?>
      <h1><?php the_title(); ?></h1>
      <?php if ( $excerpt = get_the_excerpt() ) : ?>
        <p class="lead"><?php echo esc_html( $excerpt ); ?></p>
      <?php endif; ?>
    </div>
  </div>

  <?php /* ── Stats ribbon ───────────────────────────────────── */ ?>
  <?php $has_stats = $total_learners || $success_rate || $satisfaction || count( $upcoming_sessions ); ?>
  <?php if ( $has_stats ) : ?>
  <div class="eduzen-stats-ribbon">
    <?php if ( $total_learners ) : ?>
      <div class="eduzen-stats-ribbon__item">
        <div class="eduzen-stats-ribbon__value"><?php echo number_format_i18n( intval( $total_learners ) ); ?></div>
        <div class="eduzen-stats-ribbon__label">Apprenants formés</div>
      </div>
    <?php endif; ?>
    <?php if ( $success_rate ) : ?>
      <div class="eduzen-stats-ribbon__item">
        <div class="eduzen-stats-ribbon__value"><?php echo intval( $success_rate ); ?>%</div>
        <div class="eduzen-stats-ribbon__label">Taux de réussite</div>
      </div>
    <?php endif; ?>
    <?php if ( $satisfaction ) : ?>
      <div class="eduzen-stats-ribbon__item">
        <div class="eduzen-stats-ribbon__value"><?php echo intval( $satisfaction ); ?>%</div>
        <div class="eduzen-stats-ribbon__label">Satisfaction</div>
      </div>
    <?php endif; ?>
    <?php if ( count( $upcoming_sessions ) > 0 ) : ?>
      <div class="eduzen-stats-ribbon__item">
        <div class="eduzen-stats-ribbon__value"><?php echo count( $upcoming_sessions ); ?></div>
        <div class="eduzen-stats-ribbon__label">Session<?php echo count( $upcoming_sessions ) > 1 ? 's' : ''; ?> à venir</div>
      </div>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <?php /* ── Main layout ────────────────────────────────────── */ ?>
  <div class="eduzen-single-layout">

    <?php /* — Left column: description, modules, sessions — */ ?>
    <div class="eduzen-single-main">

      <?php /* Description */ ?>
      <?php if ( $content = get_the_content() ) :
        // Strip the sessions/modules generated for SEO — show only first <div> block (description)
        $desc_only = preg_replace( '/<h2>.*$/s', '', $content );
        if ( trim( strip_tags( $desc_only ) ) ) :
        ?>
        <section>
          <h2>À propos de cette formation</h2>
          <div class="eduzen-description">
            <?php echo wp_kses_post( apply_filters( 'the_content', $desc_only ) ); ?>
          </div>
        </section>
      <?php endif; endif; ?>

      <?php /* Formations / modules */ ?>
      <?php if ( ! empty( $formations ) ) : ?>
        <section>
          <h2>Contenu de la formation</h2>
          <?php foreach ( $formations as $f ) :
            $f_name = esc_html( $f['name'] ?? 'Module' );
            $f_desc = $f['description'] ?? '';
          ?>
          <details class="eduzen-formation-item">
            <summary><?php echo $f_name; ?></summary>
            <?php if ( $f_desc ) : ?>
              <div class="eduzen-formation-item__body"><?php echo wp_kses_post( $f_desc ); ?></div>
            <?php else : ?>
              <div class="eduzen-formation-item__body" style="color:#94a3b8;">Aucun détail disponible pour ce module.</div>
            <?php endif; ?>
          </details>
          <?php endforeach; ?>
        </section>
      <?php endif; ?>

      <?php /* Upcoming sessions */ ?>
      <?php if ( ! empty( $upcoming_sessions ) ) : ?>
        <section>
          <h2>Prochaines sessions</h2>
          <div class="eduzen-sessions-list">
            <?php foreach ( $upcoming_sessions as $s ) :
              $start   = ! empty( $s['start_date'] ) ? strtotime( $s['start_date'] ) : false;
              $end     = ! empty( $s['end_date'] )   ? strtotime( $s['end_date'] )   : false;
              $status  = $s['status'] ?? 'scheduled';
              $loc     = $s['location'] ?? '';
              $spots   = isset( $s['max_participants'] ) ? intval( $s['max_participants'] ) : 0;
              $enrolled = isset( $s['enrolled_count'] )  ? intval( $s['enrolled_count'] )  : 0;
              $spots_left = $spots > 0 ? max( 0, $spots - $enrolled ) : 0;
              $badge_class = 'eduzen-session-badge--' . ( $spots_left === 0 && $spots > 0 ? 'full' : $status );
              $badge_label = $spots_left === 0 && $spots > 0
                ? 'Complet' : ( $status === 'ongoing' ? 'En cours' : 'Ouvert' );
            ?>
            <div class="eduzen-session-card">
              <div class="eduzen-session-card__info">
                <div class="eduzen-session-card__date">
                  <?php if ( $start ) echo esc_html( date_i18n( 'd F Y', $start ) ); ?>
                  <?php if ( $end && $end !== $start ) echo ' — ' . esc_html( date_i18n( 'd F Y', $end ) ); ?>
                </div>
                <div class="eduzen-session-card__meta">
                  <?php if ( $loc ) : ?>
                    <span>📍 <?php echo esc_html( $loc ); ?></span>
                  <?php endif; ?>
                  <?php if ( $spots > 0 ) : ?>
                    <span>👥 <?php echo $spots_left > 0
                      ? esc_html( $spots_left . ' place' . ( $spots_left > 1 ? 's' : '' ) . ' restante' . ( $spots_left > 1 ? 's' : '' ) )
                      : 'Complet'; ?></span>
                  <?php endif; ?>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
                <span class="eduzen-session-badge <?php echo esc_attr( $badge_class ); ?>"><?php echo esc_html( $badge_label ); ?></span>
                <?php if ( $spots_left !== 0 || $spots === 0 ) : ?>
                  <a href="<?php echo esc_url( $cta_url ); ?>" class="eduzen-btn" style="padding:7px 14px;font-size:.8rem;">
                    S'inscrire
                  </a>
                <?php endif; ?>
              </div>
            </div>
            <?php endforeach; ?>
          </div>
        </section>
      <?php elseif ( empty( $sessions ) ) : ?>
        <section>
          <h2>Sessions de formation</h2>
          <p style="color:#64748b;">Aucune session programmée pour le moment. Contactez-nous pour organiser une session adaptée à vos besoins.</p>
        </section>
      <?php endif; ?>

    </div><!-- /.eduzen-single-main -->

    <?php /* — Right column: CTA sidebar — */ ?>
    <aside>
      <div class="eduzen-cta-card">
        <?php if ( $display_price ) : ?>
          <div class="eduzen-cta-card__price"><?php echo number_format( floatval( $display_price ), 0, ',', ' ' ); ?> €</div>
          <div class="eduzen-cta-card__price-label">HT · tarif individuel</div>
        <?php else : ?>
          <div class="eduzen-cta-card__price" style="font-size:1.3rem;">Prix sur demande</div>
          <div class="eduzen-cta-card__price-label" style="margin-bottom:20px;"> </div>
        <?php endif; ?>

        <a href="<?php echo esc_url( $cta_url ); ?>" class="eduzen-btn">
          <?php echo esc_html( $cta_label ); ?>
        </a>
        <?php if ( ! empty( $upcoming_sessions ) ) : ?>
          <a href="#sessions" class="eduzen-btn eduzen-btn--outline" onclick="document.getElementById('sessions') && event.preventDefault(); document.querySelector('.eduzen-sessions-list')?.scrollIntoView({behavior:'smooth'})">
            Voir les sessions
          </a>
        <?php endif; ?>

        <div class="eduzen-cta-card__divider"></div>

        <div class="eduzen-cta-card__info">
          <?php if ( count( $upcoming_sessions ) > 0 ) : ?>
            <div class="eduzen-cta-info-row">
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z"/></svg>
              <span><strong><?php echo count( $upcoming_sessions ); ?> session<?php echo count( $upcoming_sessions ) > 1 ? 's' : ''; ?></strong> disponible<?php echo count( $upcoming_sessions ) > 1 ? 's' : ''; ?></span>
            </div>
          <?php endif; ?>
          <?php if ( $success_rate ) : ?>
            <div class="eduzen-cta-info-row">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              <span>Taux de réussite <strong><?php echo intval( $success_rate ); ?>%</strong></span>
            </div>
          <?php endif; ?>
          <?php if ( $satisfaction ) : ?>
            <div class="eduzen-cta-info-row">
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <span>Satisfaction <strong><?php echo intval( $satisfaction ); ?>%</strong></span>
            </div>
          <?php endif; ?>
          <?php if ( $price_enterprise && $price_enterprise !== $display_price ) : ?>
            <div class="eduzen-cta-info-row">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
              <span>Entreprise : <strong><?php echo number_format( floatval( $price_enterprise ), 0, ',', ' ' ); ?> €</strong></span>
            </div>
          <?php endif; ?>
          <?php if ( ! empty( $upcoming_sessions[0]['location'] ) ) : ?>
            <div class="eduzen-cta-info-row">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
              <span><?php echo esc_html( $upcoming_sessions[0]['location'] ); ?></span>
            </div>
          <?php endif; ?>
        </div>
      </div>

      <?php /* Related programs */ ?>
      <?php if ( $category ) :
        $related = get_posts( [
          'post_type'      => 'eduzen_program',
          'posts_per_page' => 3,
          'post__not_in'   => [ $post_id ],
          'meta_key'       => '_eduzen_category',
          'meta_value'     => $category,
        ] );
        if ( ! empty( $related ) ) :
      ?>
      <div style="margin-top:24px;">
        <h3 style="font-size:.85rem;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;font-weight:600;margin-bottom:12px;">
          Dans la même catégorie
        </h3>
        <?php foreach ( $related as $rel ) : ?>
          <a href="<?php echo esc_url( get_permalink( $rel ) ); ?>"
             style="display:block;padding:10px 14px;background:#f8f9fc;border-radius:8px;text-decoration:none;color:#1a1a2e;font-size:.88rem;font-weight:500;margin-bottom:6px;transition:background .15s;"
             onmouseover="this.style.background='#eff1f8'" onmouseout="this.style.background='#f8f9fc'">
            <?php echo esc_html( get_the_title( $rel ) ); ?> →
          </a>
        <?php endforeach; ?>
      </div>
      <?php endif; endif; ?>

    </aside>
  </div><!-- /.eduzen-single-layout -->

</div><!-- /.eduzen-single -->

<?php get_footer(); ?>
