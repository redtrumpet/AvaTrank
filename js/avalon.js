/*global angular, console, $ */
/*jslint nomen:true*/

// for debugging
function outputCallback(err, data) {
    'use strict';
    if (err !== null) {
        console.log(err);
    } else {
        console.log(data);
    }
}

function NavCtrl($scope, $location, PDB) {
    'use strict';
    $scope.nav = {};
    $scope.nav.items = [{
        url: '#/trankListe',
        text: 'Tränke'
    }, {
        url: '#/zutatListe',
        text: 'Zutaten'
    }, {
        url: '#/wirkListe',
        text: 'Wirkungen'
    }];
    $scope.getClasses = function (item) {
        if ($location.url().contains(item.url.substr(1))) {
            return 'active';
        } else {
            return '';
        }
    };
}

function MainCtrl($scope, PDB) {
    'use strict';
}

function TrankListCtrl($scope, PDB, $location) {
  'use strict';
  $scope.traenke = [];
  $scope.newTrankName = '';

  $scope.newTrank = function () {
    $scope.newTrankName = '';
    $('#newTrankModal').modal('show');
  };

  $scope.createTrank = function () {
    if ($scope.newTrankName !== '') {
      var trank = {
        _id: $scope.newTrankName,
        type: 'trank',
        zutaten: []
      };
      $('#trankNameModal').modal('hide');
      PDB.db.put(trank).then(function (data) {
        $scope.$apply(function () {
          $location.path('/trank/' + data.id);
        });
      });
    }
  };

  PDB.db.query('traenke').then(function (data) {
    $scope.$apply(function () {
      $scope.traenke = data.rows;
    });
  });
}

function TrankCtrl($scope, $location, $routeParams, PDB, MDConverter, TrankProto) {
  function Trank(data) {
    if (data)
      for (var i in data)
        if (data.hasOwnProperty(i))
          this[i] = data[i];
  }
  Trank.prototype = TrankProto;

  function setScopeTrank(data) {
    $scope.$apply(function () {
      $scope.trank = new Trank(data);
    });
  }

  function setScopeTrankRev(data) {
    $scope.$apply(function () {
      $scope.trank._rev = data.rev;
    });
  }
    
  $scope.quantities = [];
  $scope.effNames = {
      AP: 'Aktionspunkte',
      TP: 'Trefferpunkte',
      ZP: 'Zauberpunkte',
      MP: 'Manapunkte'
  };
  $scope.newZutat = '';
  $scope.trank = new Trank();
  $scope.alleZutat = [];

  $scope.addZutat = function () {
    if ($scope.newZutat !== '') {
      $scope.trank.zutaten = ($scope.trank.hasOwnProperty('zutaten')) ?
        $scope.trank.zutaten : [];
      $scope.trank.zutaten.push($scope.newZutat);
      $scope.newZutat = '';
      PDB.db.put($scope.trank).then(setScopeTrankRev);
    }
  };

  $scope.deleteZutat = function (zutatId) {
    $scope.trank.zutaten.splice(zutatId, 1);
    PDB.db.put($scope.trank).then(setScopeTrankRev);
  };

  $scope.addRit = function () {
    if ($scope.newRit !== '') {
      $scope.trank.rituale = ($scope.trank.hasOwnProperty('rituale')) ?
        $scope.trank.rituale :
        [];
      $scope.trank.rituale.push($scope.newRit);
      $scope.newRit = '';
      PDB.db.put($scope.trank).then(setScopeTrankRev);
    }
  };

  $scope.deleteRit = function (ritId) {
    $scope.trank.rituale.splice(ritId, 1);
    PDB.db.put($scope.trank, setScopeTrankRev);
  };

  $scope.deleteTrank = function () {
    $('#deleteTrankModal').modal('hide');
    PDB.db.remove($scope.trank).then(function (data) {
      $scope.$apply(function () {
        $location.path('/trankListe');
      });
    });
  };
  $scope.changeNotizen = function () {
    $scope.change = $scope.trank.notizen;
    $('#changeNotizenModal').modal('show');
  };
  $scope.saveNotizen = function () {
    $scope.trank.notizen = $scope.change;
    PDB.db.put($scope.trank).then(setScopeTrankRev);
    $('#changeNotizenModal').modal('hide');
  };
  $scope.changeEffekt = function (eff) {
    $scope.effektToChange = eff;
    $scope.change = $scope.trank.effekte[eff];
    $('#changeEffektModal').modal('show');
  };
  $scope.saveEffekt = function () {
    $scope.trank.effekte[$scope.effektToChange] =
      ($scope.change !== undefined) ?
        $scope.change :
        $scope.trank.effekte[$scope.effektToChange];
    $scope.change = '';
    PDB.db.put($scope.trank).then(setScopeTrankRev);
    $('#changeEffektModal').modal('hide');
  };
    
  $scope.getNotizenHTML = function () {
    return MDConverter.makeHtml($scope.trank.notizen);
  };
    
  PDB.db.get($routeParams.trankId).then(setScopeTrank);
}

function ZutatListCtrl($scope, PDB, WirkTextFilter) {
  function equals(zutat, element) {
    return zutat.key === element.key;
  }
  function loadData() {
    PDB.db.query('zutaten', {
      reduce: false
    }).then(function (data) {
      $scope.$apply(function () {
        $scope.zutaten = data.rows;
      });
    });
  }

  $scope.zutaten = [];
  $scope.selected = {};
  
  $scope.zutat = {
    _id: '',
    type: 'zutat',
    wirkungen: []
  };

  $scope.newZutat = function () {
    $scope.zutat.wirkungen = [];
    $scope.zutat._id = '';
    $scope.wirkungenText = '';
    $('#addZutatModal').modal('show');
  };
  $scope.saveZutat = function () {
    $('#addZutatModal').modal('hide');
    $scope.zutat.wirkungen = WirkTextFilter($scope.wirkungenText);
    PDB.db.put($scope.zutat).then(function (info) {
      console.log(info);
    }).catch(function (err) {
      console.error(err);
    });
  };
  $scope.clearSearchZutat = function () {
    $scope.searchZutat = '';
  };

  loadData();
  PDB.changes.on('change', loadData);
}

function ZutatCtrl($scope, $routeParams, PDB, WirkTextFilter) {
  function loadData() {
    PDB.db.get($routeParams.zutatId).then(function (data) {
      $scope.$apply(function () {
        $scope.zutat = data;
      });
    });
    PDB.db.query('zutatenByTraenke',{
      key: $scope.zutat._id,
      reduce: false
    }).then(function (data) {
      $scope.$apply(function () {
        $scope.traenke = data.rows;
      });
    });
  }

  function saveZutat() {
    if (!$scope.zutat.type) $scope.zutat.type = 'zutat';
    console.log($scope.zutat);
    PDB.db.put($scope.zutat).then(function (info) {
      $scope.zutat._rev = info.rev;
    });
  }


  $scope.zutat = {};
  $scope.zutat._id = $routeParams.zutatId;
  $scope.traenke = [];
  $scope.zutat.wirkungen = [];

  $scope.addWirkung = function () {
    $('#addWirkungModal').modal('show');
  };

  $scope.saveZutat = function () {
    var newWirkungen = WirkTextFilter($scope.wirkungenText);
    $scope.zutat.wirkungen = $scope.zutat.wirkungen.concat(newWirkungen);
    $('#addWirkungModal').modal('hide');
    saveZutat();
  };
  
  $scope.deleteZutat = function () {
    $('#deleteZutatModal').modal('hide');
    PDB.db.remove($scope.zutat).then(function (info) {
      console.log(info);
    }).catch(function (error) {
      console.log(error);
    });
  };
  
  $scope.deleteWirkung = function (wirkIndex) {
    $scope.zutat.wirkungen.splice(wirkIndex, 1);
    saveZutat();
  };

  loadData();
  PDB.changes.on('change', loadData);
}

function WirkListCtrl($scope, PDB, WirkStichworte, $routeParams, $location) {

  // Scope variables:
  // - sections: Array to store the sections
  // - selectSection: function to change the actually section

  function loadData() {
    PDB.db.query('wirkungen', {
      reduce: true,
      group: true
    }).then(function (data) {
      $scope.$apply(function () {
        $scope.wirkungen = data.rows;
      });
    });
  }

  $scope.sections = WirkStichworte;

  $scope.selectSection = function (sec) {
    $scope.selectedSection = $scope.sections[sec];
  };
  $scope.clearSearchWirk = function () {
    $scope.searchWirk = '';
  };

  if ($routeParams.sec) {
    $scope.selectSection($routeParams.sec);
  }

  loadData();
  PDB.changes.on('change', loadData);
}

function WirkCtrl($scope, PDB, $routeParams) {

  // scope variables:
  // - wirkText: String
  // - zutaten: Array to store the ingredients
  // - traenke: Array to store the potions which use affected ingredients

  function getId(item) {
    return item.id;
  }

  function loadTraenke(zutaten) {
    PDB.db.query('zutatenByTraenke', {
      reduce: false,
      keys: zutaten
    }).then(function (data) {
      $scope.$apply(function () {
        var arr = data.rows.map(getId);
        // Delete duplicates in the array
        $scope.traenke = [];
        arr.forEach(function (item) {
          if ($scope.traenke.indexOf(item) === -1) $scope.traenke.push(item);
        });
      });
    });
  }

  function loadData() {
    PDB.db.query('wirkungen', {
      key: $scope.wirkText,
      reduce: false
    }).then(function (data) {
      $scope.$apply(function () {
        $scope.zutaten = data.rows.map(getId);
        loadTraenke($scope.zutaten);
      });
    });
  }

  $scope.wirkText = $routeParams.wirkung;

  loadData();
  PDB.changes.on('change', loadData);
}

function IncludeCtrl($scope) {
  $scope.include = {
    list: 'trankListe.html',
    item: 'trank.html'
  };
}


angular.module('avalon', ['Pouch', 'MDConverter', 'ngRoute', 'ngSanitize']).
  config(function ($routeProvider) {
    'use strict';
    $routeProvider.
      when('/', {controller: MainCtrl, templateUrl: 'main.html'}).
      when('/trankListe', {
        controller: TrankListCtrl,
        templateUrl: 'trankListe.html'
      }).
      when('/trank/:trankId', {
        controller: TrankCtrl,
        templateUrl: 'trank.html'
      }).
      when('/zutatListe', {
        controller: ZutatListCtrl,
        templateUrl: 'zutatenListe.html'
      }).
      when('/zutat/:zutatId', {
        controller: ZutatCtrl,
        templateUrl: 'zutat.html'
      }).
      when('/wirkung/:wirkung', {
        controller: WirkCtrl,
        templateUrl: 'wirkung.html'
      }).
      when('/wirkListe', {
        controller: WirkListCtrl,
        templateUrl: 'wirkListe.html',
        reloadOnSearch: false
      }).
      when('/include', {
        controller: IncludeCtrl,
        templateUrl: 'include.html'
      });
  }).
  value('TrankProto', {
    name: 'TrankProto',
    type: 'trank',
    rituale: [],
    zutaten: [],
    notizen: '',
    effekte: {
      AP: 0,
      MP: 0,
      ZP: 0,
      TP: 0
    }
  }).
  value('WirkTextFilter', function (input) {
    if (input) {
      //unused newlines (lines which do not contain ':')
      var newlines = /\n(?!.*:)/g;
      //unsused multiple blanks or blanks from line start
      var multipleBlanks = / {2,}/g;
      var test = /: .*$/gm;
      arr = input.replace(newlines, " ").replace(multipleBlanks, " ")
        .trim().match(test);
      //arr = str.match(/: .*$/gm);
      if (arr) {
        return arr.map(function (item) {
          if (item.contains("(")) 
            return item.match(/\(.*\)/g)[0].replace(/\(?\)?/g, "");
          else
            return item.substr(2);
        });
      } else {
        return [];
      }
    } else {
      return [];
    }
  }).
  filter('filterBulkWirk', function (WirkTextFilter) {
    return WirkTextFilter;
  }).
  value('WirkStichworte', {
    // first array contains keywords, second array contains excluded words
    Mana: {
      keywords: ['Mana'], 
      exclude: []
    },
    Zauberpunkte: {
      keywords: ['Zauberkraft', 'magisch'], 
      exclude: []
    },
    Trefferpunkte: {
      keywords: ['Kraft', 'Trefferpunkte'],
      exclude:  ['magisch']
    },
    Hunger: {
      keywords: ['Hunger', 'hungrig'],
      exclude: []
    },
    Durst: {
      keywords: ['Durst', 'durstig'],
      exclude: []
    },
    Krankheit: {
      keywords: ['Krankheit', 'giftig', 'krank'],
      exclude: []
    }
  }).
  filter('sectionFilter', function (WirkStichworte) {
    return function (input, section) {
      if (input && section) {
        return input.filter(function (item) {
          // tests if the item contains the given word
          var contains = function (word) {
            return item.key.contains(word);
          };
          return section.keywords.some(contains) &&
            !section.exclude.some(contains);
        }); 
      } else if (input) {
        return input;
      }
    };
  });
