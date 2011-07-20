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
		// Reset last ajax requests
		window.requests = [];
		
		// save _reverseRelations, otherwise we'll get a lot of warnings about existing relations
		var oldReverseRelations = Backbone.Relational.store._reverseRelations;
		Backbone.Relational.store = new Backbone.Store();
		Backbone.Relational.store._reverseRelations = oldReverseRelations;
		Backbone.Relational.eventQueue = new Backbone.BlockingQueue();
	}
	
	
	module("Model creation", { setup: initObjects } );
	
	
		test("Two requests on creation (when the response is empty)", function() {
			var animal = new Animal( { species: 'Turtle' } );
			var response = { objects: { id: 1, 'resource_uri': '/animal/1/' } };
			
			var dfd = animal.save();
			var secondRequest = dfd.request.success( '', 'created', { status: 201, getResponseHeader: function() { return '/animal/1/'; } } );
			
			var result = secondRequest.success[0]( response, 'get', { status: 200 } );
			secondRequest.success[1]( response, 'get', { status: 200 } );
			
			ok( animal.get('id') === 1 );
		});
		
		test("No extra 'GET' on creation when there is a response", function() {
			var animal = new Animal( { species: 'Turtle' } );
			var response = { objects: { id: 1, 'resource_uri': '/animal/1/' } };
			
			var dfd = animal.save();
			var result = dfd.request.success( response, 'created', { status: 201, getResponseHeader: function() { return '/animal/1/'; } } );
			
			ok( animal.get('id') === 1 );
		});
	
	
	module("Model url building", { setup: initObjects } );
	
	
		test("Model url", function() {
			var person = new Person();
			
			var url = person.url();
			ok ( url == null );
			
			person.urlRoot = '/person';
			
			url = person.url();
			ok ( url == '/person/' );
			
			var coll = new Backbone.Collection();
			coll.urlRoot = '/persons';
			person.collection = coll;
			
			url = person.url();
			ok ( url == '/persons/' );
			
			person.set( { resource_uri: '/person/1/' } );
			
			url = person.url();
			ok ( url == '/person/1/' );
		});
	
	
	module("Collection url building", { setup: initObjects } );
	
	
		test("Url for a set by the collection", function() {
			var zoo = new Zoo();
			zoo.set({
				animals: [
					{ species: 'Lion', resource_uri: '/api/v1/animal/1/' },
					{ species: 'Zebra', resource_uri: '/api/v1/animal/2/' }
				]
			});
			
			var coll = zoo.get('animals');
			
			var url = coll.url();
			ok( url === '/animal/' );
			
			url = coll.url( coll.models );
			ok( url === '/animal/set/1;2/' );
		});
});