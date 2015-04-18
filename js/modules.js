/*global angular, PouchDB, Markdown, emit, sum*/
/*jslint nomen: true*/

angular.module('MDConverter', []).
  value('MDConverter', new Markdown.Converter());

angular.module('Pouch', []).
  value('alreadySetDDocs', {
    global: false,
    local: false
  }).
  constant('PouchDBDDocs', [{
    _id: '_design/traenke',
    views: {
      traenke: {
        map: function (doc) {
          if (doc.type === 'trank') {
            emit(doc.name, doc.zutaten.length);
          }
        }.toString()
      }
    }
  }, {
    _id: '_design/zutaten', 
    views: {
      zutaten: {
        map: function (doc) {
          if (doc.type === 'zutat') {
            emit();
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }, {
    _id: '_design/zutatenByTraenke',
    views: {
      zutatenByTraenke: {
        map: function (doc) {
          var i;
          if (doc.type === 'trank') {
            for (i = 0; i < doc.zutaten.length; i += 1) {
              emit(doc.zutaten[i]);
            }
          }
        }.toString(),
        reduce: '_count'
      },
    }
  }, {
    _id: '_design/wirkungen',
    views: {
      wirkungen: {
        map: function (doc) {
          if (doc.type === 'zutat') {
            for (var i = 0; i < doc.wirkungen.length; i += 1) {
              emit(doc.wirkungen[i], doc._id);
            }
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }]).
  factory('PDB', function (PouchDBDDocs, alreadySetDDocs) {
    'use strict';
    var controller = {};
    controller.dbName = 'avalon2';
    controller.globalUrl = 'http://localhost:5984/';
    controller.dbStatus = 'local';

    //Ensure, that the DDocs exist
    function ensureDDocs() {
      if (!alreadySetDDocs[controller.dbStatus]) {
        alreadySetDDocs[controller.dbStatus] = true;
        PouchDBDDocs.forEach(function (item) {
          controller.db.get(item._id).then(function (info) {
            console.log(info);
          }).catch(function (err) {
            if (err.status === 404) {
              controller.db.put(item).then(function (info) {
                controller.db.query(item._id.substr(8),
                  {stale: 'update_after'});
                console.log(info);
              }).catch(function (err) {
                console.error(err);
              });
            }
          });
        });
      }
    }

    controller.switchToLocal = function () {
      controller.db = controller.getLocalDB();
      controller.dbStatus = 'local';
      ensureDDocs();
    };
    controller.switchToGlobal = function () {
      controller.db = controller.getGlobalDB();
      controller.dbStatus = 'global';
      controller.changes = controller.db.changes({
        since: 'now',
        live: true
      });
      ensureDDocs();
    };

    controller.getGlobalDB = function () {
      return new PouchDB(controller.globalUrl + controller.dbName);
    };
    controller.getLocalDB = function () {
      return new PouchDB(controller.dbName);
    };

    // for debugging reason
    controller.switchToGlobal();

    return controller;
  });
