# Backbone-tastypie
A small conversion layer to make [backbone.js](https://github.com/documentcloud/backbone) and [django-tastypie](https://github.com/toastdriven/django-tastypie) work together happily.

## Usage
Add `django_tastypie` to your `INSTALLED_APPS` setting, and add the following to your base template:
`<script type="text/javascript" src="{{ STATIC_URL }}js/backbone-tastypie.js"></script>`

## How it works
Specifically, it overrides `Backbone.sync` to do a GET request after creating an object (if there is no response body), and overrides `Backbone.Model.prototype.idAttribute`, `Backbone.Model.prototype.url`, `Backbone.Model.prototype.parse` and `Backbone.Collection.prototype.parse`.

`Backbone.Collection.prototype.url` is overridden so it can build urls for a set of models when using the `fetchRelated` method in  [Backbone-relational](https://github.com/PaulUithol/Backbone-relational/).