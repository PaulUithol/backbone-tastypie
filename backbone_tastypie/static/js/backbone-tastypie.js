/**
 * Backbone-tastypie.js 0.1
 * (c) 2011 Paul Uithol
 * 
 * Backbone-tastypie may be freely distributed under the MIT license.
 * Add or override Backbone.js functionality, for compatibility with django-tastypie.
 */
(function( undefined ) {
	var Backbone = this.Backbone;
	
	/**
	 * Override Backbone's sync function, to do a GET upon receiving a HTTP CREATED.
	 * This requires 2 requests to do a create, so you may want to use some other method in production.
	 * Modified from http://joshbohde.com/blog/backbonejs-and-django
	 */
	Backbone.oldSync = Backbone.sync;
	Backbone.sync = function( method, model, options ) {
		if ( method === 'create' ) {
			var dfd = new $.Deferred();
			
			// Set up 'success' handling
			dfd.done( options.success );
			options.success = function( resp, status, xhr ) {
				// If create is successful but doesn't return a response, fire an extra GET.
				// Otherwise, resolve the deferred (which triggers the original 'success' callbacks).
				if ( xhr.status === 201 && !resp ) { // 201 CREATED; response null or empty.
					var location = xhr.getResponseHeader( 'Location' );
					return $.ajax( {
						   url: location,
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
			options.error = dfd.reject;
			
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
		
		// If there's no idAttribute, try to have the collection construct a url. Fallback to 'urlRoot'.
		if ( !url ) {
			url = this.collection && ( _.isFunction( this.collection.url ) ? this.collection.url() : this.collection.url );
			url = url || this.urlRoot;
		}
		
		url && ( url += ( url.length > 0 && url.charAt( url.length - 1 ) === '/' ) ? '' : '/' );
		
		return url;
	};
	
	/**
	 * Return 'data.objects' if it exists and is an array, or else just plain 'data'.
	 */
	Backbone.Model.prototype.parse = function( data ) {
		return data && data.objects && ( _.isArray( data.objects ) ? data.objects[ 0 ] : data.objects ) || data;
	};
	
	Backbone.Collection.prototype.parse = function( data ) {
		return data && data.objects;
	};
	
	Backbone.Collection.prototype.url = function( models ) {
		var url = this.urlRoot || ( models && models.length && models[0].urlRoot );
		url && ( url += ( url.length > 0 && url.charAt( url.length - 1 ) === '/' ) ? '' : '/' );
		
		// Build a url to retrieve a set of models. This assume the last part of each model's idAttribute
		// (set to 'resource_uri') contains the model's id.
		if ( models && models.length ) {
			var ids = _.map( models, function( model ) {
					var parts = _.compact( model.id.split('/') );
					return parts[ parts.length - 1 ];
				});
			url += 'set/' + ids.join(';') + '/';
		}
		
		return url;
	};
})();
