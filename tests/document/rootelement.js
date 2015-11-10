/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint expr: true */

/* bender-tags: document */

'use strict';

var modules = bender.amd.require(
	'document/document',
	'document/element',
	'document/rootelement'
);

describe( 'Element', function() {
	var Document, Element, RootElement;

	before( function() {
		Document = modules[ 'document/document' ];
		Element = modules[ 'document/element' ];
		RootElement = modules[ 'document/rootelement' ];
	} );

	describe( 'constructor', function() {
		it( 'should create root element without attributes', function() {
			var doc = new Document();
			var root = new RootElement( doc );

			expect( root ).to.be.an.instanceof( Element );
			expect( root ).to.have.property( 'document' ).that.equals( doc );
			expect( root._getAttrCount() ).to.equal( 0 );
			expect( root.getChildCount() ).to.equal( 0 );
		} );
	} );
} );