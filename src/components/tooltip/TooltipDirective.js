(function() {
  goog.provide('ga_tooltip_directive');

  goog.require('ga_popup_service');
  goog.require('ga_urlutils_service');

  var module = angular.module('ga_tooltip_directive', [
    'ga_urlutils_service',
    'ga_popup_service',
    'pascalprecht.translate'
  ]);

  module.directive('gaTooltip',
      ['$http', '$q', '$translate', 'gaUrlUtils', 'gaPopup',
        function($http, $q, $translate, gaUrlUtils, gaPopup) {
          var currentTopic, popup;
          return {
            restrict: 'A',
            scope: {
              map: '=gaTooltipMap',
              options: '=gaTooltipOptions'
            },
            link: function($scope, element, attrs) {

              $scope.map.on('click', function(evt) {
                var size = $scope.map.getSize();
                var extent = $scope.map.getView().calculateExtent(size);

                $scope.$apply(function() {
                  handleMapClick($scope,
                                 evt.getPixel(),
                                 evt.getCoordinate(),
                                 size,
                                 extent);
                });
              });

              $scope.$on('gaTopicChange', function(event, topic) {
                currentTopic = topic.id;
              });
            }
          };

          function handleMapClick(scope, pixel, coordinate, size, extent) {
            var identifyUrl = scope.options.getIdentifyUrl(currentTopic);
            //look for all features under clicked pixel
            $http.jsonp(identifyUrl, {
              params: {
                'geometryType': 'esriGeometryPoint',
                'geometry': coordinate[0] + ',' + coordinate[1],
                //FIXME: make sure we are passing the right dpi here. Can we?
                'imageDisplay': size[0] + ',' + size[1] + ',96',
                'mapExtent': extent[0] + ',' + extent[2] +
                             ',' + extent[1] + ',' + extent[3],
                'tolerance': scope.options.tolerance,
                //FIXME: layers should come from the map
                'layers': 'all',
                'callback': 'JSON_CALLBACK'
              }
            }).success(function(features) {
              getInformation(scope, pixel, features.results);
            });

            if (popup) {
              popup.close();
            }
          }

          function getInformation(scope, pixel, foundFeatures) {
            if (foundFeatures && foundFeatures.length > 0) {
              var promises = [];
              angular.forEach(foundFeatures, function(value) {
                var htmlUrl = scope.options.getHtmlUrl(currentTopic) +
                              value.layerBodId + '/' +
                              value.featureId + '/htmlpopup?';
                promises.push($http.jsonp(htmlUrl, {
                  params: {
                    'lang': $translate.uses(),
                    'callback': 'JSON_CALLBACK'

                  }
                }));
              });
              //FIXME: this is not robust, as a single failure
              //to get a feature will not display anything, even
              //those who could get retrieved...but it's good
              //for now
              $q.all(promises).then(function(htmlSnippets) {
                showInformation(scope, pixel, htmlSnippets);
              });
            }
          }

          function showInformation(scope, pixel, htmlSnippets) {
            var content = '<div class="tooltip-container">';
            angular.forEach(htmlSnippets, function(snippet) {
              content = content + '<div class="tooltip-element">' +
                        snippet.data + '</div>';
            });
            content = content + '</div>';
            if (popup) {
              popup.close();
            }
            popup = gaPopup.create({
              title: 'object_information',
              content: content,
              x: pixel[0],
              y: pixel[1]
            });
            popup.open(scope);
          }

        }]);
})();
