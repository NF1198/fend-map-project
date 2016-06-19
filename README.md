# Neighborhood Map Project

[View site](https://nf1198.github.io/fend-map-project/)

## Udacity Front-End Web Developer Nanodegree

- Date: 2016.06.19

## Project overview

This site was created according to the guidelines for the Udacity Front-End Web
Developer Nanodegree [Neighborhood Map Project](https://review.udacity.com/?_ga=1.78248093.809810548.1463528198#!/rubrics/17/view)

## Developer Notes

1. clone the repository to a local directory
2. `src` contains the development branch (`git push origin master`)
3. `dist` contains the gh-pages branch (`git subtree push --prefix dist origin gh-pages`)

## Testing the site locally

* Open a terminal window to the `src` or `dist` folder and execute:

    python3 -m http.server

## Code structure

This site is a single-page application that displays a map overlayed with points of interest
Several libraries and APIs are used: Knockout.js, Google Maps Javascript API, jQuery, (Wikipedia).

`index.html` is the entry-point for the application
`poi.json` defines points of interest
`main.js` contains most of the application logic and defines the knockout.js ViewModel
`content-provider.js` defines a ContentProvider service which generates dynamic content for infoWindows
`wikipedia-provider.js` defines a provider for the ContentProvider service that queries Wikipedia for content related to POIs.

### ContentProvider

Additional content providers may be added to the application by linking to the appropriate .js file in `index.html`. Reference the wikipedia provider or `TitleProvider` defined within `content-provider.js` for more information. Content providers typically reference the `poi.queryStrings` property of a POI. The content provider will render only if a matching id is found within the `poi.queryStrings` data structure for a given POI.
