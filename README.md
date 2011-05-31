# Backbone-tastypie
A small conversion layer to make [backbone.js](https://github.com/documentcloud/backbone) and [django-tastypie](https://github.com/toastdriven/django-tastypie) work together happily.

Specifically, it overrides `Backbone.sync` to do a GET request after creating an object, and overrides `Backbone.Model.prototype.idAttribute`, `Backbone.Model.prototype.url`, `Backbone.Model.prototype.parse` and `Backbone.Collection.prototype.parse`.