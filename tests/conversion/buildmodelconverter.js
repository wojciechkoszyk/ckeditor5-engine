/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import buildModelConverter from '../../src/conversion/buildmodelconverter';

import Model from '../../src/model/model';
import ModelElement from '../../src/model/element';
import ModelText from '../../src/model/text';
import ModelRange from '../../src/model/range';
import ModelPosition from '../../src/model/position';

import ViewElement from '../../src/view/element';
import ViewContainerElement from '../../src/view/containerelement';
import ViewAttributeElement from '../../src/view/attributeelement';
import ViewUIElement from '../../src/view/uielement';
import ViewText from '../../src/view/text';

import EditingController from '../../src/controller/editingcontroller';

import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';

function viewAttributesToString( item ) {
	let result = '';

	for ( const key of item.getAttributeKeys() ) {
		const value = item.getAttribute( key );

		if ( value ) {
			result += ' ' + key + '="' + value + '"';
		}
	}

	return result;
}

function viewToString( item ) {
	let result = '';

	if ( item instanceof ViewText ) {
		result = item.data;
	} else {
		// ViewElement or ViewDocumentFragment.
		for ( const child of item.getChildren() ) {
			result += viewToString( child );
		}

		if ( item instanceof ViewElement ) {
			result = '<' + item.name + viewAttributesToString( item ) + '>' + result + '</' + item.name + '>';
		}
	}

	return result;
}

describe( 'Model converter builder', () => {
	let dispatcher, modelDoc, modelRoot, viewRoot, viewSelection, model, controller;

	beforeEach( () => {
		model = new Model();
		modelDoc = model.document;
		modelRoot = modelDoc.createRoot();

		controller = new EditingController( model );

		// Set name of view root the same as dom root.
		// This is a mock of attaching view root to dom root.
		controller.view.document.getRoot()._name = 'div';

		dispatcher = controller.modelToView;

		viewRoot = controller.view.document.getRoot();
		viewSelection = controller.view.document.selection;

		buildModelConverter().for( dispatcher ).fromElement( 'paragraph' ).toElement( 'p' );
	} );

	describe( 'model element to view element conversion', () => {
		it( 'using passed view element name', () => {
			const modelElement = new ModelElement( 'paragraph', null, new ModelText( 'foobar' ) );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );

		it( 'using passed view element', () => {
			buildModelConverter().for( dispatcher ).fromElement( 'image' ).toElement( new ViewContainerElement( 'img' ) );

			const modelElement = new ModelElement( 'image' );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><img></img></div>' );
		} );

		it( 'using passed creator function', () => {
			buildModelConverter().for( dispatcher )
				.fromElement( 'header' )
				.toElement( data => new ViewContainerElement( 'h' + data.item.getAttribute( 'level' ) ) );

			const modelElement = new ModelElement( 'header', { level: 2 }, new ModelText( 'foobar' ) );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><h2>foobar</h2></div>' );
		} );
	} );

	describe( 'model attribute to view element conversion', () => {
		it( 'using passed view element name', () => {
			buildModelConverter().for( dispatcher ).fromAttribute( 'bold' ).toElement( 'strong' );

			const modelElement = new ModelText( 'foo', { bold: true } );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><strong>foo</strong></div>' );

			model.change( writer => {
				writer.removeAttribute( 'bold', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div>foo</div>' );
		} );

		it( 'using passed view element', () => {
			buildModelConverter().for( dispatcher ).fromAttribute( 'bold' ).toElement( new ViewAttributeElement( 'strong' ) );

			const modelElement = new ModelText( 'foo', { bold: true } );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><strong>foo</strong></div>' );

			model.change( writer => {
				writer.removeAttribute( 'bold', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div>foo</div>' );
		} );

		it( 'using passed creator function', () => {
			buildModelConverter().for( dispatcher ).fromAttribute( 'italic' ).toElement( value => new ViewAttributeElement( value ) );

			const modelElement = new ModelText( 'foo', { italic: 'em' } );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><em>foo</em></div>' );

			model.change( writer => {
				writer.setAttribute( 'italic', 'i', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><i>foo</i></div>' );

			model.change( writer => {
				writer.removeAttribute( 'italic', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div>foo</div>' );
		} );

		it( 'selection conversion', () => {
			// Model converter builder should add selection converter.
			buildModelConverter().for( dispatcher ).fromAttribute( 'italic' ).toElement( value => new ViewAttributeElement( value ) );

			model.change( writer => {
				writer.insert( new ModelText( 'foo', { italic: 'em' } ), ModelPosition.createAt( modelRoot, 0 ) );

				// Set collapsed selection after "f".
				const position = new ModelPosition( modelRoot, [ 1 ] );
				writer.setSelection( new ModelRange( position, position ) );
			} );

			// Check if view structure is ok.
			expect( viewToString( viewRoot ) ).to.equal( '<div><em>foo</em></div>' );

			// Check if view selection is collapsed after "f" letter.
			let ranges = Array.from( viewSelection.getRanges() );
			expect( ranges.length ).to.equal( 1 );
			expect( ranges[ 0 ].start.isEqual( ranges[ 0 ].end ) ).to.be.true;
			expect( ranges[ 0 ].start.parent ).to.be.instanceof( ViewText ); // "foo".
			expect( ranges[ 0 ].start.offset ).to.equal( 1 );

			// Change selection attribute, convert it.
			model.change( writer => {
				writer.setSelectionAttribute( 'italic', 'i' );
			} );

			// Check if view structure has changed.
			expect( viewToString( viewRoot ) ).to.equal( '<div><em>f</em><i></i><em>oo</em></div>' );

			// Check if view selection is inside new <em> element.
			ranges = Array.from( viewSelection.getRanges() );
			expect( ranges.length ).to.equal( 1 );
			expect( ranges[ 0 ].start.isEqual( ranges[ 0 ].end ) ).to.be.true;
			expect( ranges[ 0 ].start.parent.name ).to.equal( 'i' );
			expect( ranges[ 0 ].start.offset ).to.equal( 0 );

			// Some more tests checking how selection attributes changes are converted:
			model.change( writer => {
				writer.removeSelectionAttribute( 'italic' );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><em>f</em><em>oo</em></div>' );
			ranges = Array.from( viewSelection.getRanges() );
			expect( ranges[ 0 ].start.parent.name ).to.equal( 'div' );
			expect( ranges[ 0 ].start.offset ).to.equal( 1 );

			model.change( writer => {
				writer.setSelectionAttribute( 'italic', 'em' );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><em>foo</em></div>' );
			ranges = Array.from( viewSelection.getRanges() );
			expect( ranges.length ).to.equal( 1 );
			expect( ranges[ 0 ].start.isEqual( ranges[ 0 ].end ) ).to.be.true;
			expect( ranges[ 0 ].start.parent ).to.be.instanceof( ViewText ); // "foo".
			expect( ranges[ 0 ].start.offset ).to.equal( 1 );
		} );
	} );

	describe( 'model attribute to view attribute conversion', () => {
		it( 'using default 1-to-1 conversion', () => {
			buildModelConverter().for( dispatcher ).fromAttribute( 'class' ).toAttribute();

			const modelElement = new ModelElement( 'paragraph', { class: 'myClass' }, new ModelText( 'foobar' ) );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p class="myClass">foobar</p></div>' );

			model.change( writer => {
				writer.setAttribute( 'class', 'newClass', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p class="newClass">foobar</p></div>' );

			model.change( writer => {
				writer.removeAttribute( 'class', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );

		it( 'using passed attribute key', () => {
			buildModelConverter().for( dispatcher ).fromAttribute( 'theme' ).toAttribute( 'class' );

			const modelElement = new ModelElement( 'paragraph', { theme: 'abc' }, new ModelText( 'foobar' ) );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p class="abc">foobar</p></div>' );

			model.change( writer => {
				writer.setAttribute( 'theme', 'xyz', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p class="xyz">foobar</p></div>' );

			model.change( writer => {
				writer.removeAttribute( 'theme', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );

		it( 'using passed attribute key and value', () => {
			buildModelConverter().for( dispatcher ).fromAttribute( 'highlighted' ).toAttribute( 'style', 'background:yellow' );

			const modelElement = new ModelElement( 'paragraph', { 'highlighted': true }, new ModelText( 'foobar' ) );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p style="background:yellow;">foobar</p></div>' );

			model.change( writer => {
				writer.removeAttribute( 'highlighted', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );

		it( 'using passed attribute creator function', () => {
			buildModelConverter().for( dispatcher )
				.fromAttribute( 'theme' )
				.toAttribute( value => ( { key: 'class', value: value + '-theme' } ) );

			const modelElement = new ModelElement( 'paragraph', { theme: 'nice' }, new ModelText( 'foobar' ) );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p class="nice-theme">foobar</p></div>' );

			model.change( writer => {
				writer.setAttribute( 'theme', 'good', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p class="good-theme">foobar</p></div>' );

			model.change( writer => {
				writer.removeAttribute( 'theme', modelElement );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );
	} );

	describe( 'model marker to highlight converter', () => {
		let modelText, modelElement;

		beforeEach( () => {
			modelText = new ModelText( 'foobar' );
			modelElement = new ModelElement( 'paragraph', null, [ modelText ] );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );
		} );

		it( 'using passed highlight descriptor object', () => {
			buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toHighlight( {
				class: 'highlight',
				priority: 3,
				attributes: { title: 'highlight title' }
			} );

			model.change( writer => {
				writer.setMarker( 'search', ModelRange.createFromParentsAndOffsets( modelElement, 2, modelElement, 4 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal(
				'<div>' +
					'<p>' +
						'fo' +
						'<span class="highlight" title="highlight title">ob</span>' +
						'ar' +
					'</p>' +
				'</div>' );

			expect( viewRoot.getChild( 0 ).getChild( 1 ).priority ).to.equal( 3 );

			model.change( writer => {
				writer.removeMarker( 'search' );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );

		it( 'using passed highlight descriptor object creator', () => {
			buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toHighlight( () => ( {
				class: 'highlight',
				priority: 12,
				attributes: { title: 'highlight title' }
			} ) );

			model.change( writer => {
				writer.setMarker( 'search', ModelRange.createFromParentsAndOffsets( modelElement, 2, modelElement, 4 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal(
				'<div>' +
					'<p>' +
						'fo' +
						'<span class="highlight" title="highlight title">ob</span>' +
						'ar' +
					'</p>' +
				'</div>' );

			expect( viewRoot.getChild( 0 ).getChild( 1 ).priority ).to.equal( 12 );

			model.change( writer => {
				writer.removeMarker( 'search' );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );

		it( 'should do nothing when marker range is collapsed', () => {
			buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toHighlight( {
				class: 'highlight'
			} );

			model.change( writer => {
				writer.setMarker( 'search', ModelRange.createFromParentsAndOffsets( modelElement, 2, modelElement, 2 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );

			model.change( writer => {
				writer.removeMarker( 'search' );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
		} );

		it( 'should create converters with provided priority', () => {
			buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toHighlight( { class: 'highlight' } );
			buildModelConverter().for( dispatcher ).fromMarker( 'search' ).withPriority( 'high' ).toHighlight( { class: 'override' } );

			model.change( writer => {
				writer.setMarker( 'search', ModelRange.createFromParentsAndOffsets( modelElement, 2, modelElement, 4 ) );
			} );

			expect( viewToString( viewRoot ) ).to.equal(
				'<div>' +
					'<p>' +
						'fo' +
						'<span class="override">ob</span>' +
						'ar' +
					'</p>' +
				'</div>' );
		} );

		it( 'should throw if trying to convert from attribute', () => {
			expect( () => {
				buildModelConverter().for( dispatcher ).fromAttribute( 'bold' ).toHighlight( { class: 'foo' } );
			} ).to.throw( CKEditorError, /^build-model-converter-non-marker-to-highlight/ );
		} );

		it( 'should throw if trying to convert from element', () => {
			expect( () => {
				buildModelConverter().for( dispatcher ).fromElement( 'paragraph' ).toHighlight( { class: 'foo' } );
			} ).to.throw( CKEditorError, /^build-model-converter-non-marker-to-highlight/ );
		} );
	} );

	describe( 'model marker to view element conversion', () => {
		let modelText, modelElement, range;

		beforeEach( () => {
			modelText = new ModelText( 'foobar' );
			modelElement = new ModelElement( 'paragraph', null, [ modelText ] );

			model.change( writer => {
				writer.insert( modelElement, ModelPosition.createAt( modelRoot, 0 ) );
			} );
		} );

		describe( 'collapsed range', () => {
			beforeEach( () => {
				range = ModelRange.createFromParentsAndOffsets( modelElement, 2, modelElement, 2 );
			} );

			it( 'using passed view element name', () => {
				buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toElement( 'span' );

				model.change( writer => {
					writer.setMarker( 'search', range );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>fo<span></span>obar</p></div>' );

				model.change( writer => {
					writer.removeMarker( 'search' );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
			} );

			it( 'using passed view element', () => {
				const viewElement = new ViewUIElement( 'span', { class: 'search' } );
				buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toElement( viewElement );

				model.change( writer => {
					writer.setMarker( 'search', range );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>fo<span class="search"></span>obar</p></div>' );

				model.change( writer => {
					writer.removeMarker( 'search' );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
			} );

			it( 'using passed creator function', () => {
				buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toElement( data => {
					const className = 'search search-color-' + data.markerName.split( ':' )[ 1 ];

					return new ViewUIElement( 'span', { class: className } );
				} );

				model.change( writer => {
					writer.setMarker( 'search:red', range );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>fo<span class="search search-color-red"></span>obar</p></div>' );

				model.change( writer => {
					writer.removeMarker( 'search:red' );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
			} );
		} );

		describe( 'non-collapsed range', () => {
			beforeEach( () => {
				range = ModelRange.createFromParentsAndOffsets( modelElement, 2, modelElement, 4 );
			} );

			it( 'using passed view element name', () => {
				buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toElement( 'span' );

				model.change( writer => {
					writer.setMarker( 'search', range );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>fo<span></span>ob<span></span>ar</p></div>' );

				model.change( writer => {
					writer.removeMarker( 'search' );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
			} );

			it( 'using passed view element', () => {
				const viewElement = new ViewUIElement( 'span', { class: 'search' } );
				buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toElement( viewElement );

				model.change( writer => {
					writer.setMarker( 'search', range );
				} );

				expect( viewToString( viewRoot ) ).to.equal(
					'<div><p>fo<span class="search"></span>ob<span class="search"></span>ar</p></div>'
				);

				model.change( writer => {
					writer.removeMarker( 'search' );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
			} );

			it( 'using passed creator function', () => {
				buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toElement( data => {
					const className = 'search search-color-' + data.markerName.split( ':' )[ 1 ];

					return new ViewUIElement( 'span', { class: className } );
				} );

				model.change( writer => {
					writer.setMarker( 'search:red', range );
				} );

				expect( viewToString( viewRoot ) ).to.equal(
					'<div><p>fo<span class="search search-color-red"></span>ob<span class="search search-color-red"></span>ar</p></div>'
				);

				model.change( writer => {
					writer.removeMarker( 'search:red' );
				} );

				expect( viewToString( viewRoot ) ).to.equal( '<div><p>foobar</p></div>' );
			} );
		} );

		it( 'should overwrite default priority', () => {
			range = ModelRange.createFromParentsAndOffsets( modelElement, 2, modelElement, 2 );

			buildModelConverter().for( dispatcher ).fromMarker( 'search' ).toElement( 'normal' );
			buildModelConverter().for( dispatcher ).fromMarker( 'search' ).withPriority( 'high' ).toElement( 'high' );

			model.change( writer => {
				writer.setMarker( 'search', range );
			} );

			expect( viewToString( viewRoot ) ).to.equal( '<div><p>fo<high></high>obar</p></div>' );
		} );

		it( 'should throw when trying to build model element to view attribute converter', () => {
			expect( () => {
				buildModelConverter().for( dispatcher ).fromElement( 'paragraph' ).toAttribute( 'paragraph', true );
			} ).to.throw( CKEditorError, /^build-model-converter-non-attribute-to-attribute/ );
		} );
	} );
} );
