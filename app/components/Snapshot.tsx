import { Link } from 'react-router-dom';
import React from 'react';
import routes from '../constants/routes.json';

export default function Snapshot(): JSX.Element {
  document.addEventListener('keydown', (e: any) => {
    switch (e.key) {
      default:
        break;
      case 'Escape':
        console.log('get esc pressed');
        window.close();
        break;
    }
  });
  return (
    <div>
      <h1>snapshot</h1>
      <Link to={routes.HOME}>HOME</Link>
    </div>
  );
}
