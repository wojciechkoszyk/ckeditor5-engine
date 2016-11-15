/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import mix from '../../utils/mix.js';
import EmitterMixin from '../../utils/emittermixin.js';

import Mapper from '../conversion/mapper.js';

import ModelConversionDispatcher from '../conversion/modelconversiondispatcher.js';
import { insertText } from '../conversion/model-to-view-converters.js';

import ViewConversionDispatcher from '../conversion/viewconversiondispatcher.js';
import { convertText, convertToModelFragment } from '../conversion/view-to-model-converters.js';

import ViewDocumentFragment from '../view/documentfragment.js';

import ModelRange from '../model/range.js';
import ModelPosition from '../model/position.js';

import insertContent from './insertcontent.js';

/**
 * Controller for the data pipeline. The data pipeline controls how data is retrieved from the document
 * and set inside it. Hence, the controller features two methods which allow to {@link engine.controller.DataController#get get}
 * and {@link engine.controller.DataController#set set} data of the {@link engine.controller.DataController#model model}
 * using given:
 *
 * * {@link engine.dataProcessor.DataProcessor data processor},
 * * {@link engine.conversion.ModelConversionDispatcher model to view} and
 * * {@link engine.conversion.ViewConversionDispatcher view to model} converters.
 *
 * @memberOf engine.controller
 * @mixes utils.EmitterMixin
 */
export default class DataController {
	/**
	 * Creates data controller instance.
	 *
	 * @param {engine.model.Document} model Document model.
	 * @param {engine.dataProcessor.DataProcessor} [dataProcessor] Data processor which should used by the controller.
	 */
	constructor( model, dataProcessor ) {
		/**
		 * Document model.
		 *
		 * @readonly
		 * @member {engine.model.document} engine.controller.DataController#model
		 */
		this.model = model;

		/**
		 * Data processor used during the conversion.
		 *
		 * @readonly
		 * @member {engine.dataProcessor.DataProcessor} engine.controller.DataController#processor
		 */
		this.processor = dataProcessor;

		/**
		 * Mapper used for the conversion. It has no permanent bindings, because they are created when getting data and
		 * cleared directly after data are converted. However, the mapper is defined as class property, because
		 * it needs to be passed to the `ModelConversionDispatcher` as a conversion API.
		 *
		 * @member {engine.conversion.Mapper} engine.controller.DataController#_mapper
		 */
		this.mapper = new Mapper();

		/**
		 * Model to view conversion dispatcher used by the {@link engine.controller.DataController#get get method}.
		 * To attach model to view converter to the data pipeline you need to add lister to this property:
		 *
		 *		data.modelToView( 'insert:$element', customInsertConverter );
		 *
		 * Or use {@link engine.conversion.ModelConverterBuilder}:
		 *
		 *		buildModelConverter().for( data.modelToView ).fromAttribute( 'bold' ).toElement( 'b' );
		 *
		 * @readonly
		 * @member {engine.conversion.ModelConversionDispatcher} engine.controller.DataController#modelToView
		 */
		this.modelToView = new ModelConversionDispatcher( {
			mapper: this.mapper
		} );
		this.modelToView.on( 'insert:$text', insertText(), { priority: 'lowest' } );

		/**
		 * View to model conversion dispatcher used by the {@link engine.controller.DataController#set set method}.
		 * To attach view to model converter to the data pipeline you need to add lister to this property:
		 *
		 *		data.viewToModel( 'element', customElementConverter );
		 *
		 * Or use {@link engine.conversion.ViewConverterBuilder}:
		 *
		 *		buildViewConverter().for( data.viewToModel ).fromElement( 'b' ).toAttribute( 'bold', 'true' );
		 *
		 * @readonly
		 * @member {engine.conversion.ViewConversionDispatcher} engine.controller.DataController#viewToModel
		 */
		this.viewToModel = new ViewConversionDispatcher( {
			schema: model.schema
		} );

		// Define default converters for text and elements.
		//
		// Note that if there is no default converter for the element it will be skipped, for instance `<b>foo</b>` will be
		// converted to nothing. We add `convertToModelFragment` as a last converter so it converts children of that
		// element to the document fragment so `<b>foo</b>` will be converted to `foo` if there is no converter for `<b>`.
		this.viewToModel.on( 'text', convertText(), { priority: 'lowest' } );
		this.viewToModel.on( 'element', convertToModelFragment(), { priority: 'lowest' } );
		this.viewToModel.on( 'documentFragment', convertToModelFragment(), { priority: 'lowest' } );

		this.on( 'insertContent', ( evt, data ) => insertContent( this, data.content, data.selection, data.batch ) );
	}

	/**
	 * Returns model's data converted by the {@link engine.controller.DataController#modelToView model to view converters} and
	 * formatted by the {@link engine.controller.DataController#processor data processor}.
	 *
	 * @param {String} [rootName='main'] Root name.
	 * @returns {String} Output data.
	 */
	get( rootName = 'main' ) {
		// Get model range.
		return this.stringify( this.model.getRoot( rootName ) );
	}

	/**
	 * Returns the content of the given {@link engine.model.Element model's element} converted by the
	 * {@link engine.controller.DataController#modelToView model to view converters} and formatted by the
	 * {@link engine.controller.DataController#processor data processor}.
	 *
	 * @param {engine.model.Element} modelElement Element which content will be stringified.
	 * @returns {String} Output data.
	 */
	stringify( modelElement ) {
		// model -> view
		const viewDocumentFragment = this.toView( modelElement );

		// view -> data
		return this.processor.toData( viewDocumentFragment );
	}

	/**
	 * Returns the content of the given {@link engine.model.Element model's element} converted by the
	 * {@link engine.controller.DataController#modelToView model to view converters} to the
	 * {@link engine.view.DocumentFragment view DocumentFragment}.
	 *
	 * @param {engine.model.Element} modelElement Element which content will be stringified.
	 * @returns {engine.view.DocumentFragment} Output view DocumentFragment.
	 */
	toView( modelElement ) {
		const modelRange = ModelRange.createIn( modelElement );

		const viewDocumentFragment = new ViewDocumentFragment();
		this.mapper.bindElements( modelElement, viewDocumentFragment );

		this.modelToView.convertInsertion( modelRange );

		this.mapper.clearBindings();

		return viewDocumentFragment;
	}

	/**
	 * Sets input data parsed by the {@link engine.controller.DataController#processor data processor} and
	 * converted by the {@link engine.controller.DataController#viewToModel view to model converters}.
	 *
	 * This method also creates a batch with all the changes applied. If all you need is to parse data use
	 * the {@link engine.controller.DataController#parse} method.
	 *
	 * @param {String} data Input data.
	 * @param {String} [rootName='main'] Root name.
	 */
	set( data, rootName = 'main' ) {
		// Save to model.
		const modelRoot = this.model.getRoot( rootName );

		this.model.enqueueChanges( () => {
			// Clearing selection is a workaround for ticket #569 (LiveRange loses position after removing data from document).
			// After fixing it this code should be removed.
			this.model.selection.removeAllRanges();
			this.model.selection.clearAttributes();

			// Initial batch should be ignored by features like undo, etc.
			this.model.batch( 'transparent' )
				.remove( ModelRange.createIn( modelRoot ) )
				.insert( ModelPosition.createAt( modelRoot, 0 ), this.parse( data ) );
		} );
	}

	/**
	 * Returns data parsed by the {@link engine.controller.DataController#processor data processor} and then
	 * converted by the {@link engine.controller.DataController#viewToModel view to model converters}.
	 *
	 * @see engine.controller.DataController#set
	 * @param {String} data Data to parse.
	 * @param {String} [context='$root'] Base context in which view will be converted to the model. See:
	 * {@link engine.conversion.ViewConversionDispatcher#convert}.
	 * @returns {engine.model.DocumentFragment} Parsed data.
	 */
	parse( data, context = '$root' ) {
		// data -> view
		const viewDocumentFragment = this.processor.toView( data );

		// view -> model
		return this.viewToModel.convert( viewDocumentFragment, { context: [ context ] } );
	}

	/**
	 * Removes all event listeners set by the DataController.
	 */
	destroy() {}

	/**
	 * See {@link engine.controller.insertContent}.
	 *
	 * @fires engine.controller.DataController#insertContent
	 * @param {engine.model.DocumentFragment} content The content to insert.
	 * @param {engine.model.Selection} selection Selection into which the content should be inserted.
	 * @param {engine.model.Batch} [batch] Batch to which deltas will be added. If not specified, then
	 * changes will be added to a new batch.
	 */
	insertContent( content, selection, batch ) {
		this.fire( 'insertContent', { content, selection, batch } );
	}
}

mix( DataController, EmitterMixin );

/**
 * Event fired when {@link engine.controller.DataController#insert} method is called.
 * The {@link engine.controller.dataController.insert default action of the composer} is implemented as a
 * listener to that event so it can be fully customized by the features.
 *
 * @event engine.controller.DataController#insert
 * @param {Object} data
 * @param {engine.view.DocumentFragment} data.content The content to insert.
 * @param {engine.model.Selection} data.selection Selection into which the content should be inserted.
 * @param {engine.model.Batch} [data.batch] Batch to which deltas will be added.
 */

