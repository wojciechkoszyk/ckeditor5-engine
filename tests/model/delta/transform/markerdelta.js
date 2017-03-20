/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import transformations from '../../../../src/model/delta/basic-transformations';
/*jshint unused: false*/

import transform from '../../../../src/model/delta/transform';

import Element from '../../../../src/model/element';
import Position from '../../../../src/model/position';
import Range from '../../../../src/model/range';

import MarkerDelta from '../../../../src/model/delta/markerdelta';
import MarkerOperation from '../../../../src/model/operation/markeroperation';

import {
	expectDelta,
	getFilledDocument,
	getMarkerDelta,
	getSplitDelta,
	getMergeDelta,
	getWrapDelta,
	getUnwrapDelta
} from '../../../model/delta/transform/_utils/utils';

describe( 'transform', () => {
	let doc, root, gy, baseVersion;

	beforeEach( () => {
		doc = getFilledDocument();
		root = doc.getRoot();
		gy = doc.graveyard;
		baseVersion = doc.version;
	} );

	describe( 'MarkerDelta by', () => {
		describe( 'SplitDelta', () => {
			let markerDelta;

			beforeEach( () => {
				const oldRange = new Range( new Position( root, [ 3, 0 ] ), new Position( root, [ 3, 3 ] ) );
				const newRange = new Range( new Position( root, [ 3, 3, 3, 2 ] ), new Position( root, [ 3, 3, 3, 6 ] ) );

				markerDelta = getMarkerDelta( 'name', oldRange, newRange, baseVersion );
			} );

			it( 'split inside oldRange', () => {
				let splitDelta = getSplitDelta( new Position( root, [ 3, 1 ] ), new Element( 'div' ), 3, baseVersion );
				let transformed = transform( markerDelta, splitDelta );

				baseVersion = splitDelta.operations.length;

				expect( transformed.length ).to.equal( 1 );

				const expectedOldRange = new Range( new Position( root, [ 3, 0 ] ), new Position( root, [ 4, 2 ] ) );
				const expectedNewRange = new Range( new Position( root, [ 4, 2, 3, 2 ] ), new Position( root, [ 4, 2, 3, 6 ] ) );

				expectDelta( transformed[ 0 ], {
					type: MarkerDelta,
					operations: [
						{
							type: MarkerOperation,
							name: 'name',
							oldRange: expectedOldRange,
							newRange: expectedNewRange,
							baseVersion: baseVersion
						}
					]
				} );
			} );

			it( 'split inside newRange', () => {
				let splitDelta = getSplitDelta( new Position( root, [ 3, 3, 3, 4 ] ), new Element( 'p' ), 8, baseVersion );
				let transformed = transform( markerDelta, splitDelta );

				baseVersion = splitDelta.operations.length;

				expect( transformed.length ).to.equal( 1 );

				const expectedOldRange = new Range( new Position( root, [ 3, 0 ] ), new Position( root, [ 3, 3 ] ) );
				const expectedNewRange = new Range( new Position( root, [ 3, 3, 3, 2 ] ), new Position( root, [ 3, 3, 4, 2 ] ) );

				expectDelta( transformed[ 0 ], {
					type: MarkerDelta,
					operations: [
						{
							type: MarkerOperation,
							name: 'name',
							oldRange: expectedOldRange,
							newRange: expectedNewRange,
							baseVersion: baseVersion
						}
					]
				} );
			} );
		} );

		describe( 'MergeDelta', () => {
			it( 'collapsed marker in merged element', () => {
				// MarkerDelta with collapsed range, which changes from the beginning of merged element to the end.
				const oldRange = new Range( new Position( root, [ 3, 3, 3, 0 ] ) );
				const newRange = new Range( new Position( root, [ 3, 3, 3, 12 ] ) );

				const markerDelta = getMarkerDelta( 'name', oldRange, newRange, baseVersion );

				// MergeDelta merges the element in which is collapsed marker range with the previous element.
				const mergeDelta = getMergeDelta( new Position( root, [ 3, 3, 3 ] ), 4, 12, baseVersion );

				const transformed = transform( markerDelta, mergeDelta );

				// It is expected, that ranges in MarkerDelta got correctly transformed:
				// from start of merged element to the place where merged nodes where moved in the previous element,
				// from end of merged element to the end of previous element.
				const expectedOldRange = new Range( new Position( root, [ 3, 3, 2, 4 ] ), new Position( root, [ 3, 3, 2, 4 ] ) );
				const expectedNewRange = new Range( new Position( root, [ 3, 3, 2, 16 ] ), new Position( root, [ 3, 3, 2, 16 ] ) );

				expectDelta( transformed[ 0 ], {
					type: MarkerDelta,
					operations: [
						{
							type: MarkerOperation,
							name: 'name',
							oldRange: expectedOldRange,
							newRange: expectedNewRange,
							baseVersion: baseVersion + 2
						}
					]
				} );
			} );
		} );

		describe( 'WrapDelta', () => {
			it( 'ranges intersecting with wrapped range', () => {
				// MarkerDelta with ranges that intersects with wrapped range.
				const oldRange = new Range( new Position( root, [ 0, 2 ] ), new Position( root, [ 1, 2 ] ) );
				const newRange = new Range( new Position( root, [ 1, 2 ] ), new Position( root, [ 2, 2 ] ) );

				const markerDelta = getMarkerDelta( 'name', oldRange, newRange, baseVersion );

				// Wrap delta wraps element on position ( root [ 1 ] ), which intersects with both `oldRange` and `newRange`.
				const wrapElement = new Element( 'w' );
				const wrapRange = new Range( new Position( root, [ 1 ] ), new Position( root, [ 2 ] ) );
				const wrapDelta = getWrapDelta( wrapRange, wrapElement, baseVersion );

				const transformed = transform( markerDelta, wrapDelta );

				// It is expected, that ranges in MarkerDelta got correctly transformed:
				// `oldRange` end is in wrapped element,
				// `newRange` start is in wrapped element.
				const expectedOldRange = new Range( new Position( root, [ 0, 2 ] ), new Position( root, [ 1, 0, 2 ] ) );
				const expectedNewRange = new Range( new Position( root, [ 1, 0, 2 ] ), new Position( root, [ 2, 2 ] ) );

				expectDelta( transformed[ 0 ], {
					type: MarkerDelta,
					operations: [
						{
							type: MarkerOperation,
							name: 'name',
							oldRange: expectedOldRange,
							newRange: expectedNewRange,
							baseVersion: baseVersion + 2
						}
					]
				} );
			} );
		} );

		describe( 'UnwrapDelta', () => {
			it( 'ranges intersecting with unwrapped element', () => {
				// MarkerDelta with ranges that intersects with unwrapped element.
				const oldRange = new Range( new Position( root, [ 0, 2 ] ), new Position( root, [ 1, 0, 2 ] ) );
				const newRange = new Range( new Position( root, [ 1, 0, 2 ] ), new Position( root, [ 2, 2 ] ) );

				const markerDelta = getMarkerDelta( 'name', oldRange, newRange, baseVersion );

				// Unwrap delta unwraps element on position ( root [ 1, 0 ] ), which intersects with both `oldRange` and `newRange`.
				const unwrapPosition = new Position( root, [ 1, 0 ] );
				const unwrapDelta = getUnwrapDelta( unwrapPosition, 4, baseVersion );

				const transformed = transform( markerDelta, unwrapDelta );

				// It is expected, that ranges in MarkerDelta got correctly transformed.
				const expectedOldRange = new Range( new Position( root, [ 0, 2 ] ), new Position( root, [ 1, 2 ] ) );
				const expectedNewRange = new Range( new Position( root, [ 1, 2 ] ), new Position( root, [ 2, 2 ] ) );

				expectDelta( transformed[ 0 ], {
					type: MarkerDelta,
					operations: [
						{
							type: MarkerOperation,
							name: 'name',
							oldRange: expectedOldRange,
							newRange: expectedNewRange,
							baseVersion: baseVersion + 2
						}
					]
				} );
			} );

			it( 'ranges intersecting with unwrapped element #2', () => {
				// MarkerDelta with ranges that intersects with unwrapped element.
				const oldRange = new Range( new Position( root, [ 0, 2 ] ), new Position( root, [ 1, 2 ] ) );
				const newRange = new Range( new Position( root, [ 1, 2 ] ), new Position( root, [ 2, 2 ] ) );

				const markerDelta = getMarkerDelta( 'name', oldRange, newRange, baseVersion );

				// Unwrap delta unwraps element on position ( root [ 1 ] ), which intersects with both `oldRange` and `newRange`.
				const unwrapPosition = new Position( root, [ 1 ] );
				const unwrapDelta = getUnwrapDelta( unwrapPosition, 4, baseVersion );

				const transformed = transform( markerDelta, unwrapDelta );

				// It is expected, that ranges in MarkerDelta got correctly transformed.
				const expectedOldRange = new Range( new Position( root, [ 0, 2 ] ), new Position( root, [ 3 ] ) );
				const expectedNewRange = new Range( new Position( root, [ 3 ] ), new Position( root, [ 5, 2 ] ) );

				expectDelta( transformed[ 0 ], {
					type: MarkerDelta,
					operations: [
						{
							type: MarkerOperation,
							name: 'name',
							oldRange: expectedOldRange,
							newRange: expectedNewRange,
							baseVersion: baseVersion + 2
						}
					]
				} );
			} );
		} );
	} );
} );