# Backbone-tastypie
A small conversion layer to make [backbone.js](https://github.com/documentcloud/backbone) work together happily with
[django-tastypie](https://github.com/toastdriven/django-tastypie). Other REST APIs conforming to the same style are
also compatible. See for example [TastyMongo](https://github.com/ProgressiveCompany/TastyMongo).

Backbone-tastypie is available under the [MIT license](https://github.com/PaulUithol/backbone-tastypie/blob/master/LICENSE.txt).

Backbone-tastypie depends on [Backbone](https://github.com/documentcloud/backbone) (1.0.0 or newer),
and thus on [Underscore](https://github.com/documentcloud/underscore) (1.4.4 or newer).

## Contents

* [Installation](#installation)
* [How it works](#how-it-works)
* [Settings](#settings)
* [Methods](#methods)

## Installation

Add `backbone_tastypie` to your `INSTALLED_APPS` setting, and add the following to your base template:

```html
<script type="text/javascript" src="{{ STATIC_URL }}js/underscore.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/backbone.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/backbone-tastypie.js"></script>
```

## How it works

Backbone-tastypie overrides several Backbone methods for compatibility with django-tastypie. These mainly have to do
with `Backbone.sync`, building urls for models and collections, and parsing data.

## Settings

Backbone-tastypie supports several global API settings in the `Backbone.Tastypie` namespace.

##### doGetOnEmptyPostResponse

Default: `true`

By default, Tastypie doesn't return data after a `POST`. Enabling this setting performs an extra `GET` request to fetch
new data for the newly created model from the server. If you have control over the server, you can also enable the
[always-return-data](http://django-tastypie.readthedocs.org/en/latest/resources.html#always-return-data)
option on your (Model)Resources.

##### doGetOnEmptyPutResponse

Default: `false`

By default, Tastypie doesn't return data after a `PUT`. Enabling this setting performs an extra `GET` request to fetch
new data for the updated model from the server. If you have control over the server, you can also enable the
[always-return-data](http://django-tastypie.readthedocs.org/en/latest/resources.html#always-return-data)
option on your (Model)Resources.

##### apiKey

An object containing a `username` and a `key`.

##### csrfToken

Set the current csrf token. See https://docs.djangoproject.com/en/dev/ref/contrib/csrf/#ajax. You can also load the
value from a cookie like this (provided you have the jQuery.cookie plugin installed):

```javascript
Backbone.Tastypie.csrfToken = $.cookie( 'csrftoken' );
```

## Methods

##### Backbone.sync

`Backbone.sync` is overridden to perform an additional `GET` request if there is no response body after creating an object
(see `doGetOnEmptyPostResponse`), or after updating an object (see `doGetOnEmptyPutResponse`).

##### Backbone.Model.prototype.url

##### Backbone.Model.prototype.parse

##### Backbone.Collection.prototype.parse

##### Backbone.Collection.prototype.url

`Backbone.Collection.prototype.url` is overridden so it can build urls for a set of models. This is for example useful
when using the `fetchRelated` method in [Backbone-relational](https://github.com/PaulUithol/Backbone-relational/).
