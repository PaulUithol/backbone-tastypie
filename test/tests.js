// documentation on writing tests here: http://docs.jquery.com/QUnit
// example tests: https://github.com/jquery/qunit/blob/master/test/same.js
// more examples: https://github.com/jquery/jquery/tree/master/test/unit
// jQueryUI examples: https://github.com/jquery/jquery-ui/tree/master/tests/unit

//sessionStorage.clear();
if ( !window.console ) {
	var names = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml',
	'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];
	window.console = {};
	for ( var i = 0; i < names.length; ++i )
		window.console[ names[i] ] = function() {};
}

$(document).ready(function() {
	Backbone.ajax = function( request ) {
		// If a `response` has been defined, execute it. If status < 299, trigger 'success'; otherwise, trigger 'error'
		var response = null,
			prevRequest = _.last( window.requests );

		// Check for a nested response on `prevRequest`. If so, we're handling a follow-up request.
		// Take the nested response from `prevRequest`.
		if ( prevRequest && prevRequest.response && prevRequest.response.response && prevRequest.response.response.status ) {
			response = prevRequest.response.response;
		}
		else if ( request.response && request.response.status ) {
			response = request.response;
		}

		if ( response ) {
			// Define a `getResponseHeader` function on `response`; used in some tests.
			// See https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#getResponseHeader%28%29
			response.getResponseHeader = function( headerName ) {
				return response.headers && response.headers[ headerName ] || null;
			};

			// Add `request` to `window.requests`. After determining if this is a nested response,
			// but before triggering callbacks that will make us end up in this function again.
			window.requests.push( request );

			/**
			 * Trigger success/error with arguments like jQuery would:
			 * // Success/Error
			 * if ( isSuccess ) {
			 *   deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			 * } else {
			 *   deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			 * }
			 */
			if ( response.status >= 200 && response.status < 300 || response.status === 304 ) {
				request.success( response.responseText, 'success', response );
			}
			else {
				request.error( response, 'error', 'error' );
			}
		}
		else {
			window.requests.push( request );
		}

		return request;
	};
	
	var defaultTastypieOptions = $.extend( {}, Backbone.Tastypie );
	
	window.Zoo = Backbone.RelationalModel.extend({
		relations: [{
			type: Backbone.HasMany,
			key: 'animals',
			relatedModel: 'Animal',
			collectionType: 'AnimalCollection',
			reverseRelation: {
				key: 'livesIn'
			}
		}]
	});
	
	window.Animal = Backbone.RelationalModel.extend({
		urlRoot: '/animal' // Missing final '/' on purpose.
	});
	
	window.AnimalCollection = Backbone.Collection.extend({
		urlRoot: '/animal', // Missing final '/' on purpose.
		model: Animal
	});
	
	// Model without a 'urlRoot'
	window.Person = Backbone.RelationalModel.extend({});
	
	function initObjects() {
		Backbone.Tastypie = $.extend( {}, defaultTastypieOptions );

		// Reset last ajax requests
		window.requests = [];
		
		Backbone.Relational.store.reset();
		Backbone.Relational.store.addModelScope( window );
		Backbone.Relational.eventQueue = new Backbone.BlockingQueue();
	}
	
	
	module("Requests", { setup: initObjects } );
	
	
		test( "ApiKey sent as an extra header", function() {
			Backbone.Tastypie.apiKey = {
				username: 'daniel',
				key: '204db7bcfafb2deb7506b89eb3b9b715b09905c8'
			};

			var animal = new Animal( { species: 'Panther' } );
			var response = {
				headers: { 'Location': '/animal/1/' },
				status: 201,
				response: {
					responseText: { id: 1, 'resource_uri': '/animal/1/' },
					status: 200
				}
			};
			
			var dfd = animal.save( null, { response: response } );

			equal( dfd.request.headers[ 'Authorization' ], 'ApiKey daniel:204db7bcfafb2deb7506b89eb3b9b715b09905c8' );
				
			ok( window.requests.length === 2 );
			equal( _.last( window.requests ).headers[ 'Authorization' ], 'ApiKey daniel:204db7bcfafb2deb7506b89eb3b9b715b09905c8' );
			equal( animal.id, '/animal/1/' );
		});

		test( "CSRF token sent as an extra header", function() {
			Backbone.Tastypie.csrfToken = 'J3TxPrDKCIW1z9byQrg0aaHbukYJGEkX';

			var animal = new Animal( { species: 'Panther' } );
			var response = {
				headers: { 'Location': '/animal/1/' },
				status: 201,
				response: {
					responseText: { id: 1, 'resource_uri': '/animal/1/' },
					status: 200
				}
			};

			var dfd = animal.save( null, { response: response } );

			equal( dfd.request.headers[ 'X-CSRFToken' ], 'J3TxPrDKCIW1z9byQrg0aaHbukYJGEkX' );

			ok( window.requests.length === 2 );
			equal( _.last( window.requests ).headers[ 'X-CSRFToken' ], 'J3TxPrDKCIW1z9byQrg0aaHbukYJGEkX' );
		});
	
		test( "Extra GET on creation if the response is empty", 3, function() {
			expect( 3 );
			
			var animal = new Animal( { species: 'Turtle' } );
			var response = {
				headers: { 'Location': '/animal/1/' },
				status: 201,
				response: {
					responseText: { id: 1, 'resource_uri': '/animal/1/' },
					status: 200
				}
			};

			var dfd = animal.save( null, { response: response } );

			dfd.done( function() {
				equal( animal.id, '/animal/1/' );
				equal( animal.get( 'id' ), 1 );
			});

			ok( window.requests.length === 2 );
		});

		test( "No extra 'GET' on creation when 'doGetOnEmptyPostResponse' is false", 2, function() {
			Backbone.Tastypie.doGetOnEmptyPostResponse = false;

			var animal = new Animal( { species: 'Turtle' } );
			var response = {
				headers: { 'Location': '/animal/1/' },
				status: 201
			};

			var request = animal.save( null, {
				response: response,
				success: function() {
					equal( animal.id, null );
				}
			});

			ok( window.requests.length === 1 );
		});

		test( "No extra 'GET' on creation when there is a response", 3, function() {
			var animal = new Animal( { species: 'Turtle' } );
			var response = {
				headers: { 'Location': '/animal/1/' },
				status: 201,
				responseText: { id: 1, 'resource_uri': '/animal/1/' }
			};
			
			var dfd = animal.save( null, { response: response } );
			dfd.done( function() {
				equal( animal.id, '/animal/1/' );
				equal( animal.get( 'id' ), 1 );
			});

			ok( window.requests.length === 1 );
		});

		test( "Extra GET on update if the response is empty, and 'doGetOnEmptyPutResponse' is true", 2, function() {
			Backbone.Tastypie.doGetOnEmptyPutResponse = true;

			var animal = new Animal( { species: 'Turtle', id: 1, 'resource_uri': '/animal/1/' } );
			var response = {
				status: 202,
				response: {
					status: 200,
					responseText: { id: 1, 'resource_uri': '/animal/1/', weight: 500 }
				}
			};

			var dfd = animal.save( null, { response: response } );
			dfd.done( function() {
				equal( animal.get( 'weight' ), 500 );
			});

			ok( window.requests.length === 2 );
		});

		test( "No extra 'GET' on update when there is a response", 2, function() {
			Backbone.Tastypie.doGetOnEmptyPutResponse = true;

			var animal = new Animal( { species: 'Turtle', id: 1, 'resource_uri': '/animal/1/' } );
			var response = {
				status: 202,
				responseText: { id: 1, 'resource_uri': '/animal/1/', weight: 500 }
			};

			var dfd = animal.save( null, { response: response } );
			dfd.done( function() {
				equal( animal.get( 'weight' ), 500 );
			});

			ok( window.requests.length === 1 );
		});

		test( "No extra 'GET' on update when 'doGetOnEmptyPutResponse' is false", 2, function() {
			var animal = new Animal( { species: 'Turtle', id: 1, 'resource_uri': '/animal/1/' } );
			var response = {
				status: 204
			};

			var request = animal.save( { weight: 100 }, {
				response: response,
				success: function() {
					equal( animal.get( 'weight' ), 100 );
				}
			});

			ok( window.requests.length === 1 );
		});

		test( "Success callbacks are triggered, receive proper parameters", 18, function() {
			/**
			 * Case 1: request with an immediate response
 			 */
			var animal = new Animal( { species: 'Turtle' } );

			var response = {
				responseText: { id: 1, 'resource_uri': '/animal/1/' },
				status: 201
			};

			var success = function( model, resp, options ) {
				ok( model instanceof Backbone.Model );
				equal( model.id, '/animal/1/' );

				equal( resp.id, 1 );

				ok( _.isObject( options ) );
				equal( options.response, response );
			};

			var dfd = animal.save( null, { success: success, response: response } );

			// Add 'success' callback to the Deferred
			dfd.done( function( resp, textStatus, xhr ) {
				equal( resp.id, 1, "resp.id is 1" );

				equal( textStatus, 'success', "Status is 'success'" );

				ok( _.isObject( xhr ) );
				equal( xhr.status, 201, "Status is 201" );
			});


			/**
			 * Case 2: request without a response right away, response in second request
 			 */
			animal = new Animal( { species: 'Lion' } );

			response = {
				headers: { 'Location': '/animal/2/' },
				status: 201,
				response: {
					responseText: { id: 2, 'resource_uri': '/animal/2/' },
					status: 200
				}
			};

			success = function( model, resp, options ) {
				ok( model instanceof Backbone.Model );
				equal( model.id, '/animal/2/' );

				equal( resp.id, 2 );

				ok( _.isObject( options ) );
				equal( options.response, response );
			};

			dfd = animal.save( null, { success: success, response: response } );
			// Add 'success' callback to the Deferred
			dfd.done( function( resp, textStatus, xhr ) {
				equal( resp.id, 2, "resp.id is 2" );

				equal( textStatus, 'success', "Status is 'success'" );

				ok( _.isObject( xhr ) );
				equal( xhr.status, 200, "Status is 200" );
			});
		});
		
		test( "Error callbacks are triggered, receive proper parameters", 8, function() {
			/**
			 * Case 1: request with an immediate response
			 */
			var animal = new Animal( { species: 'Turtle' } );

			var response = {
				responseText: { code: 100 },
				status: 500
			};

			var error = function( model, resp, options ) {
				ok( model instanceof Backbone.Model );

				equal( resp.code, 100 );

				ok( _.isObject( options ) );
				equal( options.response, response );
			};

			var dfd = animal.save( null, { error: error, response: response } );

			// Add 'error' callback to the Deferred
			dfd.done( function( resp, textStatus, xhr ) {
				equal( resp.code, 100 );

				equal( textStatus, 'error', "Status is 'error'" );

				ok( _.isObject( xhr ) );
				equal( xhr.status, 500, "Status is 500" );
			});


			/**
			 * Case 2: request without a response right away, response in second request
			 */
			animal = new Animal( { species: 'Lion' } );

			response = {
				headers: { 'Location': '/animal/2/' },
				status: 201,
				response: {
					responseText: { code: 600 },
					status: 404
				}
			};

			error = function( model, resp, options ) {
				ok( model instanceof Backbone.Model );

				equal( resp.code, 600 );

				ok( _.isObject( options ) );
				equal( options.response, response );
			};

			dfd = animal.save( null, { error: error, response: response } );
			// Add 'success' callback to the Deferred
			dfd.done( function( resp, textStatus, xhr ) {
				equal( resp.code, 600 );

				equal( textStatus, 'error', "Status is 'error'" );

				ok( _.isObject( xhr ) );
				equal( xhr.status, 404, "Status is 404" );
			});
		});
		
		test( "defaultOptions are set", function() {
			Backbone.Tastypie.defaultOptions = {
				crossDomain: false,
				timeout: 42
			};

			var animal = new Animal( { species: 'Leopard' } );
			var response = {
				headers: { 'Location': '/animal/2/' },
				status: 201,
				response: {
					responseText: { id: 1, 'resource_uri': '/animal/2/' },
					status: 200
				}
			};

			var dfd = animal.save( null, { response: response } );

			equal( dfd.request.timeout, 42 );

			ok( window.requests.length === 2 );
			equal( _.last( window.requests ).timeout, 42 );
		});
	
	
	module( "Model url building", { setup: initObjects } );
	
	
		test( "Model url", function() {
			var person = new Person();
			equal( person.url(), null );

			// If the model doesn't have an 'urlRoot' and no value for it's 'idAttribute', the collection's
			// 'urlRoot' is be used as a fallback ( a POST there creates a resource).
			var coll = new Backbone.Collection();
			coll.urlRoot = '/persons';
			person.collection = coll;
			equal( person.url(), '/persons/' );

			// The value of the explicit 'id' attribute is added to the 'urlRoot' when available
			person.set( 'id', 2 );
			equal( person.url(), '/persons/2/' );
			
			// If present, the model's urlRoot is used as a fallback.
			person.urlRoot = '/person';
			equal( person.url(), '/person/2/' );

			// Model's urlRoot should work as a function.
			person.urlRoot = function() { return "/person"; };
			equal( person.url(), '/person/2/' );

			// If the idAttribute is set, it's used as the uri verbatim.
			person.set( { resource_uri: '/person/1/' } );
			equal( person.url(), '/person/1/' );
		});
	
	
	module( "Collection url building", { setup: initObjects } );
	
	
		test( "Url for a set by the collection", function() {
			var zoo = new Zoo();
			zoo.set({
				animals: [
					{ species: 'Lion', resource_uri: '/api/v1/animal/1/' },
					{ species: 'Zebra', resource_uri: '/api/v1/animal/2/' }
				]
			});
			
			var coll = zoo.get( 'animals' );
			
			var url = coll.url();
			ok( url === '/animal/' );
			
			url = coll.url( coll.models );
			ok( url === '/animal/set/1;2/' );
		});
});
