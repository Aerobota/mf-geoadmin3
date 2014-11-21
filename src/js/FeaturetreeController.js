(function() {
  goog.provide('ga_featuretree_controller');
  
  goog.require('ga_print_service');
  
  var module = angular.module('ga_featuretree_controller',[
    'ga_print_service'
  ]);

  module.controller('GaFeaturetreeController', function($http, $scope,
      $timeout, $translate, gaGlobalOptions, gaPrintService) {
    $scope.options = {
      msUrl: gaGlobalOptions.cachedApiUrl + '/rest/services/all/MapServer',
      features: [], // List of features
      featuresShown: false
    };
    
    // Collapse/Expand the features tree accordion when results change 
    $scope.$watch('options.features.length', function() {
      $scope.options.featuresShown = ($scope.options.features.length > 0);
    });

    $scope.printInProgress = false;
    $scope.printProgressPercentage = 0;
    var featureTree;
    var  useException = false;   
    var exceptions = {
      'ch.bazl.luftfahrthindernis': 'htmlPopup' //extendedHtmlPopup
    };
    $scope.print = function() {
      var printElementsTotal = $scope.options.features.length;
      if (printElementsTotal == 0) {
        return;
      }
      var lang = $translate.use();
      var printElementsLoaded = 0;
      var printLayers = [];
      printLayers['failure'] = {
        head: null,
        body: ''
      };
      $scope.printInProgress = true;
      $scope.printProgressPercentage = 0;

      var printElementLoaded = function(html, bodId) {
        if (/(<html|<head|<body)/i.test(html)) { // extendedHtmlPopup
          var head = /<head[^>]*>((.|[\n\r])*)<\/head>/.exec(html)[1];
          var body = /<body[^>]*>((.|[\n\r])*)<\/body>/.exec(html)[1];
          printLayers[bodId].head = head;
          printLayers[bodId].body += body;
        } else { // htmlPopup 
          printLayers[bodId].body += html;
        }
        printElementsLoaded++;
        $scope.printProgressPercentage = Math.round(printElementsLoaded /
            printElementsTotal * 100);
        if (printElementsTotal == printElementsLoaded && $scope.printInProgress) {
          printFinished(printLayers);
        }
      };
      
      for (var bodId in featureTree) {
        printLayers[bodId] = {
          head: null,
          body: ''
        };
        if (!useException) {
          useException = false; //!!(exceptions[bodId]);
        }
        var layer = featureTree[bodId];
        var layerUrl = $scope.options.msUrl + '/' + bodId;
        for (var i in layer.features) {
          $http.get(layerUrl + '/' + layer.features[i].id + '/' +
              (exceptions[bodId] || 'htmlPopup'), {
            lang: lang
          }).success(function(data, status, headers, config) {
            printElementLoaded(data, bodId);
          }).error(function(data, status, headers, config) {
            printElementLoaded("<div>There was a problem loading this feature. Layer: " +
                bodId + ", feature: " + layer.features[i].id +
                ", status: " + status + "<div>", "failure");
          });
        }
      }
    };
    
    var printFinished = function(printLayers) {
      $scope.printInProgress = false;
      $scope.printProgressPercentage = 0;
      var head = '';
      var body = '';
      for (var bodId in printLayers) {
        if (printLayers[bodId].head) {
          head += printLayers[bodId].head;
        }
        body += printLayers[bodId].body;
      }

      var options;
      if (useException) {
        options = 'menubar=yes,toolbar=yes,titlebar=yes,status=yes,scrollbars=yes,' +
            'resizable=yes,width=600,height=850';
      }
      gaPrintService.htmlPrintout(body, head || undefined, undefined, options);
    };
    
    var ftPopup = $('#featuretree-popup');
    $scope.$on('gaUpdateFeatureTree', function(evt, tree) {
      featureTree = tree;

      // Open popup when it's reduced
      if ($scope.globals.isFeatureTreeActive  &&
         ftPopup.hasClass('ga-popup-reduced')) {
        $scope.globals.isFeatureTreeActive = false;
      }

      evt.stopPropagation();
    });
  });
})();
