<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>

<div class="wrap">
	<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

	<form method="post" action="options.php">
		<?php settings_fields( 'eduzen_options' ); ?>

		<table class="form-table" role="presentation">
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
						<?php
						printf(
							/* translators: %s: URL de la page API */
							esc_html__( 'Générez une clé API "site web" depuis votre dashboard EDUZEN : %s', 'eduzen' ),
							'<a href="https://eduzen.fr/dashboard/settings/api" target="_blank">Réglages → API</a>'
						);
						?>
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
					<p class="description"><?php esc_html_e( 'Durée pendant laquelle les données sont mises en cache avant un nouvel appel à l\'API.', 'eduzen' ); ?></p>
				</td>
			</tr>
		</table>

		<?php submit_button( __( 'Enregistrer', 'eduzen' ) ); ?>
	</form>

	<hr>

	<h2><?php esc_html_e( 'Cache', 'eduzen' ); ?></h2>
	<p><?php esc_html_e( 'Videz le cache pour forcer le rechargement immédiat des données depuis EDUZEN.', 'eduzen' ); ?></p>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="eduzen_flush_cache">
		<?php wp_nonce_field( 'eduzen_flush_cache' ); ?>
		<button type="submit" class="button button-secondary">
			<?php esc_html_e( 'Vider le cache', 'eduzen' ); ?>
		</button>
	</form>

	<hr>

	<h2><?php esc_html_e( 'Comment utiliser les shortcodes', 'eduzen' ); ?></h2>
	<p><?php esc_html_e( 'Collez ces shortcodes dans n\'importe quelle page ou article WordPress :', 'eduzen' ); ?></p>

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
				<td><?php esc_html_e( 'Liste des programmes avec taux de réussite, satisfaction et apprenants', 'eduzen' ); ?></td>
			</tr>
			<tr>
				<td><code>[eduzen_sessions]</code></td>
				<td><?php esc_html_e( 'Sessions de formation avec dates, places et statut', 'eduzen' ); ?></td>
			</tr>
			<tr>
				<td><code>[eduzen_formations]</code></td>
				<td><?php esc_html_e( 'Catalogue des formations avec durée, tarif et description', 'eduzen' ); ?></td>
			</tr>
		</tbody>
	</table>

	<h3><?php esc_html_e( 'Attributs disponibles', 'eduzen' ); ?></h3>
	<ul style="list-style:disc;padding-left:1.5em;">
		<li><code>[eduzen_programs limit="6" columns="2"]</code></li>
		<li><code>[eduzen_sessions limit="5" status="ongoing"]</code></li>
		<li><code>[eduzen_formations limit="9" columns="3" search="sécurité"]</code></li>
	</ul>
</div>

