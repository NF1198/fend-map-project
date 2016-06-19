(function(global) {

    function ContentProvider() {

        // Fetch 3rd party content for the specified POI (if needed)
        // Content is stored in the poi.thirdPartyContent field, which is a ko.observable().
        // the content data is stored in the following object format:
        //  thirdPartyContent:
        //  {
        //    `contentProviderID`: {
        //         type: <EMPTY, ERRROR, DATA>, (see constant definition below)
        //         value: "" (a string with content, or empty)
        //    }
        //    `otherContentProviderID` : {...}
        //    `otherContentProviderID` : {...}
        //  }
        // return value is an object with keys matching providerId and values
        //        equal to the known (or initial) content for the provider
        this.fetchContentFor = function(poi) {
            var content = {};
            var poiContent = poi.thirdPartyContent();

            var implList = ContentProvider.prototype.implList;
            for (var i = 0; i < implList.length; i++) {
                var providerDef = implList[i];
                var providerId = providerDef.id;
                var provider = providerDef.provider;

                // check if poiContent needs updating
                var providerContent = poiContent[providerId];
                var poiMatchingQuery = poi.queryStrings[providerId];
                // only query if poi has a query string matching the providerID
                if (poiMatchingQuery) {
                    var needsUpdate = (!providerContent || providerContent.type === ContentProvider.prototype.contentType.EMPTY);
                    var innerContent;
                    if (needsUpdate) {
                        innerContent = provider.fetch(poi);
                    } else {
                        innerContent = providerContent.value;
                    }
                    content[providerId] = innerContent;
                }
            }
            return content;
        }

        // Fetch DOM element that represents the third party content for the specified
        // POI. The HTML may include ko bindings.
        this.fetchNodeContentFor = function(poi) {
            var queryResult = this.fetchContentFor(poi);
            var poiID = poi.id;
            var result = "";
            result += `<!-- ko with: getPOIbyID('${poiID}') -->`;
            result += `<!-- ko with: thirdPartyContent -->`;
            for (id in queryResult) {
                var poiMatchingQuery = poi.queryStrings[id];
                // only add an HTML element for the provider result if the POI
                // has a matching query string
                if (poiMatchingQuery) {
                    var queryContent = queryResult[id];
                    result += `<h3 class='info-heading'>${id}</h3>
<div class='info-content' data-bind="html: ${id}.value">${queryContent}</div>`;
                }
            }
            result += "<!-- /ko -->";
            result += "<!-- /ko --><!-- /ko -->";
            var node = document.createElement('DIV');
            node.innerHTML = result;
            return node;
        }
    }

    ContentProvider.prototype.contentType = {};
    ContentProvider.prototype.contentType.EMPTY = "EMPTY";
    ContentProvider.prototype.contentType.ERROR = "ERROR";
    ContentProvider.prototype.contentType.DATA = "DATA";

    // This is the magic function. Provider implementations should
    // return default content for the poi and update the thirdPartyContent
    // field with appropriate content. Updates may be done asynchronously
    // via an ajax request.
    // poi is the POI data structure
    // return value is a string with initial content
    ContentProvider.prototype.fetch = function(poi) {
        return ""
    };

    // This static field stores a list of content provider implementations
    // Data format is an array of:
    // {id: <string>, i}
    ContentProvider.prototype.implList = [];

    // This static method registers a content provider implementation
    // id: <string> representing the display name of the provider (will be used in the UI)
    // provider: <object> instance of the provider implementation (must extend ContentProvider)
    ContentProvider.prototype.registerProvider = function(id, provider) {
        if (provider && (provider instanceof ContentProvider)) {
            ContentProvider.prototype.implList.push({
                id: id,
                provider: provider
            });
        } else {
            throw ("Critical Error: Invalid class encountered when registering ContentProvider implementation!");
        }
    };

    // Create a default provider that shows the POI title
    var TitleProvider = function() {
        ContentProvider.call(this);
    };

    TitleProvider.prototype = Object.create(ContentProvider.prototype);
    TitleProvider.prototype.constructor = TitleProvider;
    TitleProvider.prototype.ContentID = "Place";
    TitleProvider.prototype.fetch = function(poi) {

        var link = poi.queryStrings["Link"];
        var place = poi.queryStrings["Place"];

        // if the POI has a link defined, use the link, otherwise use the title
        var result = (link) ? `<a href="${link}">${place}</a>` : `<span>${poi.title}</span>`;

        var content = poi.thirdPartyContent();
        content[TitleProvider.prototype.ContentID] = {
            type: ContentProvider.prototype.contentType.DATA,
            value: result
        };
        poi.thirdPartyContent(content);
        return result;
    }

    // Register the TitleProvider content provider
    ContentProvider.prototype.registerProvider(TitleProvider.prototype.ContentID, new TitleProvider());

    // Export the ContentProvider to the global namespace
    global.ContentProvider = new ContentProvider();

})(this);
