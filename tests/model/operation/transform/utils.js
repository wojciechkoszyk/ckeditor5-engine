import ModelTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor';

import ListEditing from '@ckeditor/ckeditor5-list/src/listediting';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Typing from '@ckeditor/ckeditor5-typing/src/typing';
import UndoEditing from '@ckeditor/ckeditor5-undo/src/undoediting';
import BlockQuoteEditing from '@ckeditor/ckeditor5-block-quote/src/blockquoteediting';

import { getData, parse } from '../../../../src/dev-utils/model';
import transform from '../../../../src/model/operation/transform';
import Position from '../../../../src/model/position';
import Range from '../../../../src/model/range';
import OperationFactory from '../../../../src/model/operation/operationfactory';

const clients = new Set();
const bufferedOperations = new Set();

export class Client {
	constructor( name ) {
		this.editor = null;
		this.document = null;
		this.syncedVersion = 0;
		this.orderNumber = null;
		this.name = name;
	}

	init() {
		return ModelTestEditor.create( {
			// Typing is needed for delete command.
			// UndoEditing is needed for undo command.
			// Block plugins are needed for proper data serializing.
			plugins: [ Typing, Paragraph, ListEditing, UndoEditing, BlockQuoteEditing ]
		} ).then( editor => {
			this.editor = editor;
			this.document = editor.model.document;

			return this;
		} );
	}

	setData( initModelString ) {
		const model = this.editor.model;
		const modelRoot = model.document.getRoot();

		// Parse data string to model.
		const parsedResult = parse( initModelString, model.schema, { context: [ modelRoot.name ] } );

		// Retrieve DocumentFragment and Selection from parsed model.
		const modelDocumentFragment = parsedResult.model;
		const selection = parsedResult.selection;

		model.change( writer => {
			// Replace existing model in document by new one.
			writer.remove( Range.createIn( modelRoot ) );
			writer.insert( modelDocumentFragment, modelRoot );
		} );

		const ranges = [];

		for ( const range of selection.getRanges() ) {
			const start = new Position( modelRoot, range.start.path );
			const end = new Position( modelRoot, range.end.path );

			ranges.push( new Range( start, end ) );
		}

		model.document.selection._setTo( ranges );

		this.syncedVersion = this.document.version;
	}

	setSelection( start, end ) {
		if ( !end ) {
			end = start.slice();
		}

		const startPos = this._getPosition( start );
		const endPos = this._getPosition( end );

		this.editor.model.document.selection._setTo( new Range( startPos, endPos ) );
	}

	insert( itemString, path ) {
		const item = parse( itemString, this.editor.model.schema );
		const position = this._getPosition( path, 'start' );

		this._processAction( 'insert', item, position );
	}

	type( text, attributes, path ) {
		const position = this._getPosition( path, 'start' );

		this._processAction( 'insertText', text, attributes, position );
	}

	remove( start, end ) {
		const startPos = this._getPosition( start, 'start' );
		const endPos = this._getPosition( end, 'end' );

		this._processAction( 'remove', new Range( startPos, endPos ) );
	}

	delete() {
		this._processExecute( 'delete' );
	}

	move( target, start, end ) {
		const targetPos = this._getPosition( target );
		const startPos = this._getPosition( start, 'start' );
		const endPos = this._getPosition( end, 'end' );

		this._processAction( 'move', new Range( startPos, endPos ), targetPos );
	}

	rename( newName, path ) {
		const pos = this._getPosition( path, 'beforeParent' );
		const element = pos.nodeAfter;

		this._processAction( 'rename', element, newName );
	}

	setAttribute( key, value, start, end ) {
		const startPos = this._getPosition( start, 'start' );
		const endPos = this._getPosition( end, 'end' );

		this._processAction( 'setAttribute', key, value, new Range( startPos, endPos ) );
	}

	removeAttribute( key, start, end ) {
		const startPos = this._getPosition( start, 'start' );
		const endPos = this._getPosition( end, 'end' );

		this._processAction( 'removeAttribute', key, new Range( startPos, endPos ) );
	}

	setMarker( name, start, end ) {
		let actionName;

		const startPos = this._getPosition( start, 'start' );
		const endPos = this._getPosition( end, 'end' );

		if ( this.editor.model.markers.has( name ) ) {
			actionName = 'updateMarker';
		} else {
			actionName = 'addMarker';
		}

		const range = new Range( startPos, endPos );

		this._processAction( actionName, name, { range, usingOperation: true } );
	}

	removeMarker( name ) {
		this._processAction( 'removeMarker', name );
	}

	wrap( elementName, start, end ) {
		const startPos = this._getPosition( start, 'start' );
		const endPos = this._getPosition( end, 'end' );

		this._processAction( 'wrap', new Range( startPos, endPos ), elementName );
	}

	unwrap( path ) {
		const pos = this._getPosition( path, 'beforeParent' );
		const element = pos.nodeAfter;

		this._processAction( 'unwrap', element );
	}

	merge( path ) {
		const pos = this._getPosition( path, 'start' );

		this._processAction( 'merge', pos );
	}

	split( path ) {
		const pos = this._getPosition( path, 'start' );

		this._processAction( 'split', pos );
	}

	undo() {
		this._processExecute( 'undo' );
	}

	_processExecute( commandName, commandArgs ) {
		const oldVersion = this.document.version;

		this.editor.execute( commandName, commandArgs );

		const operations = this.document.history.getOperations( oldVersion );

		bufferOperations( Array.from( operations ), this );
	}

	_getPosition( path, type ) {
		if ( !path ) {
			return this._getPositionFromSelection( type );
		}

		return new Position( this.document.getRoot(), path );
	}

	_getPositionFromSelection( type ) {
		const selRange = this.editor.model.document.selection.getFirstRange();

		switch ( type ) {
			default:
			case 'start':
				return Position.createFromPosition( selRange.start );
			case 'end':
				return Position.createFromPosition( selRange.end );
			case 'beforeParent':
				return Position.createBefore( selRange.start.parent );
		}
	}

	getModelString() {
		return getData( this.editor.model, { withoutSelection: true, convertMarkers: true } );
	}

	destroy() {
		clients.delete( this );

		return this.editor.destroy();
	}

	_processAction( name, ...args ) {
		const oldVersion = this.document.version;

		this.editor.model.change( writer => {
			writer[ name ]( ...args );
		} );

		const operations = Array.from( this.document.history.getOperations( oldVersion ) );

		bufferOperations( operations, this );
	}

	static get( clientName ) {
		const client = new Client( clientName );
		client.orderNumber = clients.size;

		clients.add( client );

		return client.init();
	}
}

function bufferOperations( operations, client ) {
	bufferedOperations.add( { operations: operations.map( operation => JSON.stringify( operation ) ), client } );
}

export function syncClients() {
	for ( const client of clients ) {
		for ( const item of bufferedOperations ) {
			const remoteOperations = item.operations.map( op => OperationFactory.fromJSON( JSON.parse( op ), client.document ) );
			const remoteClient = item.client;

			if ( remoteClient == client ) {
				continue;
			}

			const clientOperations = Array.from( client.document.history.getOperations( client.syncedVersion ) );

			let remoteOperationsTransformed = null;

			const options = {
				useContext: false,
				padWithNoOps: true
			};

			if ( client.orderNumber < remoteClient.orderNumber ) {
				remoteOperationsTransformed = transform.transformSets( clientOperations, remoteOperations, options ).operationsB;
			} else {
				remoteOperationsTransformed = transform.transformSets( remoteOperations, clientOperations, options ).operationsA;
			}

			client.editor.model.enqueueChange( 'transparent', writer => {
				for ( const operation of remoteOperationsTransformed ) {
					writer.batch.addOperation( operation );
					client.editor.model.applyOperation( operation );
				}
			} );
		}

		client.syncedVersion = client.document.version;
	}

	bufferedOperations.clear();
}

export function expectClients( expectedModelString ) {
	for ( const client of clients ) {
		expect( client.getModelString(), client.name + ' content' ).to.equal( expectedModelString );
	}

	let syncedVersion = null;

	for ( const client of clients ) {
		if ( syncedVersion === null ) {
			syncedVersion = client.syncedVersion;
			continue;
		}

		expect( client.syncedVersion, client.name + ' version' ).to.equal( syncedVersion );
	}
}
