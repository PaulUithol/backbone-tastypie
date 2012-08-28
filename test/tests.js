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
	$.ajax = function( obj ) {
		window.requests.push( obj );
		return obj;
	};
	
	Zoo = Backbone.RelationalModel.extend({
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
	
	Animal = Backbone.RelationalModel.extend({
		urlRoot: '/animal' // Missing final '/' on purpose.
	});
	
	AnimalCollection = Backbone.Collection.extend({
		urlRoot: '/animal', // Missing final '/' on purpose.
		model: Animal
	});
	
	// Model without a 'urlRoot'
	Person = Backbone.RelationalModel.extend({});
	
	function initObjects() {
		Backbone.Tastypie = {
			doGetOnEmptyPostResponse: true,
			doGetOnEmptyPutResponse: false,
			apiKey: {
				username: '',
				key: ''
			},
			csrfToken: ''
		};

		// Reset last ajax requests
		window.requests = [];
		
		// save _reverseRelations, otherwise we'll get a lot of warnings about existing relations
		var oldReverseRelations = Backbone.Relational.store._reverseRelations;
		Backbone.Relational.store = new Backbone.Store();
		Backbone.Relational.store._reverseRelations = oldReverseRelations;
		Backbone.Relational.eventQueue = new Backbone.BlockingQueue();
	}
	
	
	module("Requests", { setup: initObjects } );
	
	
		test( "ApiKey sent as an extra header", function() {
			Backbone.Tastypie.apiKey = {
				username: 'daniel',
				key: '204db7bcfafb2deb7506b89eb3b9b715b09905c8'
			};

			var animal = new Animal( { species: 'Panther' } );
			var emptyResponse = '';
			var response = { id: 1, 'resource_uri': '/animal/1/' };
			var xhr = { status: 201, getResponseHeader: function() { return '/animal/1/'; } };
			
			var dfd = animal.save();

			equal( dfd.request.headers[ 'Authorization' ], 'ApiKey daniel:204db7bcfafb2deb7506b89eb3b9b715b09905c8' );
			
				// Do the server's job; trigger the success callbacks
				var secondRequest = dfd.request.success( emptyResponse, 'created', xhr );
				secondRequest.success( response, 'get', { status: 200 } );
				
			ok( window.requests.length === 2 );
			equal( secondRequest.headers[ 'Authorization' ], 'ApiKey daniel:204db7bcfafb2deb7506b89eb3b9b715b09905c8' );
		});

		test( "CSRF token sent as an extra header", function() {
			Backbone.Tastypie.csrfToken = 'J3TxPrDKCIW1z9byQrg0aaHbukYJGEkX'

			var animal = new Animal( { species: 'Panther' } );
			var emptyResponse = '';
			var response = { id: 1, 'resource_uri': '/animal/1/' };
			var xhr = { status: 201, getResponseHeader: function() { return '/animal/1/'; } };
			
			var dfd = animal.save();

			equal( dfd.request.headers[ 'X-CSRFToken' ], 'J3TxPrDKCIW1z9byQrg0aaHbukYJGEkX' );
			
				// Do the server's job; trigger the success callbacks
				var secondRequest = dfd.request.success( emptyResponse, 'created', xhr );
				secondRequest.success( response, 'get', { status: 200 } );
				
			ok( window.requests.length === 2 );
			equal( secondRequest.headers[ 'X-CSRFToken' ], 'J3TxPrDKCIW1z9byQrg0aaHbukYJGEkX' );
		});
	
		test( "Extra GET on creation if the response is empty", function() {
			expect( 3 );
			
			var animal = new Animal( { species: 'Turtle' } );
			var emptyResponse = '';
			var response = { id: 1, 'resource_uri': '/animal/1/' };
			var xhr = { status: 201, getResponseHeader: function() { return '/animal/1/'; } };
			
			var dfd = animal.save();
			dfd.done( function() {
				equal( animal.id, '/animal/1/' );
				equal( animal.get( 'id' ), 1 );
			});
			
				// Do the server's job; trigger the success callbacks
				var secondRequest = dfd.request.success( emptyResponse, 'created', xhr );
				secondRequest.success( response, 'get', { status: 200 } );

			ok( window.requests.length === 2 );
		});

		test( "No extra 'GET' on creation when 'doGetOnEmptyPostResponse' is false", function() {
			expect( 2 );

			Backbone.Tastypie.doGetOnEmptyPostResponse = false;

			var animal = new Animal( { species: 'Turtle' } );
			var xhr = { status: 201, getResponseHeader: function() { return '/animal/1/'; } };

			var request = animal.save( {}, {
				success: function() {
					equal( animal.id, null );
				}
			});

				// Do the server's job
				request.success( '', 'created', xhr );

			ok( window.requests.length === 1 );
		});

		test( "No extra 'GET' on creation when there is a response", function() {
			expect( 3 );
			
			var animal = new Animal( { species: 'Turtle' } );
			var response = { id: 1, 'resource_uri': '/animal/1/' };
			var xhr = { status: 201, getResponseHeader: function() { return '/animal/1/'; } };
			
			var dfd = animal.save();
			dfd.done( function() {
				equal( animal.id, '/animal/1/' );
				equal( animal.get( 'id' ), 1 );
			});
			
				// Do the server's job
				dfd.request.success( response, 'created', xhr );

			ok( window.requests.length === 1 );
		});

		test( "Extra GET on update if the response is empty, and 'doGetOnEmptyPutResponse' is true", function() {
			expect( 2 );

			Backbone.Tastypie.doGetOnEmptyPutResponse = true;

			var animal = new Animal( { species: 'Turtle', id: 1, 'resource_uri': '/animal/1/' } );
			var emptyResponse = '';
			var response = { id: 1, 'resource_uri': '/animal/1/', weight: 500 };
			var xhr = { status: 202, getResponseHeader: function() { return null; } };

			var dfd = animal.save();
			dfd.done( function() {
				equal( animal.get( 'weight' ), 500 );
			});

				// Do the server's job
				var secondRequest = dfd.request.success( emptyResponse, 'created', xhr );
				secondRequest.success( response, 'get', { status: 200 } );

			ok( window.requests.length === 2 );
		});

		test( "No extra 'GET' on update when there is a response", function() {
			expect( 1 );

			Backbone.Tastypie.doGetOnEmptyPutResponse = true;

			var animal = new Animal( { species: 'Turtle', id: 1, 'resource_uri': '/animal/1/' } );
			var response = { id: 1, 'resource_uri': '/animal/1/', weight: 500 };
			var xhr = { status: 204, getResponseHeader: function() { return null; } };

			var dfd = animal.save();

				// Do the server's job
				dfd.request.success( response, 'created', xhr );

			ok( window.requests.length === 1 );
		});

		test( "No extra 'GET' on update when 'doGetOnEmptyPutResponse' is false", function() {
			expect( 1 );

			var animal = new Animal( { species: 'Turtle', id: 1, 'resource_uri': '/animal/1/' } );
			var xhr = { status: 204, getResponseHeader: function() { return null; } };

			var request = animal.save( {}, {
				success: function() {
					equal( animal.get( 'weight' ), null );
				}
			});

				// Do the server's job
				request.success( '', 'created', xhr );
		});

		test( "Success callbacks are triggered, receive proper parameters", function() {
			expect( 6 );
			
			var emptyResponse = '';
			var response = { id: 1, 'resource_uri': '/animal/1/' };
			var xhr = { status: 201, getResponseHeader: function() { return '/animal/1/'; } };
			
			var successCallback = function( model, resp, xhr ) {
				equal( resp.id, 1 );
				equal( model.id, '/animal/1/' );
			};
			
			// Request with a response
			var animal = new Animal( { species: 'Turtle' } );
			var dfd = animal.save( null, { success: successCallback } );
			// Add another 'success' callback
			dfd.done( function() {
				ok( true, "Done triggered" );
			});
			
				// Do the server's job
				dfd.request.success( response, 'created', xhr );
			
			// Request without a response right away, response in second request
			animal = new Animal( { species: 'Lion' } );
			dfd = animal.save( null, { success: successCallback } );
			// Add another 'success' callback
			dfd.done( function() {
				ok( true, "Done triggered" );
			});
			
				// Do the server's job
				var secondRequest = dfd.request.success( emptyResponse, 'created', xhr );
				secondRequest.success( response, 'get', { status: 200 } );
		});
		
		test( "Error callbacks are triggered, receive proper parameters", function() {
			expect( 2 );
			
			var xhr = { status: 404 };
			
			var errorCallback = function( model, resp, options ) {
				equal( resp.status, 404 );
			};
			
			// Request with a response
			var animal = new Animal( { species: 'Turtle' } );
			var dfd = animal.save( null, { error: errorCallback } );
			// Add another 'error' callback
			dfd.fail( function() {
				ok( true, "Fail triggered" );
			});
			
				// Do the server's job
				dfd.request.error( xhr, 'error', 'Not found' );
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