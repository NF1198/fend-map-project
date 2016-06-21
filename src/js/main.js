"use strict";

registerDependency(['ko', '$', 'google', 'map', 'Marker'], function() {

    console.log("loading main");

    var CIRCLE = "M 0 -40 A 16 16 0 0 0 -16 -24 A 16 16 0 0 0 -4.8398438 -8.7558594 C -2.9451666 -4.6084785 -1.7424308 -1.1396568 0 0 C 1.7448585 -1.1412448 2.9483297 -4.618317 4.8476562 -8.7734375 A 16 16 0 0 0 16 -24 A 16 16 0 0 0 0 -40 z ";

    var app = (function(ko, google, map) {

        var $navTrigger = document.getElementById('nav-trigger');
        var $map = document.getElementById('map');

        // Ensure search panel open-by-default on desktop
        if (window.matchMedia("(min-width: 630px)").matches) {
            $navTrigger.checked = true;
        }

        /**
         * @description Check if string beings with startsWith
         * @param {string} string
         * @param {string} startsWith
         * @returns {boolean} true if string begins with startsWith
         */
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

        /**
         * @description This function adds a ko.observable property to the POI
         *              to hold third party content
         * @param {object} poi
         * @returns {object} poi with thirdParty content property added
         */
        function setupPoi3rdPartyContentContainer(poi) {
            var thirdPartyContent = poi.thirdPartyContent;
            if (!thirdPartyContent) {
                thirdPartyContent = ko.observable({});
                poi.thirdPartyContent = thirdPartyContent;
            }
            return poi;
        }

        /**
         * @description Returns an InfoWindow for the specified POI, creating
         *              one if necessary
         * @param {object} poi
         * @returns {google.maps.InfoWindow} an infoWindow for the poi
         */
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

        /**
         * @description Returns a Mapmarker for the specified POI, creating one if necessary
         * @param {object} poi
         * @returns {google.maps.Marker} an Marker for the poi
         */
        function getMapMarkerFor(poi) {
            var id = poi.id;
            var marker;

            function clickListenerFor(poi, marker) {
                return function() {
                    animateMarker(poi.id);
                    getInfoWindowFor(poi).open(map, marker);
                };
            }

            if (id) {
                marker = mapMarkers[id];
                if (!marker) {
                    var myLatlng = new google.maps.LatLng(poi.loc.lat, poi.loc.lng);

                    /* uses map-icons library map-icons.com (MIT License) */
                    if (poi.icon && poi.icon.icon && poi.icon.style) {
                        var icon = poi.icon.icon;
                        var iconStyle = poi.icon.style;
                        icon.path = eval(icon.path);
                        marker = new Marker({
                            position: myLatlng,
                            title: poi.title,
                            icon: icon,
                            map_icon_label: `<span class="map-icon ${iconStyle}"></span>`,
                            map: map,
                            visible: true,
                        });
                    } else {
                        marker = new google.maps.Marker({
                            position: myLatlng,
                            title: poi.title,
                            map: map,
                            visible: true,
                        });
                    }


                    marker.id = id;
                    marker.addListener('click', clickListenerFor(poi, marker));
                    mapMarkers[id] = marker;
                }
            }
            return marker;
        }

        /**
         * @description Animates the mapmarker specified by id
         * @param {string} id (of poi)
         */
        function animateMarker(id) {
            function stopMarkerAnim(marker) {
                return function() {
                    marker.setAnimation(null);
                };
            }
            for (var markerId in mapMarkers) {
                var currentlyAnimated = (markerId === id) ? mapMarkers[markerId].getAnimation() : null;
                var anim = (markerId === id && !currentlyAnimated) ? google.maps.Animation.BOUNCE : null;
                mapMarkers[markerId].setAnimation(anim);
                if (anim) {
                    var marker = mapMarkers[markerId];
                    setTimeout(stopMarkerAnim(marker), 5000);
                }
            }
        }

        /**
         * @description Centers the map to the specified location (loc)
         * @param {{lat:float, lon:float}} loc
         */
        function centerMap(loc) {
            var latlng = new google.maps.LatLng(loc.lat, loc.lng);
            map.panTo(latlng);
            map.setZoom(14);
        }

        /**
         * @description Enable all POIs in the poiList, otherwise disable
         *              note: this function references the "map" variable, passed to the module
         * @param {object[]} poiList
         */
        function enablePOIs(poiList) {
            var enabledMarkers = {};
            for (var m in mapMarkers) {
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

        /**
         * @description Zooms to bounds of specified poi list
         * @param {object[]} poiList
         */
        function zoomToBounds(poiList) {
            function getBounds(poiList) {
                var sw = {
                    lat: 75,
                    lng: 0
                };
                var ne = {
                    lat: -75,
                    lng: -180
                };
                for (var idx = 0; idx < poiList.length; idx++) {
                    var poi = poiList[idx];
                    if (!poi.loc) {
                        return null;
                    }
                    sw.lat = Math.min(poi.loc.lat, sw.lat);
                    sw.lng = Math.min(poi.loc.lng, sw.lng);
                    ne.lat = Math.max(poi.loc.lat, ne.lat);
                    ne.lng = Math.max(poi.loc.lng, ne.lng);
                }
                var zoomFactor = 0.0005;
                sw.lat *= (1 - zoomFactor);
                sw.lng *= (1 + zoomFactor);
                ne.lat *= (1 + zoomFactor);
                ne.lng *= (1 - zoomFactor);
                return new google.maps.LatLngBounds(sw, ne);
            }
            var bounds = getBounds(poiList);
            if (bounds) {
                map.fitBounds(bounds);
                //map.panTo(getBounds(poiList).getCenter());
            }

        }

        /**
         * @description Main ViewModel (knockout.js) for the application
         * @constructor
         */
        function MapAppViewModel() {
            var self = this;
            self.poiList = ko.observableArray();
            self.filterQuery = ko.observable(localStorage.getItem("filterQuery") || "");
            self.activeId = ko.observable();

            self.filterQuery.subscribe(function(newValue) {
                localStorage.setItem("filterQuery", newValue);
            });

            //filter the items using the filter text
            self.filteredPOIlist = ko.computed(function() {

                var filter = self.filterQuery().toLowerCase();
                if (!filter) {
                    return self.poiList();
                } else {
                    var result = ko.utils.arrayFilter(self.poiList(), function(item) {
                        var keywords = item.keywords || [];
                        var match = stringStartsWith(item.title.toLowerCase(), filter);
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
                rateLimit: 350,
            });

            // Subscribe to changes on the filteredPOIlist to ensure
            // all filtered POIs are enabled on the map.
            self.filteredPOIlist.subscribe(function(newValue) {
                enablePOIs(newValue);
                zoomToBounds(newValue);
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

});
