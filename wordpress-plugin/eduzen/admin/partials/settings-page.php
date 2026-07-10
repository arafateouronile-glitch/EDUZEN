<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>

<div class="wrap">
	<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

	<form method="post" action="options.php">
		<?php settings_fields( 'eduzen_options' ); ?>

		<table class="form-table" role="presentation">
			<tr>
				<th scope="row">
					<label for="eduzen_org_slug"><?php esc_html_e( 'Identifiant organisation', 'eduzen' ); ?></label>
				</th>
				<td>
					<input
						type="text"
						id="eduzen_org_slug"
						name="eduzen_org_slug"
						value="<?php echo esc_attr( get_option( 'eduzen_org_slug', '' ) ); ?>"
						class="regular-text"
						placeholder="mon-organisme"
					/>
					<p class="description">
						<?php esc_html_e( 'L\'identifiant (code) de votre organisation EDUZEN. Trouvez-le dans Réglages → Profil organisation sur votre dashboard.', 'eduzen' ); ?>
						<?php
						$slug = get_option( 'eduzen_org_slug', '' );
						if ( $slug ) {
							printf(
								' <a href="%s" target="_blank">%s</a>',
								esc_url( 'https://www.eduzen.io/cataloguepublic/' . rawurlencode( $slug ) ),
								esc_html__( 'Voir votre catalogue →', 'eduzen' )
							);
						}
						?>
					</p>
				</td>
			</tr>
			<tr>
				<th scope="row">
					<label for="eduzen_api_key"><?php esc_html_e( 'Clé API', 'eduzen' ); ?></label>
				</th>
				<td>
					<input
						type="password"
						id="eduzen_api_key"
						name="eduzen_api_key"
						value="<?php echo esc_attr( get_option( 'eduzen_api_key', '' ) ); ?>"
						class="regular-text"
						autocomplete="new-password"
					/>
					<button type="button" id="eduzen-test-btn" class="button button-secondary" style="margin-left:8px;">
						<?php esc_html_e( 'Tester la connexion', 'eduzen' ); ?>
					</button>
					<span id="eduzen-test-result" style="margin-left:8px;font-weight:600;"></span>
					<p class="description">
						<?php esc_html_e( 'Optionnel — uniquement nécessaire pour les shortcodes avancés (programmes, sessions, formations).', 'eduzen' ); ?>
						<a href="https://www.eduzen.io/dashboard/integrations" target="_blank"><?php esc_html_e( 'Générer une clé API →', 'eduzen' ); ?></a>
					</p>
				</td>
			</tr>
			<tr>
				<th scope="row">
					<label for="eduzen_cache_ttl"><?php esc_html_e( 'Durée du cache', 'eduzen' ); ?></label>
				</th>
				<td>
					<select id="eduzen_cache_ttl" name="eduzen_cache_ttl">
						<?php
						$current = intval( get_option( 'eduzen_cache_ttl', 15 ) );
						foreach ( [ 5, 15, 30, 60 ] as $minutes ) :
						?>
						<option value="<?php echo esc_attr( $minutes ); ?>" <?php selected( $current, $minutes ); ?>>
							<?php echo esc_html( $minutes . ' ' . __( 'minutes', 'eduzen' ) ); ?>
						</option>
						<?php endforeach; ?>
					</select>
					<p class="description"><?php esc_html_e( 'Durée de mise en cache des données API.', 'eduzen' ); ?></p>
				</td>
			</tr>
		</table>

		<?php submit_button( __( 'Enregistrer', 'eduzen' ) ); ?>
	</form>

	<hr>

	<h2><?php esc_html_e( 'Intégration catalogue (recommandé)', 'eduzen' ); ?></h2>
	<p><?php esc_html_e( 'Affichez votre catalogue EDUZEN en exact — même design, mêmes couleurs, même mise à jour automatique.', 'eduzen' ); ?></p>

	<?php $slug = get_option( 'eduzen_org_slug', '' ); ?>
	<?php if ( $slug ) : ?>
	<table class="widefat" style="max-width:700px;">
		<thead>
			<tr>
				<th><?php esc_html_e( 'Shortcode', 'eduzen' ); ?></th>
				<th><?php esc_html_e( 'Description', 'eduzen' ); ?></th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>[eduzen_catalogue]</code></td>
				<td><?php esc_html_e( 'Catalogue complet (programmes + design exact EDUZEN)', 'eduzen' ); ?></td>
			</tr>
			<tr>
				<td><code>[eduzen_catalogue height="900"]</code></td>
				<td><?php esc_html_e( 'Hauteur initiale personnalisée (px)', 'eduzen' ); ?></td>
			</tr>
		</tbody>
	</table>
	<?php else : ?>
	<p class="notice notice-warning" style="padding:8px 12px;"><?php esc_html_e( 'Renseignez votre identifiant organisation ci-dessus pour voir votre shortcode catalogue.', 'eduzen' ); ?></p>
	<?php endif; ?>

	<hr>

	<h2><?php esc_html_e( 'Cache', 'eduzen' ); ?></h2>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="eduzen_flush_cache">
		<?php wp_nonce_field( 'eduzen_flush_cache' ); ?>
		<button type="submit" class="button button-secondary">
			<?php esc_html_e( 'Vider le cache', 'eduzen' ); ?>
		</button>
	</form>

	<hr>

	<h2><?php esc_html_e( 'Shortcodes avancés (API)', 'eduzen' ); ?></h2>
	<p><?php esc_html_e( 'Nécessitent une clé API. Permettent d\'afficher des données partielles avec un layout personnalisé.', 'eduzen' ); ?></p>

	<table class="widefat" style="max-width:700px;">
		<thead>
			<tr>
				<th><?php esc_html_e( 'Shortcode', 'eduzen' ); ?></th>
				<th><?php esc_html_e( 'Description', 'eduzen' ); ?></th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>[eduzen_programs]</code></td>
				<td><?php esc_html_e( 'Liste des programmes', 'eduzen' ); ?></td>
			</tr>
			<tr>
				<td><code>[eduzen_sessions]</code></td>
				<td><?php esc_html_e( 'Sessions de formation', 'eduzen' ); ?></td>
			</tr>
			<tr>
				<td><code>[eduzen_formations]</code></td>
				<td><?php esc_html_e( 'Catalogue des formations', 'eduzen' ); ?></td>
			</tr>
		</tbody>
	</table>
</div>
