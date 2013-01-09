/**
 * Backbone-tastypie.js 0.1
 * (c) 2011 Paul Uithol
 * 
 * Backbone-tastypie may be freely distributed under the MIT license.
 * Add or override Backbone.js functionality, for compatibility with django-tastypie.
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
		var headers = '';
	
		if ( Backbone.Tastypie.apiKey && Backbone.Tastypie.apiKey.username.length ) {
			headers = _.extend( {
				'Authorization': 'ApiKey ' + Backbone.Tastypie.apiKey.username + ':' + Backbone.Tastypie.apiKey.key
			}, options.headers );
			options.headers = headers;
		}

		if ( Backbone.Tastypie.csrfToken && Backbone.Tastypie.csrfToken.length ) {
			headers = _.extend( {
				'X-CSRFToken': Backbone.Tastypie.csrfToken 
			}, options.headers );
			options.headers = headers;		
		}

		if ( ( method === 'create' && Backbone.Tastypie.doGetOnEmptyPostResponse ) ||
			( method === 'update' && Backbone.Tastypie.doGetOnEmptyPutResponse ) ) {
			var dfd = new $.Deferred();
			
			// Set up 'success' handling
			dfd.done( options.success );
			options.success = function( resp, status, xhr ) {
				// If create is successful but doesn't return a response, fire an extra GET.
				// Otherwise, resolve the deferred (which triggers the original 'success' callbacks).
				if ( !resp && ( xhr.status === 201 || xhr.status === 202 || xhr.status === 204 ) ) { // 201 CREATED, 202 ACCEPTED or 204 NO CONTENT; response null or empty.
					var location = xhr.getResponseHeader( 'Location' ) || model.id;
					return $.ajax( {
						   url: location,
						   headers: headers,
						   success: dfd.resolve,
						   error: dfd.reject
						});
				}
				else {
					return dfd.resolveWith( options.context || options, [ resp, status, xhr ] );
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
			model = models && models.length && models[ 0 ];
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
	}

	/**
	 * Fetch the next page of a tastypie paged response based on the
	 * offest, limit and total_count attributes of the respone's meta.
	 */
	Backbone.Collection.prototype.fetchNext = function( options ) {
	    options = options || {};

	    var filters = {};

	    if(!this.meta) {
		throw "Fetch hasn't been called or there was no meta in the response from tastypie"
	    }

	    // Get the limit and calculate the offset from the meta
	    filters.limit = this.meta.limit;
	    filters.offset = this.meta.offset + this.meta.limit;

	    // Reach the end of the list
	    // TODO Change this to not do anything
	    if (filters.offset > this.meta.total_count) {
		filters.offset = this.meta.total_count;
		throw "End of the list. No more items."
	    }

	    // Create options.data if necessary and extend it with the filters
	    options.data = options.data || {};
	    _.extend(options.data, filters);

	    // Call the regular fetch with the new options
	    return this.fetch.call(this, options);
	};
})();
