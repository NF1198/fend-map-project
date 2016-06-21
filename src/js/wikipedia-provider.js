"use strict";

registerDependency(['$', 'ContentProvider'], function() {

    console.log("loading wikipedia-provider");

    (function(global, $, ContentProvider) {

        function truncate(string, len) {
            if (string.length > len)
                return string.substring(0, len) + '...';
            else
                return string;
        };

        var ContentProviderProto = Object.getPrototypeOf(ContentProvider);

        /**
         * @description An implementation of ContentProvider which renders
                        Wikipedia content into the infoWindow
         * @constructor
         */
        function WikipediaProvider() {
            ContentProviderProto.constructor.call(this);
        };

        WikipediaProvider.prototype = Object.create(ContentProviderProto);
        WikipediaProvider.prototype.constructor = WikipediaProvider;
        WikipediaProvider.prototype.ContentID = "Wikipedia";

        WikipediaProvider.prototype.fetch = function(poi) {

            var now = new Date();
            var contentValue = "Loading content...";
            var hasStorage = typeof(Storage) !== "undefined";
            var needsUpdate = hasStorage;

            // prepare the query for insertion in the URL
            var contentQuery = encodeURIComponent(poi.queryStrings[WikipediaProvider.prototype.ContentID]);
            var queryURL = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${contentQuery}&callback=?`;
            var linkURL = `https://en.wikipedia.org/wiki/${contentQuery}`;

            var storageKey = WikipediaProvider.prototype.ContentID + "-" + poi.id;

            if (hasStorage) {
                var cachedData = {
                    expiry: Date.parse(localStorage.getItem(storageKey + "_expiry")),
                    data: localStorage.getItem(storageKey + "_data")
                }
                if (cachedData.data && cachedData.expiry && cachedData.expiry > now.getTime()) {
                    contentValue = `<p>${cachedData.data} <a href="${linkURL}" target="_blank">read more...</a></p>`;
                    needsUpdate = false;
                    console.log("Used local storage (" + storageKey + ")");
                }
            }

            // initialize content for proper binding...
            var content = poi.thirdPartyContent();
            content[WikipediaProvider.prototype.ContentID] = {
                type: needsUpdate ? ContentProviderProto.contentType.EMPTY : ContentProviderProto.contentType.DATA,
                value: contentValue
            };
            poi.thirdPartyContent(content);

            if (needsUpdate) {

                // Submit ajax request to server and update content accordingly
                // Encoding URL directly to avoid CORS issues
                $.ajax({
                    type: 'GET',
                    url: queryURL,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function(data, textStatus, jqXHR) {
                        console.log("Queried wikipedia for data (" + contentQuery + ")");
                        var extract = "...";
                        for (var pageId in data.query.pages) {
                            var page = data.query.pages[pageId];
                            var extract = page.extract;
                            break;
                        }
                        extract = truncate(extract, 350);
                        var content = poi.thirdPartyContent();

                        //update local storage
                        if (hasStorage) {
                            var expiry = new Date();
                            expiry.setDate(now.getDate() + 1);
                            localStorage.setItem(storageKey + "_expiry", expiry);
                            localStorage.setItem(storageKey + "_data", extract);
                        }

                        content[WikipediaProvider.prototype.ContentID] = {
                            type: ContentProviderProto.contentType.DATA,
                            value: `<p>${extract} <a href="${linkURL}" target="_blank">read more...</a></p>`
                        };
                        poi.thirdPartyContent(content);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.error(errorThrown);
                        var content = poi.thirdPartyContent();
                        content[WikipediaProvider.prototype.ContentID] = {
                            type: ContentProviderProto.contentType.ERROR,
                            value: "Loading content failed with " + textStatus
                        };
                        poi.thirdPartyContent(content);
                    }
                });
            }
            return `<span>${contentValue}<span>`;
        };

        ContentProviderProto.registerProvider(WikipediaProvider.prototype.ContentID, new WikipediaProvider());

    })(this, jQuery, ContentProvider);

});
