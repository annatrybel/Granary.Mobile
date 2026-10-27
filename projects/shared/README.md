# `@granary/shared`

Shared Angular services, API models, interceptors, pipes, and UI components used
by `admin-app` and `user-app`.

The applications consume the library directly from source through the
`@granary/shared` path mapping in `tsconfig.json`, so it does not have to be
built before `ng serve`, `ng build` or `ng test`. `npm run build:shared` only
verifies that the library compiles as a package.

Only code needed by **both** applications belongs here. Code used by a single
app (for example `CatalogSearchBarComponent`) lives in that app.
