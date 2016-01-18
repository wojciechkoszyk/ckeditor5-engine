/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const utils = {
	/**
	 * Returns tree structure as a simplified string. Elements are uppercase and characters are lowercase.
	 * Start and end of an element is marked the same way, by the element's name (in uppercase).
	 *
	 *		let element = new Element( 'div', [], [ 'abc', new Element( 'p', [], 'foo' ), 'xyz' ] );
	 *		treemodelUtils.getNodesAndText( element ); // abcPfooPxyz
	 *
	 * @param {treeModel.Range} range Range to stringify.
	 * @returns {String} String representing element inner structure.
	 */
	getNodesAndText( range ) {
		let txt = '';

		for ( let step of range ) {
			let node = step.node;

			if ( node.character ) {
				txt += node.character.toLowerCase();
			} else if ( node.name ) {
				txt += node.name.toUpperCase();
			}
		}

		return txt;
	}
};

export default utils;