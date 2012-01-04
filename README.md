# Backbone-tastypie-amd

This is fork of [Paul Uithol's](https://github.com/documentcloud/backbone) great [backbone-tastypie](https://github.com/PaulUithol/backbone-tastypie) conversion layer to make [backbone.js](https://github.com/documentcloud/backbone) and [django-tastypie](https://github.com/toastdriven/django-tastypie) work together happily.

This fork adds AMD support so you can load backbone-tastypie.js using a require library like [requirejs](http://requirejs.org/).

## Requirements

This software assumes you are using the [AMD optimised version of backbone](https://github.com/jrburke/backbone/tree/optamd3). This is required because backbone-tastypie-amd will rely on backbone being a registered module with its own requirements (such as underscore) defined.

## Usage

1. Add `backbone_tastypie` to your `INSTALLED_APPS` setting.
2. Ensure that your main.js knows the paths of backbone (the AMD optimised version!) and backbone-tastypie. For example:

`require.config({
	paths: {
		"backbone": "/static/js/backbone",
		"backbone-tastypie": "/static/js/backbone-tastypie"
	}
});`

3. When you need backbone-tastypie simply call:

`require(["backbone-tastypie"],function(Backbone) {
	// This code loads when backbone-tastypie and all of its dependencies are loaded.
	// The local backbone variable is the modified backbone-tastypie one.
	// If you want vinalla backbone, you can just change ["backbone-tastypie"] to ["backbone"]!
})`
