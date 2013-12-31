var myApp = angular.module('myApp', []);

//myApp.directive('myDirective', function() {});
//myApp.factory('myService', function() {});

function MyCtrl($scope, $http) {
    $scope.name = "Chris";
    $scope.results = [
        {"seq":0,"id":"fresh","changes":[{"rev":"1-967a00dff5e02add41819138abb3284d"}]}
    ];
    $scope.data = {};
    $scope.listening = "YES";
    $scope.source = {};
    $scope.info = {
        title: null,
        message: null
    };
    
    // CouchDB _changes feed - CORS must be enabled
    // http://docs.couchdb.org/en/latest/config/http.html#cors
    $scope.eventSourceUrl = "http://127.0.0.1:5984/" +
                            "olympicathletes/_changes" +
                            "?feed=eventsource&since=now" + 
                            "&filter=medals/by_year&year=2012" +
                            "";
    $scope.dataSourceUrl = "http://127.0.0.1:5984/" +
                            "olympicathletes/" +
                            "_design/medals/" + 
                            "_view/total?group_level=1";
    
    var sourceOnError = function(e) {
        $scope.$apply(function() {
            $scope.info = {
                title: "Unable to connect.",
                message: "Ensure that CouchDB is installed locally and that CORS has been enabled (http://wiki.apache.org/couchdb/CORS).\nCheck console for errors."
            };
        });

        console.log('sourceOnError', e);
    }
    var sourceOnOpen = function(e) {
        console.log('sourceOnOpen', e);
        
        $scope.$apply(function() {
            $scope.info = {
                title: "Connected.",
                message: $scope.eventSourceUrl
            };
            $scope.results = [{"seq":"0", "id":"eventstreamopen"}];
        });
    }
    
    var sourceOnMessage = function (e) {
        //console.log('sourceOnMessage', e.data, e);
        var res = JSON.parse(e.data);
        $scope.$apply(function() {
            $scope.results.push(res);
        });
        getLatestData();
    };
    
    var getLatestData = function() {
        if (!!$scope.dataRequest) return; // throttle.
        
        $scope.dataStatus = '---';
        $scope.dataRequest = $http(
            {method: 'GET', url: $scope.dataSourceUrl})
            .success(function(data, status, headers, config) { 
                $scope.dataRequest = null;
                $scope.dataStatus = status;
                $scope.dataObj = data; 
            });
    };
    getLatestData();
    
    // define the event handling function
    if (window.EventSource) {
        $scope.$watch('listening', function (val) {
            console.log('listening in', val, $scope.source);
            switch (val) {
                case "YES":
                    
                    $scope.source = window.evtsrc = new EventSource($scope.eventSourceUrl);

                    // start listening for events
                    $scope.source.onerror = sourceOnError;
                    //$scope.source.onmessage = sourceOnMessage;
                    $scope.source.onopen = sourceOnOpen;
                    $scope.source.addEventListener('message', sourceOnMessage, false);
                    break;
                    //debugger;
                case "NO":
                    // stop listening for events
                    $scope.source.close();
                    $scope.source.removeEventListener('message', sourceOnMessage, false);
                    break;
            }
            
            console.log('listening out', val, $scope.source);
        });
    }

}