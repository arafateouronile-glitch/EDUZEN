<?php if ( ! defined( 'ABSPATH' ) ) exit;

$last_sync   = get_option( 'eduzen_last_sync', '' );
$sync_count  = get_option( 'eduzen_sync_count', 0 );
$archive_url = get_post_type_archive_link( 'eduzen_program' );
$slug        = get_option( 'eduzen_org_slug', '' );
?>
<div class="wrap">
<h1 style="display:flex;align-items:center;gap:10px;">
  <?php esc_html_e( 'EDUZEN Connexion Site', 'eduzen' ); ?>
  <span style="font-size:.7em;font-weight:400;color:#8c8f94;background:#f0f0f1;padding:3px 10px;border-radius:999px;">v<?php echo esc_html( EDUZEN_VERSION ); ?></span>
</h1>

<form method="post" action="options.php">
  <?php settings_fields( 'eduzen_options' ); ?>

  <h2 class="title"><?php esc_html_e( 'Connexion EDUZEN', 'eduzen' ); ?></h2>
  <table class="form-table" role="presentation">
    <tr>
      <th scope="row"><label for="eduzen_org_slug"><?php esc_html_e( 'Identifiant organisation', 'eduzen' ); ?></label></th>
      <td>
        <input type="text" id="eduzen_org_slug" name="eduzen_org_slug"
               value="<?php echo esc_attr( $slug ); ?>"
               class="regular-text" placeholder="ex: UNIPARISIVRY2025" />
        <p class="description">
          <?php esc_html_e( 'Code organisation visible dans EDUZEN → Réglages → Profil.', 'eduzen' ); ?>
          <?php if ( $slug ) : ?>
            <a href="<?php echo esc_url( 'https://www.eduzen.io/cataloguepublic/' . rawurlencode( $slug ) ); ?>" target="_blank">
              <?php esc_html_e( 'Voir votre catalogue EDUZEN →', 'eduzen' ); ?>
            </a>
          <?php endif; ?>
        </p>
      </td>
    </tr>
    <tr>
      <th scope="row"><label for="eduzen_api_key"><?php esc_html_e( 'Clé API', 'eduzen' ); ?></label></th>
      <td>
        <input type="password" id="eduzen_api_key" name="eduzen_api_key"
               value="<?php echo esc_attr( get_option( 'eduzen_api_key', '' ) ); ?>"
               class="regular-text" autocomplete="new-password" />
        <button type="button" id="eduzen-test-btn" class="button button-secondary" style="margin-left:8px;">
          <?php esc_html_e( 'Tester la connexion', 'eduzen' ); ?>
        </button>
        <span id="eduzen-test-result" style="margin-left:8px;font-weight:600;"></span>
        <p class="description">
          <?php esc_html_e( 'Requise pour la synchronisation du catalogue. ', 'eduzen' ); ?>
          <a href="https://www.eduzen.io/dashboard/integrations" target="_blank"><?php esc_html_e( 'Générer une clé API →', 'eduzen' ); ?></a>
        </p>
      </td>
    </tr>
    <tr>
      <th scope="row"><label for="eduzen_cache_ttl"><?php esc_html_e( 'Cache API', 'eduzen' ); ?></label></th>
      <td>
        <select id="eduzen_cache_ttl" name="eduzen_cache_ttl">
          <?php foreach ( [ 5, 15, 30, 60 ] as $m ) : ?>
            <option value="<?php echo esc_attr( $m ); ?>" <?php selected( intval( get_option( 'eduzen_cache_ttl', 15 ) ), $m ); ?>>
              <?php echo esc_html( $m . ' minutes' ); ?>
            </option>
          <?php endforeach; ?>
        </select>
        <p class="description"><?php esc_html_e( 'Durée de cache pour les shortcodes API.', 'eduzen' ); ?></p>
      </td>
    </tr>
  </table>

  <h2 class="title"><?php esc_html_e( 'Catalogue WordPress (CPT)', 'eduzen' ); ?></h2>
  <p><?php esc_html_e( 'Vos formations sont importées automatiquement comme pages WordPress réelles, indexées par Google, personnalisables à vos couleurs.', 'eduzen' ); ?></p>
  <table class="form-table" role="presentation">
    <tr>
      <th scope="row"><label for="eduzen_catalogue_slug"><?php esc_html_e( 'URL du catalogue', 'eduzen' ); ?></label></th>
      <td>
        <code><?php echo esc_html( home_url( '/' ) ); ?></code>
        <input type="text" id="eduzen_catalogue_slug" name="eduzen_catalogue_slug"
               value="<?php echo esc_attr( get_option( 'eduzen_catalogue_slug', 'formations' ) ); ?>"
               style="width:160px;margin:0 4px;" />
        <code>/</code>
        <?php if ( $archive_url ) : ?>
          <a href="<?php echo esc_url( $archive_url ); ?>" target="_blank" class="button button-secondary" style="margin-left:6px;">
            Voir le catalogue →
          </a>
        <?php endif; ?>
        <p class="description"><?php esc_html_e( 'Slug de la page d\'archive des formations. Enregistrez puis régénérez les permaliens (Réglages → Permaliens → Enregistrer).', 'eduzen' ); ?></p>
      </td>
    </tr>
    <tr>
      <th scope="row"><label for="eduzen_catalogue_title"><?php esc_html_e( 'Titre catalogue', 'eduzen' ); ?></label></th>
      <td>
        <input type="text" id="eduzen_catalogue_title" name="eduzen_catalogue_title"
               value="<?php echo esc_attr( get_option( 'eduzen_catalogue_title', 'Catalogue des formations' ) ); ?>"
               class="regular-text" />
      </td>
    </tr>
    <tr>
      <th scope="row"><label for="eduzen_catalogue_subtitle"><?php esc_html_e( 'Sous-titre catalogue', 'eduzen' ); ?></label></th>
      <td>
        <input type="text" id="eduzen_catalogue_subtitle" name="eduzen_catalogue_subtitle"
               value="<?php echo esc_attr( get_option( 'eduzen_catalogue_subtitle', 'Découvrez nos programmes de formation professionnelle' ) ); ?>"
               class="regular-text" />
      </td>
    </tr>
    <tr>
      <th scope="row"><label for="eduzen_primary_color"><?php esc_html_e( 'Couleur principale', 'eduzen' ); ?></label></th>
      <td>
        <input type="color" id="eduzen_primary_color" name="eduzen_primary_color"
               value="<?php echo esc_attr( get_option( 'eduzen_primary_color', '#274472' ) ); ?>" />
        <p class="description"><?php esc_html_e( 'Couleur de votre charte graphique. Utilisée sur les boutons, badges, titres.', 'eduzen' ); ?></p>
      </td>
    </tr>
    <tr>
      <th scope="row"><label for="eduzen_cta_url"><?php esc_html_e( 'URL page contact / inscription', 'eduzen' ); ?></label></th>
      <td>
        <input type="url" id="eduzen_cta_url" name="eduzen_cta_url"
               value="<?php echo esc_attr( get_option( 'eduzen_cta_url', '' ) ); ?>"
               class="regular-text" placeholder="<?php echo esc_attr( home_url( '/contact' ) ); ?>" />
        <p class="description"><?php esc_html_e( 'URL vers votre formulaire de contact ou d\'inscription. Utilisée sur les boutons d\'inscription des fiches programme.', 'eduzen' ); ?></p>
      </td>
    </tr>
    <tr>
      <th scope="row"><label for="eduzen_cta_label"><?php esc_html_e( 'Texte du bouton CTA', 'eduzen' ); ?></label></th>
      <td>
        <input type="text" id="eduzen_cta_label" name="eduzen_cta_label"
               value="<?php echo esc_attr( get_option( 'eduzen_cta_label', 'Demander des informations' ) ); ?>"
               class="regular-text" />
      </td>
    </tr>
  </table>

  <?php submit_button( 'Enregistrer les réglages' ); ?>
</form>

<hr>

<h2><?php esc_html_e( 'Synchronisation', 'eduzen' ); ?></h2>
<p>
  <?php esc_html_e( 'Importe vos programmes depuis EDUZEN comme pages WordPress réelles.', 'eduzen' ); ?>
  <?php esc_html_e( 'La synchronisation automatique s\'exécute une fois par jour.', 'eduzen' ); ?>
</p>

<?php if ( $last_sync ) : ?>
<p style="color:#0a6b32;background:#e6f4ea;padding:8px 14px;border-radius:6px;display:inline-block;font-size:.9rem;">
  ✓ <?php
    printf(
      'Dernière sync : <strong>%s</strong> — %d programme%s importé%s.',
      esc_html( wp_date( 'd/m/Y à H:i', strtotime( $last_sync ) ) ),
      intval( $sync_count ),
      intval( $sync_count ) > 1 ? 's' : '',
      intval( $sync_count ) > 1 ? 's' : ''
    );
  ?>
</p>
<?php endif; ?>

<p>
  <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
    <input type="hidden" name="action" value="eduzen_manual_sync">
    <?php wp_nonce_field( 'eduzen_manual_sync' ); ?>
    <button type="submit" class="button button-primary"
      <?php echo get_option( 'eduzen_api_key' ) ? '' : 'disabled title="Configurez une clé API d\'abord"'; ?>>
      🔄 <?php esc_html_e( 'Synchroniser maintenant', 'eduzen' ); ?>
    </button>
    <?php if ( $archive_url ) : ?>
      <a href="<?php echo esc_url( $archive_url ); ?>" target="_blank" class="button button-secondary" style="margin-left:8px;">
        Voir le catalogue WordPress →
      </a>
    <?php endif; ?>
  </form>
</p>

<?php
$next_cron = wp_next_scheduled( 'eduzen_daily_sync' );
if ( $next_cron ) :
?>
<p style="font-size:.85rem;color:#8c8f94;">
  Prochaine sync automatique : <?php echo esc_html( wp_date( 'd/m/Y à H:i', $next_cron ) ); ?>
</p>
<?php endif; ?>

<hr>

<h2><?php esc_html_e( 'Cache & Outils', 'eduzen' ); ?></h2>
<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
  <input type="hidden" name="action" value="eduzen_flush_cache">
  <?php wp_nonce_field( 'eduzen_flush_cache' ); ?>
  <button type="submit" class="button button-secondary">
    <?php esc_html_e( 'Vider le cache', 'eduzen' ); ?>
  </button>
</form>

<hr>

<h2><?php esc_html_e( 'Intégration par iframe (alternative)', 'eduzen' ); ?></h2>
<p><?php esc_html_e( 'Si vous préférez une intégration iframe au lieu du CPT, utilisez ce shortcode :', 'eduzen' ); ?></p>
<?php if ( $slug ) : ?>
<table class="widefat" style="max-width:700px;">
  <thead><tr>
    <th><?php esc_html_e( 'Shortcode', 'eduzen' ); ?></th>
    <th><?php esc_html_e( 'Résultat', 'eduzen' ); ?></th>
  </tr></thead>
  <tbody>
    <tr>
      <td><code>[eduzen_catalogue]</code></td>
      <td><?php esc_html_e( 'Catalogue EDUZEN en iframe (design identique, auto-resize)', 'eduzen' ); ?></td>
    </tr>
    <tr>
      <td><code>[eduzen_catalogue height="900"]</code></td>
      <td><?php esc_html_e( 'Hauteur initiale personnalisée (px)', 'eduzen' ); ?></td>
    </tr>
  </tbody>
</table>
<?php else : ?>
<p class="notice notice-warning" style="padding:8px 12px;">
  <?php esc_html_e( 'Renseignez votre identifiant organisation ci-dessus pour voir votre shortcode.', 'eduzen' ); ?>
</p>
<?php endif; ?>
</div>
