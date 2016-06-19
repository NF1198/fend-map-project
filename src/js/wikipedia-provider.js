(function(global, $) {

    function truncate(string, len) {
        if (string.length > len)
            return string.substring(0, len) + '...';
        else
            return string;
    };

    var ContentProviderProto = Object.getPrototypeOf(global.ContentProvider);

    function WikipediaProvider() {
        ContentProviderProto.constructor.call(this);
    };

    WikipediaProvider.prototype = Object.create(ContentProviderProto);
    WikipediaProvider.prototype.constructor = WikipediaProvider;
    WikipediaProvider.prototype.ContentID = "Wikipedia";

    WikipediaProvider.prototype.fetch = function(poi) {
        // initialize content for proper binding...
        var content = poi.thirdPartyContent();
        content[WikipediaProvider.prototype.ContentID] = {
            type: ContentProviderProto.contentType.EMPTY,
            value: "Loading content..."
        };
        poi.thirdPartyContent(content);

        // prepare the query for insertion in the URL
        var contentQuery = encodeURIComponent(poi.queryStrings[WikipediaProvider.prototype.ContentID]);
        var queryURL = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${contentQuery}&callback=?`;
        var linkURL = `https://en.wikipedia.org/wiki/${contentQuery}`;

        // Submit ajax request to server and update content accordingly
        // Encoding URL directly to avoid CORS issues
        $.ajax({
            type: 'GET',
            url: queryURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(data, textStatus, jqXHR) {
                var extract = "...";
                for (pageId in data.query.pages) {
                    var page = data.query.pages[pageId];
                    var extract = page.extract;
                    break;
                }
                extract = truncate(extract, 350);
                var content = poi.thirdPartyContent();
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

        return '<span>loading content...<span>';
    };

    ContentProviderProto.registerProvider(WikipediaProvider.prototype.ContentID, new WikipediaProvider());

})(this, jQuery);
