/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: treecontroller */

'use strict';

import ModelDocument from '/ckeditor5/engine/treemodel/document.js';
import ModelElement from '/ckeditor5/engine/treemodel/element.js';
import ModelRange from '/ckeditor5/engine/treemodel/range.js';
import ModelPosition from '/ckeditor5/engine/treemodel/position.js';

import ViewContainerElement from '/ckeditor5/engine/treeview/containerelement.js';
import ViewAttributeElement from '/ckeditor5/engine/treeview/attributeelement.js';
import ViewWriter from  '/ckeditor5/engine/treeview/writer.js';
import ViewSelection from  '/ckeditor5/engine/treeview/selection.js';

import Mapper from '/ckeditor5/engine/treecontroller/mapper.js';
import ModelConversionDispatcher from '/ckeditor5/engine/treecontroller/modelconversiondispatcher.js';
import {
	convertRangeSelection,
	convertCollapsedSelection,
	convertSelectionAttribute
} from '/ckeditor5/engine/treecontroller/model-selection-to-view-converters.js';

import {
	insertElement,
	insertText,
	wrap
} from '/ckeditor5/engine/treecontroller/model-to-view-converters.js';

let dispatcher, modelDoc, modelRoot, mapper, viewRoot, writer, viewSelection;

beforeEach( () => {
	modelDoc = new ModelDocument();
	modelRoot = modelDoc.createRoot( 'main' );
	viewRoot = new ViewContainerElement( 'viewRoot' );

	mapper = new Mapper();
	mapper.bindElements( modelRoot, viewRoot );

	writer = new ViewWriter();
	viewSelection = new ViewSelection();

	dispatcher = new ModelConversionDispatcher( { mapper, writer, viewSelection } );

	dispatcher.on( 'insert:$text', insertText() );
	dispatcher.on( 'addAttribute:bold', wrap( new ViewAttributeElement( 'strong' ) ) );

	// Default selection converters.
	dispatcher.on( 'selection', convertRangeSelection() );
	dispatcher.on( 'selection', convertCollapsedSelection() );
} );

describe( 'default converters', () => {
	beforeEach( () => {
		// Selection converters for selection attributes.
		dispatcher.on( 'selectionAttribute:bold', convertSelectionAttribute( new ViewAttributeElement( 'strong' ) ) );
		dispatcher.on( 'selectionAttribute:italic', convertSelectionAttribute( new ViewAttributeElement( 'em' ) ) );
	} );

	describe( 'range selection', () => {
		it( 'in same container', () => {
			test(
				[ 1, 4 ],
				'foobar',
				'f{oob}ar'
			);
		} );

		it( 'in same container, over attribute', () => {
			test(
				[ 1, 5 ],
				'fo<$text bold=true>ob</$text>ar',
				'f{o<strong>ob</strong>a}r'
			);
		} );

		it( 'in same container, next to attribute', () => {
			test(
				[ 1, 2 ],
				'fo<$text bold=true>ob</$text>ar',
				'f{o}<strong>ob</strong>ar'
			);
		} );

		it( 'in same attribute', () => {
			test(
				[ 2, 4 ],
				'f<$text bold=true>ooba</$text>r',
				'f<strong>o{ob}a</strong>r'
			);
		} );

		it( 'in same attribute, selection same as attribute', () => {
			test(
				[ 2, 4 ],
				'fo<$text bold=true>ob</$text>ar',
				'fo{<strong>ob</strong>}ar'
			);
		} );

		it( 'starts in text node, ends in attribute #1', () => {
			test(
				[ 1, 3 ],
				'fo<$text bold=true>ob</$text>ar',
				'f{o<strong>o}b</strong>ar'
			);
		} );

		it( 'starts in text node, ends in attribute #2', () => {
			test(
				[ 1, 4 ],
				'fo<$text bold=true>ob</$text>ar',
				'f{o<strong>ob</strong>}ar'
			);
		} );

		it( 'starts in attribute, ends in text node', () => {
			test(
				[ 3, 5 ],
				'fo<$text bold=true>ob</$text>ar',
				'fo<strong>o{b</strong>a}r'
			);
		} );

		it( 'consumes consumable values properly', () => {
			// Add callback that will fire before default ones.
			// This should prevent default callback doing anything.
			dispatcher.on( 'selection', ( evt, data, consumable ) => {
				expect( consumable.consume( data.selection, 'selection' ) ).to.be.true;
			}, null, 0 );

			// Similar test case as the first in this suite.
			test(
				[ 1, 4 ],
				'foobar',
				'foobar' // No selection in view.
			);
		} );
	} );

	describe( 'collapsed selection', () => {
		it( 'in container', () => {
			test(
				[ 1, 1 ],
				'foobar',
				'f{}oobar'
			);
		} );

		it( 'in attribute', () => {
			test(
				[ 3, 3 ],
				'f<$text bold=true>ooba</$text>r',
				'f<strong>oo{}ba</strong>r'
			);
		} );

		it( 'in container with extra attributes', () => {
			test(
				[ 1, 1 ],
				'foobar',
				'f<em>[]</em>oobar',
				{ italic: true }
			);
		} );

		it( 'in attribute with extra attributes', () => {
			test(
				[ 3, 3 ],
				'f<$text bold=true>ooba</$text>r',
				'f<strong>oo</strong><em><strong>[]</strong></em><strong>ba</strong>r',
				{ italic: true }
			);
		} );

		it( 'consumes consumable values properly', () => {
			// Add callbacks that will fire before default ones.
			// This should prevent default callbacks doing anything.
			dispatcher.on( 'selection', ( evt, data, consumable ) => {
				expect( consumable.consume( data.selection, 'selection' ) ).to.be.true;
			}, null, 0 );

			dispatcher.on( 'selectionAttribute:bold', ( evt, data, consumable ) => {
				expect( consumable.consume( data.selection, 'selectionAttribute:bold' ) ).to.be.true;
			}, null, 0 );

			// Similar test case as above
			test(
				[ 3, 3 ],
				'f<$text bold=true>ooba</$text>r',
				'f<strong>ooba</strong>r' // No selection in view.
			);
		} );
	} );
} );

describe( 'using element creator for attributes conversion', () => {
	beforeEach( () => {
		function styleElementCreator( styleValue ) {
			if ( styleValue == 'important' ) {
				return new ViewAttributeElement( 'strong', { style: 'text-transform:uppercase;' } );
			} else if ( styleValue == 'gold' ) {
				return new ViewAttributeElement( 'span', { style: 'color:yellow;' } );
			}
		}

		dispatcher.on( 'selectionAttribute:style', convertSelectionAttribute( styleElementCreator ) );
		dispatcher.on( 'addAttribute:style', wrap( styleElementCreator ) );

		dispatcher.on( 'selectionAttribute:italic', convertSelectionAttribute( new ViewAttributeElement( 'em' ) ) );
	} );

	describe( 'range selection', () => {
		it( 'in same container, over attribute', () => {
			test(
				[ 1, 5 ],
				'fo<$text style="gold">ob</$text>ar',
				'f{o<span style="color:yellow;">ob</span>a}r'
			);
		} );

		it( 'in same attribute', () => {
			test(
				[ 2, 4 ],
				'f<$text style="gold">ooba</$text>r',
				'f<span style="color:yellow;">o{ob}a</span>r'
			);
		} );

		it( 'in same attribute, selection same as attribute', () => {
			test(
				[ 2, 4 ],
				'fo<$text style="important">ob</$text>ar',
				'fo{<strong style="text-transform:uppercase;">ob</strong>}ar'
			);
		} );

		it( 'starts in attribute, ends in text node', () => {
			test(
				[ 3, 5 ],
				'fo<$text style="important">ob</$text>ar',
				'fo<strong style="text-transform:uppercase;">o{b</strong>a}r'
			);
		} );
	} );

	describe( 'collapsed selection', () => {
		it( 'in attribute', () => {
			test(
				[ 3, 3 ],
				'f<$text style="gold">ooba</$text>r',
				'f<span style="color:yellow;">oo{}ba</span>r'
			);
		} );

		it( 'in container with style attribute', () => {
			test(
				[ 1, 1 ],
				'foobar',
				'f<strong style="text-transform:uppercase;">[]</strong>oobar',
				{ style: 'important' }
			);
		} );

		it( 'in style attribute with extra attributes #1', () => {
			test(
				[ 3, 3 ],
				'f<$text style="gold">ooba</$text>r',
				'f<span style="color:yellow;">oo</span>' +
				'<em><span style="color:yellow;">[]</span></em>' +
				'<span style="color:yellow;">ba</span>r',
				{ italic: true }
			);
		} );

		it( 'in style attribute with extra attributes #2', () => {
			// In contrary to test above, we don't have strong + span on the selection.
			// This is because strong and span are both created by the same attribute.
			// Since style="important" overwrites style="gold" on selection, we have only strong element.
			// In example above, selection has both style and italic attribute.
			test(
				[ 3, 3 ],
				'f<$text style="gold">ooba</$text>r',
				'f<span style="color:yellow;">oo</span>' +
				'<strong style="text-transform:uppercase;">[]</strong>' +
				'<span style="color:yellow;">ba</span>r',
				{ style: 'important' }
			);
		} );
	} );
} );

describe( 'table cell selection converter', () => {
	beforeEach( () => {
		// "Universal" converter to convert table structure.
		const tableConverter = insertElement( ( data ) => new ViewContainerElement( data.item.name ) );
		dispatcher.on( 'insert:table', tableConverter );
		dispatcher.on( 'insert:tr', tableConverter );
		dispatcher.on( 'insert:td', tableConverter );

		// Special converter for table cells.
		dispatcher.on( 'selection', ( evt, data, consumable, conversionApi ) => {
			const selection = data.selection;

			if ( !consumable.test( selection, 'selection' ) || selection.isCollapsed ) {
				return;
			}

			for ( let range of selection.getRanges() ) {
				const node = range.start.nodeAfter;

				if ( node == range.end.nodeBefore && node instanceof ModelElement && node.name == 'td' ) {
					consumable.consume( selection, 'selection' );

					let viewNode = conversionApi.mapper.toViewElement( node );
					viewNode.addClass( 'selected' );
				}
			}
		}, null, 0 );
	} );

	it( 'should not be used to convert selection that is not on table cell', () => {
		test(
			[ 1, 5 ],
			'f<selection>o<$text bold=true>ob</$text>a</selection>r',
			'f{o<strong>ob</strong>a}r'
		);
	} );

	it( 'should add a class to the selected table cell', () => {
		test(
			// table tr#0, table tr#1
			[ [ 0, 0, 0 ], [ 0, 0, 1 ] ],
			'<table><tr><td>foo</td></tr><tr><td>bar</td></tr></table>',
			'<table><tr><td class="selected">foo</td></tr><tr><td>bar</td></tr></table>'
		);
	} );

	it( 'should not be used if selection contains more than just a table cell', () => {
		test(
			// table tr td#1, table tr#2
			[ [ 0, 0, 0, 1 ], [ 0, 0, 2 ] ],
			'<table><tr><td>foo</td><td>bar</td></tr></table>',
			'<table><tr><td>f{oo</td><td>bar</td>]</tr></table>'
		);
	} );
} );

// Tests if the selection got correctly converted.
// Because `setData` might use selection converters itself to set the selection, we can't use it
// to set the selection (because then we would test converters using converters).
// Instead, the `test` function expects to be passed `selectionPaths` which is an array containing two numbers or two arrays,
// that are offsets or paths of selection positions in root element.
function test( selectionPaths, modelInput, expectedView, selectionAttributes = {} ) {
	// Parse passed `modelInput` string and set it as current model.
	bender.model.setData( modelDoc, modelInput );

	// Manually set selection ranges using passed `selectionPaths`.
	let startPath = typeof selectionPaths[ 0 ] == 'number' ? [ selectionPaths[ 0 ] ] : selectionPaths[ 0 ];
	let endPath = typeof selectionPaths[ 1 ] == 'number' ? [ selectionPaths[ 1 ] ] : selectionPaths[ 1 ];
	let startPos = new ModelPosition( modelRoot, startPath );
	let endPos = new ModelPosition( modelRoot, endPath );
	modelDoc.selection.setRanges( [ new ModelRange( startPos, endPos ) ] );

	// Updated selection attributes according to model.
	modelDoc.selection._updateAttributes();

	// And add or remove passed attributes.
	for ( let key in selectionAttributes ) {
		let value = selectionAttributes[ key ];

		if ( value ) {
			modelDoc.selection.setAttribute( key, value );
		} else {
			modelDoc.selection.removeAttribute( key );
		}
	}

	// Convert model to view.
	dispatcher.convertInsert( ModelRange.createFromElement( modelRoot ) );
	dispatcher.convertSelection( modelDoc.selection );

	// Stringify view and check if it is same as expected.
	expect( bender.view.stringify( viewRoot, viewSelection, { showType: false } ) ).to.equal( '<viewRoot>' + expectedView + '</viewRoot>' );
}
