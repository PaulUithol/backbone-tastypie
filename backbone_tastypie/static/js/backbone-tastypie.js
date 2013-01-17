/**
 * Backbone-tastypie.js 0.2
 * (c) 2011 Paul Uithol
 * 
 * Backbone-tastypie may be freely distributed under the MIT license.
 * Add or override Backbone.js functionality, for compatibility with django-tastypie.
 * Depends on Backbone (and thus on Underscore as well): https://github.com/documentcloud/backbone.
 */
(function( undefined ) {
	"use strict";

	// Backbone.noConflict support. Save local copy of Backbone object.
	var Backbone;

	// CommonJS shim
	if ( typeof window === 'undefined' ) {
		Backbone = require( 'backbone' );
	}
	else {
		Backbone = window.Backbone;
	}

	Backbone.Tastypie = {
		doGetOnEmptyPostResponse: true,
		doGetOnEmptyPutResponse: false,
		apiKey: {
			username: '',
			key: ''
		},
		csrfToken: ''
	};

	/**
	 * Override Backbone's sync function, to do a GET upon receiving a HTTP CREATED.
	 * This requires 2 requests to do a create, so you may want to use some other method in production.
	 * Modified from http://joshbohde.com/blog/backbonejs-and-django
	 */
	Backbone.oldSync = Backbone.sync;
	Backbone.sync = function( method, model, options ) {
		if ( Backbone.Tastypie.apiKey && Backbone.Tastypie.apiKey.username.length ) {
			options.headers = _.extend( {
				'Authorization': 'ApiKey ' + Backbone.Tastypie.apiKey.username + ':' + Backbone.Tastypie.apiKey.key
			}, options.headers );
		}

		if ( Backbone.Tastypie.csrfToken ) {
			options.headers = _.extend( {
				'X-CSRFToken': Backbone.Tastypie.csrfToken 
			}, options.headers );
		}

		if ( ( method === 'create' && Backbone.Tastypie.doGetOnEmptyPostResponse ) ||
			( method === 'update' && Backbone.Tastypie.doGetOnEmptyPutResponse ) ) {
			var dfd = new $.Deferred();
			
			// Set up 'success' handling
			dfd.done( options.success );

			options.success = function( model, resp, options ) {
				// If create is successful but doesn't return a response, fire an extra GET.
				// Otherwise, resolve the deferred (which triggers the original 'success' callbacks).
				var status = options.xhr.status;
				if ( !resp && ( status === 201 || status === 202 || status === 204 ) ) { // 201 CREATED, 202 ACCEPTED or 204 NO CONTENT; response null or empty.
					var location = options.xhr.getResponseHeader( 'Location' ) || model.id;
					return Backbone.ajax({
						url: location,
						headers: options.headers,
						success: function( data, textStatus, jqXHR ) {
							return dfd.resolveWith( options.context || options, [ model, data, options ] );
						},
						error: function( jqXHR, textStatus, errorThrown ) {
							return dfd.rejectWith( options.context || options, [ model, jqXHR, options ] );
						}
					});
				}
				else {
					return dfd.resolveWith( options.context || options, [ model, resp, options ] );
				}
			};
			
			// Set up 'error' handling
			dfd.fail( options.error );

			options.error = function( model, xhr, options ) {
				dfd.rejectWith( options.context || options, [ model, xhr, options ] );
			};
			
			// Make the request, make it accessibly by assigning it to the 'request' property on the deferred
			dfd.request = Backbone.oldSync( method, model, options );
			return dfd;
		}
		
		return Backbone.oldSync( method, model, options );
	};

	Backbone.Model.prototype.idAttribute = 'resource_uri';
	
	Backbone.Model.prototype.url = function() {
		// Use the id if possible
		var url = this.id;
		
		// If there's no idAttribute, use the 'urlRoot'. Fallback to try to have the collection construct a url.
		// Explicitly add the 'id' attribute if the model has one.
		if ( !url ) {
			url = _.isFunction( this.urlRoot ) ? this.urlRoot() : this.urlRoot;
			url = url || this.collection && ( _.isFunction( this.collection.url ) ? this.collection.url() : this.collection.url );

			if ( url && this.has( 'id' ) ) {
				url = addSlash( url ) + this.get( 'id' );
			}
		}

		url = url && addSlash( url );
		
		return url || null;
	};
	
	/**
	 * Return the first entry in 'data.objects' if it exists and is an array, or else just plain 'data'.
	 */
	Backbone.Model.prototype.parse = function( data ) {
		return data && data.objects && ( _.isArray( data.objects ) ? data.objects[ 0 ] : data.objects ) || data;
	};
	
	/**
	 * Return 'data.objects' if it exists.
	 * If present, the 'data.meta' object is assigned to the 'collection.meta' var.
	 */
	Backbone.Collection.prototype.parse = function( data ) {
		if ( data && data.meta ) {
			this.meta = data.meta;
		}
		
		return data && data.objects;
	};
	
	Backbone.Collection.prototype.url = function( models ) {
		var url = _.isFunction( this.urlRoot ) ? this.urlRoot() : this.urlRoot;
		// If the collection doesn't specify an url, try to obtain one from a model in the collection
		if ( !url ) {
			var model = models && models.length && models[ 0 ];
			url = model && ( _.isFunction( model.urlRoot ) ? model.urlRoot() : model.urlRoot );
		}
		url = url && addSlash( url );
		
		// Build a url to retrieve a set of models. This assume the last part of each model's idAttribute
		// (set to 'resource_uri') contains the model's id.
		if ( models && models.length ) {
			var ids = _.map( models, function( model ) {
					var parts = _.compact( model.id.split( '/' ) );
					return parts[ parts.length - 1 ];
				});
			url += 'set/' + ids.join( ';' ) + '/';
		}
		
		return url || null;
	};

	var addSlash = function( str ) {
		return str + ( ( str.length > 0 && str.charAt( str.length - 1 ) === '/' ) ? '' : '/' );
	};
})();
