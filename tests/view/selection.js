/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Selection from '../../src/view/selection';
import Range from '../../src/view/range';
import Document from '../../src/view/document';
import Element from '../../src/view/element';
import Text from '../../src/view/text';
import Position from '../../src/view/position';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';
import count from '@ckeditor/ckeditor5-utils/src/count';
import createViewRoot from './_utils/createroot';
import { parse } from '../../src/dev-utils/view';

describe( 'Selection', () => {
	let selection, el, range1, range2, range3;

	beforeEach( () => {
		const text = new Text( 'xxxxxxxxxxxxxxxxxxxx' );
		el = new Element( 'p', null, text );

		selection = new Selection();

		range1 = Range.createFromParentsAndOffsets( text, 5, text, 10 );
		range2 = Range.createFromParentsAndOffsets( text, 1, text, 2 );
		range3 = Range.createFromParentsAndOffsets( text, 12, text, 14 );
	} );

	describe( 'constructor()', () => {
		it( 'should be able to create an empty selection', () => {
			const selection = new Selection();

			expect( Array.from( selection.getRanges() ) ).to.deep.equal( [] );
		} );

		it( 'should be able to create a selection from the given ranges', () => {
			const ranges = [ range1, range2, range3 ];
			const selection = new Selection( ranges );

			expect( Array.from( selection.getRanges() ) ).to.deep.equal( ranges );
		} );

		it( 'should be able to create a selection from the given ranges and isLastBackward flag', () => {
			const ranges = [ range1, range2, range3 ];
			const selection = new Selection( ranges, true );

			expect( selection.isBackward ).to.be.true;
		} );

		it( 'should be able to create a selection from the given range and isLastBackward flag', () => {
			const selection = new Selection( range1, true );

			expect( Array.from( selection.getRanges() ) ).to.deep.equal( [ range1 ] );
			expect( selection.isBackward ).to.be.true;
		} );

		it( 'should be able to create a selection from the given iterable of ranges and isLastBackward flag', () => {
			const ranges = new Set( [ range1, range2, range3 ] );
			const selection = new Selection( ranges, false );

			expect( Array.from( selection.getRanges() ) ).to.deep.equal( [ range1, range2, range3 ] );
			expect( selection.isBackward ).to.be.false;
		} );

		it( 'should be able to create a collapsed selection at the given position', () => {
			const position = range1.start;
			const selection = new Selection( position );

			expect( Array.from( selection.getRanges() ).length ).to.equal( 1 );
			expect( selection.getFirstRange().start ).to.deep.equal( position );
			expect( selection.getFirstRange().end ).to.deep.equal( position );
			expect( selection.isBackward ).to.be.false;
		} );

		it( 'should be able to create a collapsed selection at the given position', () => {
			const position = range1.start;
			const selection = new Selection( position );

			expect( Array.from( selection.getRanges() ).length ).to.equal( 1 );
			expect( selection.getFirstRange().start ).to.deep.equal( position );
			expect( selection.getFirstRange().end ).to.deep.equal( position );
			expect( selection.isBackward ).to.be.false;
		} );

		it( 'should be able to create a selection from the other selection', () => {
			const otherSelection = new Selection( [ range2, range3 ], true );
			const selection = new Selection( otherSelection );

			expect( Array.from( selection.getRanges() ) ).to.deep.equal( [ range2, range3 ] );
			expect( selection.isBackward ).to.be.true;
		} );

		it( 'should be able to create a fake selection from the other fake selection', () => {
			const otherSelection = new Selection( [ range2, range3 ], true );
			otherSelection._setFake( true, { label: 'foo bar baz' } );
			const selection = new Selection( otherSelection );

			expect( selection.isFake ).to.be.true;
			expect( selection.fakeSelectionLabel ).to.equal( 'foo bar baz' );
		} );

		it( 'should throw an error when range is invalid', () => {
			expect( () => {
				// eslint-disable-next-line no-new
				new Selection( [ { invalid: 'range' } ] );
			} ).to.throw( CKEditorError, 'view-selection-invalid-range: Invalid Range.' );
		} );

		it( 'should throw an error when ranges intersects', () => {
			const text = el.getChild( 0 );
			const range2 = Range.createFromParentsAndOffsets( text, 7, text, 15 );

			expect( () => {
				// eslint-disable-next-line no-new
				new Selection( [ range1, range2 ] );
			} ).to.throw( CKEditorError, 'view-selection-range-intersects' );
		} );

		it( 'should throw an error when trying to set to not selectable', () => {
			expect( () => {
				// eslint-disable-next-line no-new
				new Selection( {} );
			} ).to.throw( /view-selection-setTo-not-selectable/ );
		} );
	} );

	describe( 'anchor', () => {
		it( 'should return null if no ranges in selection', () => {
			expect( selection.anchor ).to.be.null;
		} );

		it( 'should return start of single range in selection', () => {
			selection._setTo( range1 );
			const anchor = selection.anchor;

			expect( anchor.isEqual( range1.start ) ).to.be.true;
			expect( anchor ).to.not.equal( range1.start );
		} );

		it( 'should return end of single range in selection when added as backward', () => {
			selection._setTo( range1, true );
			const anchor = selection.anchor;

			expect( anchor.isEqual( range1.end ) ).to.be.true;
			expect( anchor ).to.not.equal( range1.end );
		} );

		it( 'should get anchor from last inserted range', () => {
			selection._setTo( [ range1, range2 ] );

			expect( selection.anchor.isEqual( range2.start ) ).to.be.true;
		} );
	} );

	describe( 'focus', () => {
		it( 'should return null if no ranges in selection', () => {
			expect( selection.focus ).to.be.null;
		} );

		it( 'should return end of single range in selection', () => {
			selection._setTo( range1 );
			const focus = selection.focus;

			expect( focus.isEqual( range1.end ) ).to.be.true;
		} );

		it( 'should return start of single range in selection when added as backward', () => {
			selection._setTo( range1, true );
			const focus = selection.focus;

			expect( focus.isEqual( range1.start ) ).to.be.true;
			expect( focus ).to.not.equal( range1.start );
		} );

		it( 'should get focus from last inserted range', () => {
			selection._setTo( [ range1, range2 ] );

			expect( selection.focus.isEqual( range2.end ) ).to.be.true;
		} );
	} );

	describe( '_setFocus()', () => {
		it( 'keeps all existing ranges when no modifications needed', () => {
			selection._setTo( range1 );
			selection._setFocus( selection.focus );

			expect( count( selection.getRanges() ) ).to.equal( 1 );
		} );

		it( 'throws if there are no ranges in selection', () => {
			const endPos = Position.createAt( el, 'end' );

			expect( () => {
				selection._setFocus( endPos );
			} ).to.throw( CKEditorError, /view-selection-setFocus-no-ranges/ );
		} );

		it( 'modifies existing collapsed selection', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 2 );

			selection._setTo( startPos );

			selection._setFocus( endPos );

			expect( selection.anchor.compareWith( startPos ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( endPos ) ).to.equal( 'same' );
		} );

		it( 'makes existing collapsed selection a backward selection', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 0 );

			selection._setTo( startPos );

			selection._setFocus( endPos );

			expect( selection.anchor.compareWith( startPos ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( endPos ) ).to.equal( 'same' );
			expect( selection.isBackward ).to.be.true;
		} );

		it( 'modifies existing non-collapsed selection', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 2 );
			const newEndPos = Position.createAt( el, 3 );

			selection._setTo( new Range( startPos, endPos ) );

			selection._setFocus( newEndPos );

			expect( selection.anchor.compareWith( startPos ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( newEndPos ) ).to.equal( 'same' );
		} );

		it( 'makes existing non-collapsed selection a backward selection', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 2 );
			const newEndPos = Position.createAt( el, 0 );

			selection._setTo( new Range( startPos, endPos ) );

			selection._setFocus( newEndPos );

			expect( selection.anchor.compareWith( startPos ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( newEndPos ) ).to.equal( 'same' );
			expect( selection.isBackward ).to.be.true;
		} );

		it( 'makes existing backward selection a forward selection', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 2 );
			const newEndPos = Position.createAt( el, 3 );

			selection._setTo( new Range( startPos, endPos ), true );

			selection._setFocus( newEndPos );

			expect( selection.anchor.compareWith( endPos ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( newEndPos ) ).to.equal( 'same' );
			expect( selection.isBackward ).to.be.false;
		} );

		it( 'modifies existing backward selection', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 2 );
			const newEndPos = Position.createAt( el, 0 );

			selection._setTo( new Range( startPos, endPos ), true );

			selection._setFocus( newEndPos );

			expect( selection.anchor.compareWith( endPos ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( newEndPos ) ).to.equal( 'same' );
			expect( selection.isBackward ).to.be.true;
		} );

		it( 'modifies only the last range', () => {
			// Offsets are chosen in this way that the order of adding ranges must count, not their document order.
			const startPos1 = Position.createAt( el, 4 );
			const endPos1 = Position.createAt( el, 5 );
			const startPos2 = Position.createAt( el, 1 );
			const endPos2 = Position.createAt( el, 2 );

			const newEndPos = Position.createAt( el, 0 );

			selection._setTo( [
				new Range( startPos1, endPos1 ),
				new Range( startPos2, endPos2 )
			] );

			selection._setFocus( newEndPos );

			const ranges = Array.from( selection.getRanges() );

			expect( ranges ).to.have.lengthOf( 2 );
			expect( ranges[ 0 ].start.compareWith( startPos1 ) ).to.equal( 'same' );
			expect( ranges[ 0 ].end.compareWith( endPos1 ) ).to.equal( 'same' );

			expect( selection.anchor.compareWith( startPos2 ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( newEndPos ) ).to.equal( 'same' );
			expect( selection.isBackward ).to.be.true;
		} );

		it( 'collapses the selection when extending to the anchor', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 2 );

			selection._setTo( new Range( startPos, endPos ) );

			selection._setFocus( startPos );

			expect( selection.focus.compareWith( startPos ) ).to.equal( 'same' );
			expect( selection.isCollapsed ).to.be.true;
		} );

		it( 'uses Position.createAt', () => {
			const startPos = Position.createAt( el, 1 );
			const endPos = Position.createAt( el, 2 );
			const newEndPos = Position.createAt( el, 4 );

			const spy = sinon.stub( Position, 'createAt' ).returns( newEndPos );

			selection._setTo( new Range( startPos, endPos ) );
			selection._setFocus( el, 'end' );

			expect( spy.calledOnce ).to.be.true;
			expect( selection.focus.compareWith( newEndPos ) ).to.equal( 'same' );

			Position.createAt.restore();
		} );
	} );

	describe( 'isCollapsed', () => {
		it( 'should return true when there is single collapsed range', () => {
			const range = Range.createFromParentsAndOffsets( el, 5, el, 5 );
			selection._setTo( range );

			expect( selection.isCollapsed ).to.be.true;
		} );

		it( 'should return false when there are multiple ranges', () => {
			const range1 = Range.createFromParentsAndOffsets( el, 5, el, 5 );
			const range2 = Range.createFromParentsAndOffsets( el, 15, el, 15 );
			selection._setTo( [ range1, range2 ] );

			expect( selection.isCollapsed ).to.be.false;
		} );

		it( 'should return false when there is not collapsed range', () => {
			const range = Range.createFromParentsAndOffsets( el, 15, el, 16 );
			selection._setTo( range );

			expect( selection.isCollapsed ).to.be.false;
		} );
	} );

	describe( 'rangeCount', () => {
		it( 'should return proper range count', () => {
			expect( selection.rangeCount ).to.equal( 0 );

			selection._setTo( range1 );

			expect( selection.rangeCount ).to.equal( 1 );

			selection._setTo( [ range1, range2 ] );

			expect( selection.rangeCount ).to.equal( 2 );
		} );
	} );

	describe( 'isBackward', () => {
		it( 'is defined by the last added range', () => {
			const range1 = Range.createFromParentsAndOffsets( el, 5, el, 10 );
			const range2 = Range.createFromParentsAndOffsets( el, 15, el, 16 );

			selection._setTo( range1, true );
			expect( selection ).to.have.property( 'isBackward', true );

			selection._setTo( [ range1, range2 ] );
			expect( selection ).to.have.property( 'isBackward', false );
		} );

		it( 'is false when last range is collapsed', () => {
			const range = Range.createFromParentsAndOffsets( el, 5, el, 5 );

			selection._setTo( range, true );

			expect( selection.isBackward ).to.be.false;
		} );
	} );

	describe( 'getRanges', () => {
		it( 'should return iterator with copies of all ranges', () => {
			selection._setTo( [ range1, range2 ] );

			const iterable = selection.getRanges();
			const ranges = Array.from( iterable );

			expect( ranges.length ).to.equal( 2 );
			expect( ranges[ 0 ].isEqual( range1 ) ).to.be.true;
			expect( ranges[ 0 ] ).to.not.equal( range1 );
			expect( ranges[ 1 ].isEqual( range2 ) ).to.be.true;
			expect( ranges[ 1 ] ).to.not.equal( range2 );
		} );
	} );

	describe( 'getFirstRange', () => {
		it( 'should return copy of range with first position', () => {
			selection._setTo( [ range1, range2, range3 ] );

			const range = selection.getFirstRange();

			expect( range.isEqual( range2 ) ).to.be.true;
			expect( range ).to.not.equal( range2 );
		} );

		it( 'should return null if no ranges are present', () => {
			expect( selection.getFirstRange() ).to.be.null;
		} );
	} );

	describe( 'getLastRange', () => {
		it( 'should return copy of range with last position', () => {
			selection._setTo( [ range1, range2, range3 ] );

			const range = selection.getLastRange();

			expect( range.isEqual( range3 ) ).to.be.true;
			expect( range ).to.not.equal( range3 );
		} );

		it( 'should return null if no ranges are present', () => {
			expect( selection.getLastRange() ).to.be.null;
		} );
	} );

	describe( 'getFirstPosition', () => {
		it( 'should return copy of first position', () => {
			selection._setTo( [ range1, range2, range3 ] );

			const position = selection.getFirstPosition();

			expect( position.isEqual( range2.start ) ).to.be.true;
			expect( position ).to.not.equal( range2.start );
		} );

		it( 'should return null if no ranges are present', () => {
			expect( selection.getFirstPosition() ).to.be.null;
		} );
	} );

	describe( 'getLastPosition', () => {
		it( 'should return copy of range with last position', () => {
			selection._setTo( [ range1, range2, range3 ] );

			const position = selection.getLastPosition();

			expect( position.isEqual( range3.end ) ).to.be.true;
			expect( position ).to.not.equal( range3.end );
		} );

		it( 'should return null if no ranges are present', () => {
			expect( selection.getLastPosition() ).to.be.null;
		} );
	} );

	describe( 'isEqual', () => {
		it( 'should return true if selections equal', () => {
			selection._setTo( [ range1, range2 ] );

			const otherSelection = new Selection();
			otherSelection._setTo( [ range1, range2 ] );

			expect( selection.isEqual( otherSelection ) ).to.be.true;
		} );

		it( 'should return true if backward selections equal', () => {
			selection._setTo( range1, true );

			const otherSelection = new Selection( [ range1 ], true );

			expect( selection.isEqual( otherSelection ) ).to.be.true;
		} );

		it( 'should return false if ranges count does not equal', () => {
			selection._setTo( [ range1, range2 ] );

			const otherSelection = new Selection( [ range1 ] );

			expect( selection.isEqual( otherSelection ) ).to.be.false;
		} );

		it( 'should return false if ranges (other than the last added one) do not equal', () => {
			selection._setTo( [ range1, range3 ] );

			const otherSelection = new Selection( [ range2, range3 ] );

			expect( selection.isEqual( otherSelection ) ).to.be.false;
		} );

		it( 'should return false if directions do not equal', () => {
			selection._setTo( range1 );

			const otherSelection = new Selection( [ range1 ], true );

			expect( selection.isEqual( otherSelection ) ).to.be.false;
		} );

		it( 'should return false if one selection is fake', () => {
			const otherSelection = new Selection();
			otherSelection._setFake( true );

			expect( selection.isEqual( otherSelection ) ).to.be.false;
		} );

		it( 'should return true if both selection are fake', () => {
			const otherSelection = new Selection( [ range1 ] );
			otherSelection._setFake( true );
			selection._setFake( true );
			selection._setTo( range1 );

			expect( selection.isEqual( otherSelection ) ).to.be.true;
		} );

		it( 'should return false if both selection are fake but have different label', () => {
			const otherSelection = new Selection( [ range1 ] );
			otherSelection._setFake( true, { label: 'foo bar baz' } );
			selection._setFake( true );
			selection._setTo( range1 );

			expect( selection.isEqual( otherSelection ) ).to.be.false;
		} );

		it( 'should return true if both selections are empty', () => {
			const otherSelection = new Selection();

			expect( selection.isEqual( otherSelection ) ).to.be.true;
		} );
	} );

	describe( 'isSimilar', () => {
		it( 'should return true if selections equal', () => {
			selection._setTo( [ range1, range2 ] );

			const otherSelection = new Selection( [ range1, range2 ] );

			expect( selection.isSimilar( otherSelection ) ).to.be.true;
		} );

		it( 'should return false if ranges count does not equal', () => {
			selection._setTo( [ range1, range2 ] );

			const otherSelection = new Selection( [ range1 ] );

			expect( selection.isSimilar( otherSelection ) ).to.be.false;
		} );

		it( 'should return false if trimmed ranges (other than the last added one) are not equal', () => {
			selection._setTo( [ range1, range3 ] );

			const otherSelection = new Selection( [ range2, range3 ] );

			expect( selection.isSimilar( otherSelection ) ).to.be.false;
		} );

		it( 'should return false if directions are not equal', () => {
			selection._setTo( range1 );

			const otherSelection = new Selection( [ range1 ], true );

			expect( selection.isSimilar( otherSelection ) ).to.be.false;
		} );

		it( 'should return true if both selections are empty', () => {
			const otherSelection = new Selection();

			expect( selection.isSimilar( otherSelection ) ).to.be.true;
		} );

		it( 'should return true if all ranges trimmed from both selections are equal', () => {
			const view = parse(
				'<container:p><attribute:span></attribute:span></container:p>' +
				'<container:p><attribute:span>xx</attribute:span></container:p>'
			);

			const p1 = view.getChild( 0 );
			const p2 = view.getChild( 1 );
			const span1 = p1.getChild( 0 );
			const span2 = p2.getChild( 0 );

			// <p>[<span>{]</span>}</p><p>[<span>{xx}</span>]</p>
			const rangeA1 = Range.createFromParentsAndOffsets( p1, 0, span1, 0 );
			const rangeB1 = Range.createFromParentsAndOffsets( span1, 0, p1, 1 );
			const rangeA2 = Range.createFromParentsAndOffsets( p2, 0, p2, 1 );
			const rangeB2 = Range.createFromParentsAndOffsets( span2, 0, span2, 1 );

			selection._setTo( [ rangeA1, rangeA2 ] );

			const otherSelection = new Selection( [ rangeB2, rangeB1 ] );

			expect( selection.isSimilar( otherSelection ) ).to.be.true;
			expect( otherSelection.isSimilar( selection ) ).to.be.true;

			expect( selection.isEqual( otherSelection ) ).to.be.false;
			expect( otherSelection.isEqual( selection ) ).to.be.false;
		} );
	} );

	describe( '_setRanges()', () => {
		it( 'should throw an error when range is invalid', () => {
			expect( () => {
				selection._setRanges( [ { invalid: 'range' } ] );
			} ).to.throw( CKEditorError, 'view-selection-invalid-range: Invalid Range.' );
		} );

		it( 'should add ranges and fire change event', done => {
			selection._setTo( range1 );

			selection.once( 'change', () => {
				expect( selection.rangeCount ).to.equal( 2 );
				expect( selection._ranges[ 0 ].isEqual( range2 ) ).to.be.true;
				expect( selection._ranges[ 0 ] ).is.not.equal( range2 );
				expect( selection._ranges[ 1 ].isEqual( range3 ) ).to.be.true;
				expect( selection._ranges[ 1 ] ).is.not.equal( range3 );
				done();
			} );

			selection._setRanges( [ range2, range3 ] );
		} );

		it( 'should throw when range is intersecting with already added range', () => {
			const text = el.getChild( 0 );
			const range2 = Range.createFromParentsAndOffsets( text, 7, text, 15 );

			expect( () => {
				selection._setRanges( [ range1, range2 ] );
			} ).to.throw( CKEditorError, 'view-selection-range-intersects' );
		} );
	} );

	describe( '_setTo()', () => {
		describe( 'simple scenarios', () => {
			it( 'should set selection ranges from the given selection', () => {
				selection._setTo( range1 );

				const otherSelection = new Selection( [ range2, range3 ], true );

				selection._setTo( otherSelection );

				expect( selection.rangeCount ).to.equal( 2 );
				expect( selection._ranges[ 0 ].isEqual( range2 ) ).to.be.true;
				expect( selection._ranges[ 0 ] ).is.not.equal( range2 );
				expect( selection._ranges[ 1 ].isEqual( range3 ) ).to.be.true;
				expect( selection._ranges[ 1 ] ).is.not.equal( range3 );

				expect( selection.anchor.isEqual( range3.end ) ).to.be.true;
			} );

			it( 'should set selection on the given Range using _setRanges method', () => {
				const spy = sinon.spy( selection, '_setRanges' );

				selection._setTo( range1 );

				expect( Array.from( selection.getRanges() ) ).to.deep.equal( [ range1 ] );
				expect( selection.isBackward ).to.be.false;
				expect( selection._setRanges.calledOnce ).to.be.true;
				spy.restore();
			} );

			it( 'should set selection on the given iterable of Ranges using _setRanges method', () => {
				const spy = sinon.spy( selection, '_setRanges' );

				selection._setTo( new Set( [ range1, range2 ] ) );

				expect( Array.from( selection.getRanges() ) ).to.deep.equal( [ range1, range2 ] );
				expect( selection.isBackward ).to.be.false;
				expect( selection._setRanges.calledOnce ).to.be.true;
				spy.restore();
			} );

			it( 'should set collapsed selection on the given Position using _setRanges method', () => {
				const spy = sinon.spy( selection, '_setRanges' );

				selection._setTo( range1.start );

				expect( Array.from( selection.getRanges() ).length ).to.equal( 1 );
				expect( Array.from( selection.getRanges() )[ 0 ].start ).to.deep.equal( range1.start );
				expect( selection.isBackward ).to.be.false;
				expect( selection.isCollapsed ).to.be.true;
				expect( selection._setRanges.calledOnce ).to.be.true;
				spy.restore();
			} );

			it( 'should fire change event', done => {
				selection.on( 'change', () => {
					expect( selection.rangeCount ).to.equal( 1 );
					expect( selection.getFirstRange().isEqual( range1 ) ).to.be.true;
					done();
				} );

				const otherSelection = new Selection( [ range1 ] );

				selection._setTo( otherSelection );
			} );

			it( 'should set fake state and label', () => {
				const otherSelection = new Selection();
				const label = 'foo bar baz';
				otherSelection._setFake( true, { label } );
				selection._setTo( otherSelection );

				expect( selection.isFake ).to.be.true;
				expect( selection.fakeSelectionLabel ).to.equal( label );
			} );

			it( 'should throw an error when trying to set to not selectable', () => {
				const otherSelection = new Selection();

				expect( () => {
					otherSelection._setTo( {} );
				} ).to.throw( /view-selection-setTo-not-selectable/ );
			} );

			it( 'should throw an error when trying to set to not selectable #2', () => {
				const otherSelection = new Selection();

				expect( () => {
					otherSelection._setTo();
				} ).to.throw( /view-selection-setTo-not-selectable/ );
			} );
		} );

		describe( 'setting collapsed selection', () => {
			beforeEach( () => {
				selection._setTo( [ range1, range2 ] );
			} );

			it( 'should collapse selection at position', () => {
				const position = new Position( el, 4 );

				selection._setTo( position );
				const range = selection.getFirstRange();

				expect( range.start.parent ).to.equal( el );
				expect( range.start.offset ).to.equal( 4 );
				expect( range.start.isEqual( range.end ) ).to.be.true;
			} );

			it( 'should collapse selection at node and offset', () => {
				const foo = new Text( 'foo' );
				const p = new Element( 'p', null, foo );

				selection._setTo( foo );
				let range = selection.getFirstRange();

				expect( range.start.parent ).to.equal( foo );
				expect( range.start.offset ).to.equal( 0 );
				expect( range.start.isEqual( range.end ) ).to.be.true;

				selection._setTo( p, 1 );
				range = selection.getFirstRange();

				expect( range.start.parent ).to.equal( p );
				expect( range.start.offset ).to.equal( 1 );
				expect( range.start.isEqual( range.end ) ).to.be.true;
			} );

			it( 'should collapse selection at node and flag', () => {
				const foo = new Text( 'foo' );
				const p = new Element( 'p', null, foo );

				selection._setTo( foo, 'end' );
				let range = selection.getFirstRange();

				expect( range.start.parent ).to.equal( foo );
				expect( range.start.offset ).to.equal( 3 );
				expect( range.start.isEqual( range.end ) ).to.be.true;

				selection._setTo( foo, 'before' );
				range = selection.getFirstRange();

				expect( range.start.parent ).to.equal( p );
				expect( range.start.offset ).to.equal( 0 );
				expect( range.start.isEqual( range.end ) ).to.be.true;

				selection._setTo( foo, 'after' );
				range = selection.getFirstRange();

				expect( range.start.parent ).to.equal( p );
				expect( range.start.offset ).to.equal( 1 );
				expect( range.start.isEqual( range.end ) ).to.be.true;
			} );
		} );

		describe( 'setting collapsed selection at start', () => {
			it( 'should collapse to start position and fire change event', done => {
				selection._setTo( [ range1, range2, range3 ] );
				selection.once( 'change', () => {
					expect( selection.rangeCount ).to.equal( 1 );
					expect( selection.isCollapsed ).to.be.true;
					expect( selection._ranges[ 0 ].start.isEqual( range2.start ) ).to.be.true;
					done();
				} );

				selection._setTo( selection.getFirstPosition() );
			} );

			it( 'should do nothing if no ranges present', () => {
				const fireSpy = sinon.spy( selection, 'fire' );

				selection._setTo( selection.getFirstPosition() );

				fireSpy.restore();
				expect( fireSpy.notCalled ).to.be.true;
			} );
		} );

		describe( 'setting collapsed selection to end', () => {
			it( 'should collapse to end position and fire change event', done => {
				selection._setTo( [ range1, range2, range3 ] );
				selection.once( 'change', () => {
					expect( selection.rangeCount ).to.equal( 1 );
					expect( selection.isCollapsed ).to.be.true;
					expect( selection._ranges[ 0 ].end.isEqual( range3.end ) ).to.be.true;
					done();
				} );

				selection._setTo( selection.getLastPosition() );
			} );

			it( 'should do nothing if no ranges present', () => {
				const fireSpy = sinon.spy( selection, 'fire' );

				selection._setTo( selection.getLastPosition() );

				fireSpy.restore();
				expect( fireSpy.notCalled ).to.be.true;
			} );
		} );

		describe( 'removing all ranges', () => {
			it( 'should remove all ranges and fire change event', done => {
				selection._setTo( [ range1, range2 ] );

				selection.once( 'change', () => {
					expect( selection.rangeCount ).to.equal( 0 );
					done();
				} );

				selection._setTo( null );
			} );

			it( 'should do nothing when no ranges are present', () => {
				const fireSpy = sinon.spy( selection, 'fire' );
				selection._setTo( null );

				fireSpy.restore();
				expect( fireSpy.notCalled ).to.be.true;
			} );
		} );
	} );

	describe( 'getEditableElement()', () => {
		it( 'should return null if no ranges in selection', () => {
			expect( selection.editableElement ).to.be.null;
		} );

		it( 'should return null if selection is placed in container that is not EditableElement', () => {
			selection._setTo( range1 );

			expect( selection.editableElement ).to.be.null;
		} );

		it( 'should return EditableElement when selection is placed inside', () => {
			const viewDocument = new Document();
			const selection = viewDocument.selection;
			const root = createViewRoot( viewDocument, 'div', 'main' );
			const element = new Element( 'p' );
			root._appendChildren( element );

			selection._setTo( Range.createFromParentsAndOffsets( element, 0, element, 0 ) );

			expect( selection.editableElement ).to.equal( root );
		} );
	} );

	describe( 'isFake', () => {
		it( 'should be false for newly created instance', () => {
			expect( selection.isFake ).to.be.false;
		} );
	} );

	describe( '_setFake()', () => {
		it( 'should allow to set selection to fake', () => {
			selection._setFake( true );

			expect( selection.isFake ).to.be.true;
		} );

		it( 'should allow to set fake selection label', () => {
			const label = 'foo bar baz';
			selection._setFake( true, { label } );

			expect( selection.fakeSelectionLabel ).to.equal( label );
		} );

		it( 'should not set label when set to false', () => {
			const label = 'foo bar baz';
			selection._setFake( false, { label } );

			expect( selection.fakeSelectionLabel ).to.equal( '' );
		} );

		it( 'should reset label when set to false', () => {
			const label = 'foo bar baz';
			selection._setFake( true, { label } );
			selection._setFake( false );

			expect( selection.fakeSelectionLabel ).to.equal( '' );
		} );

		it( 'should fire change event', done => {
			selection.once( 'change', () => {
				expect( selection.isFake ).to.be.true;
				expect( selection.fakeSelectionLabel ).to.equal( 'foo bar baz' );

				done();
			} );

			selection._setFake( true, { label: 'foo bar baz' } );
		} );
	} );

	describe( 'getSelectedElement()', () => {
		it( 'should return selected element', () => {
			const { selection, view } = parse( 'foo [<b>bar</b>] baz' );
			const b = view.getChild( 1 );

			expect( selection.getSelectedElement() ).to.equal( b );
		} );

		it( 'should return null if there is more than one range', () => {
			const { selection } = parse( 'foo [<b>bar</b>] [<i>baz</i>]' );

			expect( selection.getSelectedElement() ).to.be.null;
		} );

		it( 'should return null if there is no selection', () => {
			expect( selection.getSelectedElement() ).to.be.null;
		} );

		it( 'should return null if selection is not over single element #1', () => {
			const { selection } = parse( 'foo [<b>bar</b> ba}z' );

			expect( selection.getSelectedElement() ).to.be.null;
		} );

		it( 'should return null if selection is not over single element #2', () => {
			const { selection } = parse( 'foo <b>{bar}</b> baz' );

			expect( selection.getSelectedElement() ).to.be.null;
		} );
	} );
} );
