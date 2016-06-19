var app = (function(ko, google, map) {

    var $navTrigger = document.getElementById('nav-trigger');
    var $map = document.getElementById('map');

    // Ensure search panel open-by-default on desktop
    if (window.matchMedia("(min-width: 630px)").matches) {
        $navTrigger.checked = true;
    }

    // Utility function
    function stringStartsWith(string, startsWith) {
        string = string || "";
        if (startsWith.length > string.length)
            return false;
        var result = string.substring(0, startsWith.length) === startsWith;
        return result;
    }

    // Google Maps Related Functions

    // Extra data structure to hold map markers
    var mapMarkers = {};
    var infoWindows = {};

    // This function addd a ko.observable property to the POI
    // to hold third party content
    function setupPoi3rdPartyContentContainer(poi) {
        var thirdPartyContent = poi.thirdPartyContent;
        if (!thirdPartyContent) {
            thirdPartyContent = ko.observable({});
            poi.thirdPartyContent = thirdPartyContent;
        }
        return poi;
    }

    // Returns an InfoWindow for the specified POI, creating one if necessary
    function getInfoWindowFor(poi) {
        if (!poi) {
            return;
        }
        setupPoi3rdPartyContentContainer(poi);
        var id = poi.id;
        var infoWindow;
        if (id) {
            infoWindow = infoWindows[id];
            if (!infoWindow) {
                var node = ContentProvider.fetchNodeContentFor(poi);
                node.isBound = false;
                infoWindow = new google.maps.InfoWindow({
                    content: node
                });
                infoWindow.addListener('domready', function() {
                    if (!node.isBound) {
                        try {
                            ko.applyBindings(appViewModel, node);
                        } catch (err) {
                            console.error(err);
                        }
                        node.isBound = true;
                    }
                });
                infoWindows[id] = infoWindow;
            }
        }
        return infoWindow;
    }

    // Returns a Mapmarker for the specified POI, creating one if necessary
    function getMapMarkerFor(poi) {
        var id = poi.id;
        var marker;

        function clickListenerFor(poi, marker) {
            return function() {
                getInfoWindowFor(poi).open(map, marker);
            };
        }

        if (id) {
            marker = mapMarkers[id];
            if (!marker) {
                var myLatlng = new google.maps.LatLng(poi.loc.lat, poi.loc.lon);
                marker = new google.maps.Marker({
                    position: myLatlng,
                    title: poi.title,
                    map: map,
                    visible: true,
                });
                marker.id = id;
                marker.addListener('click', clickListenerFor(poi, marker));
                mapMarkers[id] = marker;
            }
        }
        return marker;
    }

    // Animates the mapmarker specified by id
    function animateMarker(id) {
        function stopMarkerAnim(marker) {
            return function() {
                marker.setAnimation(null);
            };
        }
        for (markerId in mapMarkers) {
            var currentlyAnimated = (markerId === id) ? mapMarkers[markerId].getAnimation() : null;
            var anim = (markerId === id && !currentlyAnimated) ? google.maps.Animation.BOUNCE : null;
            mapMarkers[markerId].setAnimation(anim);
            if (anim) {
                var marker = mapMarkers[markerId];
                setTimeout(stopMarkerAnim(marker), 5000);
            }
        }
    }

    // Centers the map to the specified location (loc)
    function centerMap(loc) {
        var latlng = new google.maps.LatLng(loc.lat, loc.lon);
        map.panTo(latlng);
    }

    // enable all POIs in the poiList, otherwise disable
    // note: this function references the "map" variable, passed to the module
    function enablePOIs(poiList) {
        var enabledMarkers = {};
        for (m in mapMarkers) {
            if (mapMarkers[m].visible) {
                enabledMarkers[m] = mapMarkers[m];
            }
        }
        for (var i = 0; i < poiList.length; i++) {
            var poi = poiList[i];
            if (poi.id !== "no-results") {
                var marker = getMapMarkerFor(poi);
                marker.setVisible(true);

                // remove this element from enabledMarkers list
                delete enabledMarkers[poi.id];
            }
        }
        //disable any remaining markers
        for (m in enabledMarkers) {
            enabledMarkers[m].setVisible(false);
        }
    }

    // This is the main view model (knockout.js) for the application
    function MapAppViewModel() {
        var self = this;
        self.poiList = ko.observableArray();
        self.filterQuery = ko.observable("");
        self.activeId = ko.observable();

        //filter the items using the filter text
        self.filteredPOIlist = ko.computed(function() {

            var filter = self.filterQuery().toLowerCase();
            if (!filter) {
                return self.poiList();
            } else {
                var result = ko.utils.arrayFilter(self.poiList(), function(item) {
                    var keywords = item.keywords || [];
                    var match = false;
                    for (var j = 0; j < keywords.length && !match; j++) {
                        var kw = keywords[j].toLowerCase();
                        match |= stringStartsWith(kw, filter);
                    }
                    return match;
                });
                if (result.length === 0) {
                    result.push({
                        id: "no-results",
                        title: "No results",
                        description: "Try some of these:",
                        keywords: ["science", "art", "unm", "nob hill", "transportation"]
                    })
                }
                return result;
            }
        }, self);

        self.getPOIbyID = function(id) {
            var result = ko.utils.arrayFilter(self.poiList(), function(item) {
                return item.id === id;
            });
            return result[0];
        };

        // load JSON data asynchronously
        $.getJSON("poi.json", function(json) {
            self.poiList(json);
        });

        self.openNavArea = function() {
            // force the nav-area open when the filter is called
            $navTrigger.checked = true;
        }

        // limit filtered updates to <N> ms
        self.filteredPOIlist.extend({
            rateLimit: 250,
        });

        // Subscribe to changes on the filteredPOIlist to ensure
        // all filtered POIs are enabled on the map.
        self.filteredPOIlist.subscribe(function(newValue) {
            enablePOIs(newValue);
        });

        // used as a click handler
        self.selectMapMarker = function(poi) {
            if (poi.id === "no-results") {
                return;
            }
            var newSelection = (poi.id !== self.activeId()) ? poi : null;
            var newSelectionID = (newSelection) ? newSelection.id : null;
            var oldActiveId = self.activeId();
            var oldActivePOI = self.getPOIbyID(oldActiveId);
            self.activeId(newSelectionID);
            animateMarker(newSelectionID);
            if (newSelection) {
                centerMap(poi.loc);
                var marker = getMapMarkerFor(poi);
                var oldActiveInfoWindow = getInfoWindowFor(oldActivePOI);
                if (oldActiveInfoWindow) {
                  oldActiveInfoWindow.close();
                }
                getInfoWindowFor(poi).open(map, marker);
            }
            if (!window.matchMedia("(min-width: 630px)").matches) {
                $navTrigger.checked = false;
            }
        };

        // used to determine if the specified poi is selected
        self.isSelected = function(poi) {
            return poi.id === self.activeId();
        };

        // enable all POIs upon loading
        enablePOIs(self.filteredPOIlist());

    }

    var appViewModel = new MapAppViewModel();
    ko.applyBindings(appViewModel);

})(ko, google, map);
