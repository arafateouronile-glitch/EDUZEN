<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Eduzen_CPT {

	public function init() {
		add_action( 'init', [ $this, 'register_post_type' ] );
		add_action( 'init', [ $this, 'register_taxonomy' ] );
		add_filter( 'template_include', [ $this, 'template_loader' ] );
		add_action( 'wp_head', [ $this, 'inject_schema' ] );
	}

	public function register_post_type() {
		$slug = get_option( 'eduzen_catalogue_slug', 'formations' );

		register_post_type( 'eduzen_program', [
			'labels' => [
				'name'          => 'Formations EDUZEN',
				'singular_name' => 'Formation',
				'all_items'     => 'Toutes les formations',
				'view_item'     => 'Voir la formation',
			],
			'public'             => true,
			'publicly_queryable' => true,
			'show_ui'            => true,
			'show_in_menu'       => false,
			'rewrite'            => [ 'slug' => $slug, 'with_front' => false ],
			'has_archive'        => $slug,
			'supports'           => [ 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ],
			'show_in_rest'       => false,
		] );
	}

	public function register_taxonomy() {
		$slug = get_option( 'eduzen_catalogue_slug', 'formations' );

		register_taxonomy( 'eduzen_category', 'eduzen_program', [
			'labels' => [
				'name'          => 'Catégories de formation',
				'singular_name' => 'Catégorie',
				'all_items'     => 'Toutes les catégories',
			],
			'hierarchical' => true,
			'public'       => true,
			'rewrite'      => [ 'slug' => $slug . '/categorie', 'with_front' => false ],
		] );
	}

	public function template_loader( $template ) {
		if ( is_singular( 'eduzen_program' ) ) {
			$t = EDUZEN_PLUGIN_DIR . 'public/templates/single-eduzen_program.php';
			if ( file_exists( $t ) ) return $t;
		}
		if ( is_post_type_archive( 'eduzen_program' ) || is_tax( 'eduzen_category' ) ) {
			$t = EDUZEN_PLUGIN_DIR . 'public/templates/archive-eduzen_program.php';
			if ( file_exists( $t ) ) return $t;
		}
		return $template;
	}

	// Schema.org Course JSON-LD pour les fiches programme
	public function inject_schema() {
		if ( ! is_singular( 'eduzen_program' ) ) return;
		$post     = get_post();
		$price    = get_post_meta( $post->ID, '_eduzen_price', true );
		$img      = get_post_meta( $post->ID, '_eduzen_image_url', true );
		$sessions = json_decode( get_post_meta( $post->ID, '_eduzen_sessions', true ) ?: '[]', true );

		$schema = [
			'@context'    => 'https://schema.org',
			'@type'       => 'Course',
			'name'        => get_the_title( $post ),
			'description' => get_the_excerpt( $post ) ?: wp_strip_all_tags( $post->post_content ),
			'url'         => get_permalink( $post ),
			'provider'    => [
				'@type' => 'Organization',
				'name'  => get_bloginfo( 'name' ),
				'url'   => home_url(),
			],
		];

		if ( $img )   $schema['image'] = esc_url( $img );
		if ( $price ) $schema['offers'] = [
			'@type'         => 'Offer',
			'price'         => floatval( $price ),
			'priceCurrency' => 'EUR',
			'availability'  => 'https://schema.org/InStock',
		];

		if ( ! empty( $sessions ) ) {
			$schema['hasCourseInstance'] = array_map( fn( $s ) => [
				'@type'         => 'CourseInstance',
				'courseMode'    => 'onsite',
				'startDate'     => $s['start_date'] ?? '',
				'endDate'       => $s['end_date'] ?? '',
				'location'      => [ '@type' => 'Place', 'name' => $s['location'] ?? '' ],
			], array_slice( $sessions, 0, 5 ) );
		}

		echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>' . "\n";
	}
}
