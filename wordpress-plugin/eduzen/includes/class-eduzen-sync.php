<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Eduzen_Sync {

	private $api;

	public function __construct() {
		$this->api = new Eduzen_API();
	}

	public function init() {
		add_action( 'eduzen_daily_sync',            [ $this, 'sync' ] );
		add_action( 'admin_post_eduzen_manual_sync', [ $this, 'handle_manual_sync' ] );
	}

	/**
	 * Main sync: fetch programs + formations + sessions from EDUZEN API,
	 * then create/update WP posts of type eduzen_program.
	 */
	public function sync() {
		if ( ! get_option( 'eduzen_api_key' ) ) {
			return [ 'success' => false, 'message' => 'Clé API non configurée.' ];
		}

		// ---------- fetch all data ----------
		$programs = $this->fetch_all( 'programs', [ 'is_public' => 'true' ] );
		if ( is_wp_error( $programs ) ) {
			return [ 'success' => false, 'message' => $programs->get_error_message() ];
		}

		$formations = $this->fetch_all( 'formations' );
		$sessions   = $this->fetch_all( 'sessions' );

		// ---------- build index: formation_id → program_id ----------
		$formation_to_program = [];
		foreach ( (array) $formations as $f ) {
			if ( ! empty( $f['id'] ) && ! empty( $f['program_id'] ) ) {
				$formation_to_program[ $f['id'] ] = $f['program_id'];
			}
		}

		// ---------- group sessions and formations by program ----------
		$sessions_by_program   = [];
		$formations_by_program = [];

		foreach ( (array) $formations as $f ) {
			if ( ! empty( $f['program_id'] ) ) {
				$formations_by_program[ $f['program_id'] ][] = $f;
			}
		}

		foreach ( (array) $sessions as $s ) {
			$pid = null;
			// Try direct program_id field first
			if ( ! empty( $s['program_id'] ) ) {
				$pid = $s['program_id'];
			} elseif ( ! empty( $s['formation_id'] ) && isset( $formation_to_program[ $s['formation_id'] ] ) ) {
				$pid = $formation_to_program[ $s['formation_id'] ];
			}
			if ( $pid ) {
				$sessions_by_program[ $pid ][] = $s;
			}
		}

		// ---------- upsert WP posts ----------
		$created         = 0;
		$updated         = 0;
		$synced_ids      = [];

		foreach ( (array) $programs as $program ) {
			if ( empty( $program['id'] ) ) continue;

			$prog_id    = $program['id'];
			$prog_sess  = $sessions_by_program[ $prog_id ] ?? [];
			$prog_forms = $formations_by_program[ $prog_id ] ?? [];

			// Sort upcoming sessions first
			usort( $prog_sess, fn( $a, $b ) =>
				strtotime( $a['start_date'] ?? '0' ) - strtotime( $b['start_date'] ?? '0' )
			);

			$existing = get_posts( [
				'post_type'      => 'eduzen_program',
				'meta_key'       => '_eduzen_program_id',
				'meta_value'     => $prog_id,
				'posts_per_page' => 1,
				'post_status'    => 'any',
				'fields'         => 'ids',
			] );

			$content = $this->build_content( $program, $prog_forms, $prog_sess );
			$excerpt = sanitize_text_field( $program['public_description'] ?? $program['description'] ?? '' );

			$post_data = [
				'post_type'    => 'eduzen_program',
				'post_title'   => sanitize_text_field( $program['name'] ?? 'Programme' ),
				'post_content' => $content,
				'post_excerpt' => $excerpt,
				'post_status'  => 'publish',
			];

			if ( ! empty( $existing ) ) {
				$post_data['ID'] = $existing[0];
				$post_id = wp_update_post( $post_data, true );
				if ( ! is_wp_error( $post_id ) ) $updated++;
			} else {
				$post_id = wp_insert_post( $post_data, true );
				if ( ! is_wp_error( $post_id ) ) $created++;
			}

			if ( is_wp_error( $post_id ) ) continue;

			$synced_ids[] = $prog_id;

			// --- post meta ---
			$meta = [
				'_eduzen_program_id'        => $prog_id,
				'_eduzen_price'             => $program['price'] ?? $program['price_individual'] ?? '',
				'_eduzen_price_enterprise'  => $program['price_enterprise'] ?? '',
				'_eduzen_price_freelance'   => $program['price_freelance'] ?? '',
				'_eduzen_success_rate'      => $program['success_rate'] ?? '',
				'_eduzen_satisfaction_rate' => $program['satisfaction_rate'] ?? '',
				'_eduzen_completion_rate'   => $program['completion_rate'] ?? '',
				'_eduzen_total_learners'    => $program['total_learners'] ?? '',
				'_eduzen_image_url'         => $program['public_image_url'] ?? '',
				'_eduzen_category'          => $program['category'] ?? '',
				'_eduzen_sessions'          => wp_json_encode( $prog_sess ),
				'_eduzen_formations'        => wp_json_encode( $prog_forms ),
			];

			foreach ( $meta as $key => $value ) {
				update_post_meta( $post_id, $key, $value );
			}

			// --- taxonomy ---
			if ( ! empty( $program['category'] ) ) {
				wp_set_object_terms( $post_id, sanitize_text_field( $program['category'] ), 'eduzen_category', false );
			}
		}

		// --- unpublish orphans ---
		if ( ! empty( $synced_ids ) ) {
			$orphans = get_posts( [
				'post_type'      => 'eduzen_program',
				'posts_per_page' => -1,
				'post_status'    => 'publish',
				'meta_query'     => [ [
					'key'     => '_eduzen_program_id',
					'value'   => $synced_ids,
					'compare' => 'NOT IN',
				] ],
				'fields' => 'ids',
			] );
			foreach ( $orphans as $orphan_id ) {
				wp_update_post( [ 'ID' => $orphan_id, 'post_status' => 'draft' ] );
			}
		}

		update_option( 'eduzen_last_sync',  current_time( 'mysql' ) );
		update_option( 'eduzen_sync_count', count( $programs ) );

		flush_rewrite_rules();

		return [
			'success' => true,
			'created' => $created,
			'updated' => $updated,
			'total'   => count( $programs ),
		];
	}

	/** Fetch all pages from an endpoint (handles pagination). */
	private function fetch_all( $endpoint, $base_args = [] ) {
		$items = [];
		$page  = 1;

		do {
			$args   = array_merge( $base_args, [ 'limit' => 100, 'page' => $page ] );
			$method = 'get_' . $endpoint;
			$result = method_exists( $this->api, $method )
				? $this->api->$method( $args )
				: new WP_Error( 'not_found', "Méthode $method introuvable" );

			if ( is_wp_error( $result ) ) {
				if ( $page === 1 ) return $result; // fatal on first page
				break;
			}

			$batch = $result['data'] ?? [];
			if ( empty( $batch ) ) break;

			$items = array_merge( $items, $batch );
			$total = $result['meta']['total'] ?? 0;
			$page++;
		} while ( count( $items ) < $total );

		return $items;
	}

	/** Build SEO-indexable HTML content for the post_content field. */
	private function build_content( $program, $formations, $sessions ) {
		$html = '';

		$desc = $program['public_description'] ?? $program['description'] ?? '';
		if ( $desc ) {
			$html .= '<div class="eduzen-description">' . wp_kses_post( $desc ) . '</div>';
		}

		if ( ! empty( $formations ) ) {
			$html .= '<h2>Contenu de la formation</h2><ul>';
			foreach ( $formations as $f ) {
				$html .= '<li><strong>' . esc_html( $f['name'] ?? '' ) . '</strong>';
				if ( ! empty( $f['description'] ) ) {
					$html .= ' — ' . esc_html( $f['description'] );
				}
				$html .= '</li>';
			}
			$html .= '</ul>';
		}

		$upcoming = array_filter( $sessions, fn( $s ) =>
			in_array( $s['status'] ?? '', [ 'scheduled', 'ongoing' ], true ) &&
			! empty( $s['start_date'] ) &&
			strtotime( $s['start_date'] ) >= time()
		);

		if ( ! empty( $upcoming ) ) {
			$html .= '<h2>Prochaines sessions</h2><ul>';
			foreach ( array_slice( $upcoming, 0, 10 ) as $s ) {
				$date = date_i18n( 'd F Y', strtotime( $s['start_date'] ) );
				$html .= '<li>' . esc_html( $date );
				if ( ! empty( $s['end_date'] ) ) {
					$html .= ' – ' . esc_html( date_i18n( 'd F Y', strtotime( $s['end_date'] ) ) );
				}
				if ( ! empty( $s['location'] ) ) {
					$html .= ' · ' . esc_html( $s['location'] );
				}
				$html .= '</li>';
			}
			$html .= '</ul>';
		}

		return $html;
	}

	public function handle_manual_sync() {
		if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Accès refusé.' );
		check_admin_referer( 'eduzen_manual_sync' );

		$result = $this->sync();

		wp_redirect( add_query_arg( [
			'page'        => 'eduzen-settings',
			'eduzen_sync' => $result['success'] ? 'ok' : 'error',
			'created'     => $result['created'] ?? 0,
			'updated'     => $result['updated'] ?? 0,
			'total'       => $result['total'] ?? 0,
			'msg'         => $result['message'] ?? '',
		], admin_url( 'options-general.php' ) ) );
		exit;
	}
}
