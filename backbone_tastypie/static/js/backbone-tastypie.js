/**
 * Backbone-tastypie.js 0.2.0
 * (c) 2011 Paul Uithol
 * 
 * Backbone-tastypie may be freely distributed under the MIT license.
 * Add or override Backbone.js functionality, for compatibility with django-tastypie.
 * Depends on Backbone (and thus on Underscore as well): https://github.com/documentcloud/backbone.
 */
( function( root, factory ) {
	// Set up Backbone-relational for the environment. Start with AMD.
	if ( typeof define === 'function' && define.amd ) {
		define( [ 'exports', 'backbone', 'underscore' ], factory );
	}
	// Next for Node.js or CommonJS.
	else if ( typeof exports !== 'undefined' ) {
		factory( exports, require( 'backbone' ), require( 'underscore' ) );
	}
	// Finally, as a browser global. Use `root` here as it references `window`.
	else {
		factory( root, root.Backbone, root._ );
	}
}( this, function( exports, Backbone, _ ) {
	"use strict";

	Backbone.Tastypie = {
		apiKey: {
			username: '',
			key: ''
		},
		constructSetUrl: function( ids ) {
			return 'set/' + ids.join( ';' ) + '/';
		},
		csrfToken: '',
		defaultOptions: {},
		doGetOnEmptyPostResponse: true,
		doGetOnEmptyPutResponse: false,
		idAttribute: 'resource_uri'
	};
	
	Backbone.Model.prototype.idAttribute = Backbone.Tastypie.idAttribute;

	/**
	 * Override Backbone's sync function, to do a GET upon receiving a HTTP CREATED.
	 * This requires 2 requests to do a create, so you may want to use some other method in production.
	 * Modified from http://joshbohde.com/blog/backbonejs-and-django
	 */
	Backbone.oldSync = Backbone.sync;
	Backbone.sync = function( method, model, options ) {
		var headers = {},
			options = _.defaults( options || {}, Backbone.Tastypie.defaultOptions );

		if ( Backbone.Tastypie.apiKey && Backbone.Tastypie.apiKey.username ) {
			headers[ 'Authorization' ] = 'ApiKey ' + Backbone.Tastypie.apiKey.username + ':' + Backbone.Tastypie.apiKey.key;
		}

		if ( Backbone.Tastypie.csrfToken ) {
			headers[ 'X-CSRFToken' ] = Backbone.Tastypie.csrfToken;
		}

		// Keep `headers` for a potential second request
		headers = _.extend( headers, options.headers );
		options.headers = headers;

		if ( ( method === 'create' && Backbone.Tastypie.doGetOnEmptyPostResponse ) ||
			( method === 'update' && Backbone.Tastypie.doGetOnEmptyPutResponse ) ) {
			var dfd = new $.Deferred();

			// Set up 'success' handling
			var success = options.success;
			dfd.done( function( resp, textStatus, xhr ) {
				_.isFunction( success ) && success( resp );
			});

			options.success = function( resp, textStatus, xhr ) {
				// If create is successful but doesn't return a response, fire an extra GET.
				// Otherwise, resolve the deferred (which triggers the original 'success' callbacks).
				if ( !resp && ( xhr.status === 201 || xhr.status === 202 || xhr.status === 204 ) ) { // 201 CREATED, 202 ACCEPTED or 204 NO CONTENT; response null or empty.
					options = _.defaults( {
							url: xhr.getResponseHeader( 'Location' ) || model.url(),
							headers: headers,
							success: dfd.resolve,
							error: dfd.reject
						},
						Backbone.Tastypie.defaultOptions
					);
					return Backbone.ajax( options );
				}
				else {
					return dfd.resolveWith( options.context || options, [ resp, textStatus, xhr ] );
				}
			};

			// Set up 'error' handling
			var error = options.error;
			dfd.fail( function( xhr, textStatus, errorThrown ) {
				_.isFunction( error ) && error( xhr.responseText );
			});

			options.error = function( xhr, textStatus, errorText ) {
				dfd.rejectWith( options.context || options, [ xhr, textStatus, xhr.responseText ] );
			};

			// Create the request, and make it accessibly by assigning it to the 'request' property on the deferred
			dfd.request = Backbone.oldSync( method, model, options );
			return dfd;
		}

		return Backbone.oldSync( method, model, options );
	};

	Backbone.Model.prototype.url = function() {
		// Use the 'resource_uri' if possible
		var url = this.get( 'resource_uri' );

		// If there's no idAttribute, use the 'urlRoot'. Fallback to try to have the collection construct a url.
		// Explicitly add the 'id' attribute if the model has one.
		if ( !url ) {
			url = _.result( this, 'urlRoot' ) || ( this.collection && _.result( this.collection, 'url' ) );

			if ( url && this.has( 'id' ) ) {
				url = addSlash( url ) + this.get( 'id' );
			}
		}

		url = url && addSlash( url );

		return url || null;
	};

	/**
	 * Return the first entry in 'data.objects' if it exists and is an array, or else just plain 'data'.
	 *
	 * @param {object} data
	 */
	Backbone.Model.prototype.parse = function( data ) {
		return data && data.objects && ( _.isArray( data.objects ) ? data.objects[ 0 ] : data.objects ) || data;
	};

	/**
	 * Return 'data.objects' if it exists.
	 * If present, the 'data.meta' object is assigned to the 'collection.meta' var.
	 *
	 * @param {object} data
	 */
	Backbone.Collection.prototype.parse = function( data ) {
		if ( data && data.meta ) {
			this.meta = data.meta;
		}

		return data && data.objects || data;
	};

	/**
	 * Construct a url for the collection, or for a set of models in the collection if the `models` param is used.
	 * Will attempt to use its own `urlRoot` first; if that doesn't yield a result, attempts to use the `urlRoot`
	 * on models in the collection.
	 *
	 * @param {Backbone.Model[]|string[]} [models]
	 */
	Backbone.Collection.prototype.url = function( models ) {
		var url = _.result( this, 'urlRoot' );
		
		// If the collection doesn't specify an url, try to obtain one from a model in the collection
		if ( !url ) {
			var model = this.models.length && this.models[ 0 ];
			url = model && _.result( model, 'urlRoot' );
		}
		
		if ( !url ) {
			url = _.result( this.model.prototype, 'urlRoot' );
		}
		
		url = url && addSlash( url );

		// Build a url to retrieve a set of models. This assume the last part of each model's idAttribute contains
		// the model's id. Will work when idAttribute is set to 'resource_uri' (default), but for a plain 'id' as well.
		if ( models && models.length ) {
			var ids = _.map( models, function( model ) {
				var id = model instanceof Backbone.Model ? model.url() : model,
					parts = _.compact( id.split( '/' ) );
				return parts[ parts.length - 1 ];
			});
			url += Backbone.Tastypie.constructSetUrl( ids );
		}

		return url || null;
	};

	var addSlash = function( str ) {
		return str + ( ( str.length > 0 && str.charAt( str.length - 1 ) === '/' ) ? '' : '/' );
	};
}));
