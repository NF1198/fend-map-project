(function(global, $) {
    console.log("begin: wikipedia-provider.js");

    var remoteUrlWithOrigin = "https://en.wikipedia.org/w/api.php";
    var remoteUrlWithOrigin = "https://en.wikipedia.org/w/api.php";
    // ?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=Albuquerque%2C_New_Mexico"

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

        // Submit ajax request to server and update content accordingly
        $.ajax({
            dataType: 'json',
            url: remoteUrlWithOrigin,
            xhrFields: {
                withCredentials: true
            },
            data: {
                'format': 'json',
                'action': 'query',
                'prop': 'extracts',
                'exintro': '',
                'explaintext': '',
                'titles': poi.queryStrings[WikipediaProvider.prototype.ContentID]
            },
            type: 'GET',
            headers: {
                'Origin': 'http://nf1198.github.io',
                'Api-User-Agent': 'ExploreAlbuquerque/1.0 (nickfolse@gmail.com)'
            },
            success: function(data) {

                var extract = "...";
                var response = $.parseJSON(data);
                for (pageId in response.query.pages) {
                  var page = response.query.pages[pageId];
                  var extract = page.extract;
                  break;
                }

                var content = poi.thirdPartyContent();
                content[WikipediaProvider.prototype.ContentID] = {
                    type: ContentProviderProto.contentType.DATA,
                    value: extract
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

    console.log("end: wikipedia-provider.js");

})(this, jQuery);
