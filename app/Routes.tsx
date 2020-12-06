/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import routes from './constants/routes.json';
import App from './containers/App';
import HomePage from './containers/HomePage';

// Lazily load routes and code split with webpack
const LazySnapshotPage = React.lazy(() =>
  import(/* webpackChunkName: "SnapshotPage" */ './containers/SnapshotPage')
);

const SnapshotPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazySnapshotPage {...props} />
  </React.Suspense>
);

export default function Routes() {
  return (
    <App>
      <Switch>
        <Route path={routes.SNAPSHOT} component={SnapshotPage} />
        <Route path={routes.HOME} component={HomePage} />
      </Switch>
    </App>
  );
}
